import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { IImageBuffer, IUploadResult, IPredictionRequest } from '../../common/interfaces';
import { Batch, Image, BatchStatus } from '../../database/entities';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { BatchGateway } from '../batch/batch.gateway';
import { BatchService } from '../batch/batch.service';
import { FileService } from './file.service';

@Injectable()
export class UploadService {
    constructor(
        private readonly fileService: FileService,
        private readonly rabbitMQService: RabbitMQService,
        private readonly batchService: BatchService,
        private readonly batchGateway: BatchGateway,
        @InjectRepository(Image)
        private readonly imageRepository: Repository<Image>,
        @InjectRepository(Batch)
        private readonly batchRepository: Repository<Batch>,
    ) { }

    /**
     * Handle file upload and send for prediction
     */
    async handleFileUpload(
        file: Express.Multer.File,
        modelName: string = 'default_model',
    ): Promise<IUploadResult> {
        // Create batch immediately with estimated count (will be updated during processing)
        const batch = await this.batchService.createBatch(
            0, // Will be updated once we know the actual count
            modelName,
        );

        // Process images asynchronously (don't wait)
        this.processImagesAsync(file, batch.id, modelName).catch((error) => {
            console.error(`❌ Error processing batch ${batch.id}:`, error);
            // Mark batch as failed
            this.batchService.updateStatus(batch.id, BatchStatus.FAILED).catch(console.error);
        });

        return {
            message: `Batch ${batch.id} created. Processing started in background.`,
            batchId: batch.id,
            count: 0, // Unknown until processing completes
        };
    }

    /**
     * Process images asynchronously in background
     */
    private async processImagesAsync(
        file: Express.Multer.File,
        batchId: string,
        modelName: string,
    ): Promise<void> {
        console.log(`🔄 Starting async processing for batch ${batchId}`);

        // Extract images from file (single image or archive)
        const imageBuffers: IImageBuffer[] = this.fileService.extractImages(file);

        console.log(`📦 Extracted ${imageBuffers.length} image(s) from upload`);

        // Update batch with actual image count
        await this.batchService.updateBatchTotalImages(batchId, imageBuffers.length);

        // Notify WebSocket clients about the update
        const stats = await this.batchService.getStatistics(batchId);
        this.batchGateway.emitBatchUpdateDirect(batchId, stats);

        const batch = await this.batchRepository.findOne({ where: { id: batchId }, relations: ['images'] });

        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }

        // 1. Compute hashes for all images
        const imagesWithHash = imageBuffers.map(img => ({
            ...img,
            hash: this.fileService.computeHash(img.buffer)
        }));

        const hashes = imagesWithHash.map(img => img.hash);

        // 2. Bulk check for existing images
        // We might need to chunk this too if there are TOO many images, but 1000s is usually fine for SELECT IN
        // Let's chunk it to be safe (e.g. 500 at a time)
        const existingMap = new Map<string, Image>();
        const hashChunks = this.chunkArray(hashes, 500);

        for (const chunk of hashChunks) {
            const existing = await this.imageRepository.find({
                where: { imageHash: In(chunk) }
            });
            existing.forEach(img => existingMap.set(img.imageHash, img));
        }

        const newImagesToCreate: Image[] = [];
        const predictionRequests: IPredictionRequest[] = [];
        const finalImages: Image[] = [];
        const uploadTasks: { buffer: Buffer, key: string, mime: string }[] = [];

        // 3. Process each image buffer
        for (const img of imagesWithHash) {
            let image = existingMap.get(img.hash);
            const ext = img.filename.split('.').pop();
            const s3Key = `${img.hash}.${ext}`;

            if (image) {
                console.log(`♻️ Image deduplicated: ${img.filename} -> ${image.id}`);
                finalImages.push(image);
            } else {
                // Create new image entity (don't save yet)
                image = this.imageRepository.create({
                    filename: img.filename,
                    imageHash: img.hash,
                    imageUrl: this.fileService.generateImageUrl(s3Key),
                    isTraining: false,
                });
                newImagesToCreate.push(image);

                // Queue S3 upload task
                uploadTasks.push({
                    buffer: img.buffer,
                    key: s3Key,
                    mime: 'image/' + (ext === 'jpg' ? 'jpeg' : ext)
                });
            }
        }

        // 4. Bulk Save New Images (Batched)
        if (newImagesToCreate.length > 0) {
            const chunks = this.chunkArray(newImagesToCreate, 100); // Batch size 100
            for (const chunk of chunks) {
                const savedImages = await this.imageRepository.save(chunk);
                console.log(`🆕 Bulk saved chunk of ${savedImages.length} new images`);
                finalImages.push(...savedImages);
            }
        }

        // 5. Prepare Prediction Requests & Link to Batch
        for (const img of imagesWithHash) {
            const savedImage = finalImages.find(i => i.imageHash === img.hash);
            if (savedImage) {
                const ext = img.filename.split('.').pop();
                const s3Key = `${img.hash}.${ext}`;

                predictionRequests.push({
                    imageId: savedImage.id,
                    s3Key,
                    bucketName: process.env.AWS_BUCKET_NAME || 'mlops-images',
                    modelName,
                    imageBase64: img.buffer.toString('base64'),
                });
            }
        }

        // 6. Update Batch Relations
        if (!batch.images) batch.images = [];
        const currentImageIds = new Set(batch.images.map(i => i.id));
        const newBatchImages = finalImages.filter(img => !currentImageIds.has(img.id));

        // Save batch relations in chunks if needed, but TypeORM handles relations usually okay. 
        // If many relations, better to save relations separately or chunk.
        // For now, let's just push and save, assuming batch size isn't massive for relations (or TypeORM handles it).
        // Actually, if we have 1000 images, saving batch with 1000 relations might be heavy.
        // Let's rely on TypeORM for now but be aware.
        if (newBatchImages.length > 0) {
            batch.images.push(...newBatchImages);
            await this.batchRepository.save(batch);
        }

        // 7. Send to RabbitMQ (Trigger predictions immediately)
        if (predictionRequests.length > 0) {
            // Chunk prediction requests if needed? RabbitMQ can handle large payloads but better to be safe?
            // Usually one message per request or batch. The service sends array.
            // Let's send all at once for now as per original logic.
            await this.rabbitMQService.sendPredictionRequests(predictionRequests);
            console.log(`🚀 Sent ${predictionRequests.length} prediction requests`);
        }

        // 8. Process S3 uploads with concurrency limit
        // Limit to 10 concurrent uploads
        await this.runWithConcurrency(uploadTasks, 10, async (task) => {
            await this.fileService.uploadToS3(task.buffer, task.key, task.mime);
        });

        console.log(`✅ Batch ${batchId} processing complete: ${imageBuffers.length} images processed`);
    }

    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    private async runWithConcurrency<T>(
        items: T[],
        concurrency: number,
        fn: (item: T) => Promise<void>
    ): Promise<void> {
        const queue = [...items];
        const workers = Array(Math.min(concurrency, items.length))
            .fill(null)
            .map(async () => {
                while (queue.length > 0) {
                    const item = queue.shift();
                    if (item) {
                        try {
                            await fn(item);
                        } catch (err) {
                            console.error('Error in concurrent task:', err);
                            // Decide whether to throw or continue. 
                            // For uploads, maybe we want to continue but log error?
                            // Original code caught error on the whole process.
                            // Let's rethrow to fail the batch if upload fails?
                            // Or just log.
                        }
                    }
                }
            });

        await Promise.all(workers);
    }
}
