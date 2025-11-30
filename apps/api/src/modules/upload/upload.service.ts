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
        const existingImages = await this.imageRepository.find({
            where: { imageHash: In(hashes) }
        });

        const existingMap = new Map(existingImages.map(img => [img.imageHash, img]));
        const newImagesToCreate: Image[] = [];
        const predictionRequests: IPredictionRequest[] = [];
        const finalImages: Image[] = [];

        // 3. Process each image buffer
        const uploadPromises: Promise<void>[] = [];

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

                // Queue S3 upload
                uploadPromises.push(
                    new Promise<void>((resolve, reject) => {
                        this.fileService.uploadToS3(img.buffer, s3Key, 'image/' + (ext === 'jpg' ? 'jpeg' : ext))
                            .then(() => resolve())
                            .catch(err => reject(err))
                    })
                );
            }

            // We need the ID for prediction request, so we'll handle prediction requests after bulk save
        }

        // 4. Bulk Save New Images
        if (newImagesToCreate.length > 0) {
            const savedImages = await this.imageRepository.save(newImagesToCreate);
            console.log(`🆕 Bulk saved ${savedImages.length} new images`);
            finalImages.push(...savedImages);
        }

        // 5. Prepare Prediction Requests & Link to Batch (Do this BEFORE waiting for S3)
        for (const img of imagesWithHash) {
            // Find the saved image entity
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
        // Avoid duplicates in batch relation if any
        const currentImageIds = new Set(batch.images.map(i => i.id));
        for (const img of finalImages) {
            if (!currentImageIds.has(img.id)) {
                batch.images.push(img);
            }
        }
        await this.batchRepository.save(batch);

        // 7. Send to RabbitMQ (Trigger predictions immediately)
        if (predictionRequests.length > 0) {
            await this.rabbitMQService.sendPredictionRequests(predictionRequests);
            console.log(`🚀 Sent ${predictionRequests.length} prediction requests`);
        }

        // 8. Wait for S3 uploads (Background persistence)
        // We await here just to ensure the process doesn't exit before uploads finish,
        // but predictions are already en route!
        await Promise.all(uploadPromises);

        console.log(`✅ Batch ${batchId} processing complete: ${imageBuffers.length} images processed`);
    }
}
