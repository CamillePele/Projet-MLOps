import { Injectable } from '@nestjs/common';

import { IImageBuffer, IUploadResult } from '../../common/interfaces';
import { BatchStatus } from '../../database/entities';
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

        // Send images for prediction with batch ID
        await this.rabbitMQService.sendImagesForPrediction(
            imageBuffers,
            modelName,
            batchId,
        );

        console.log(`✅ Batch ${batchId} processing complete: ${imageBuffers.length} images queued`);
    }
}
