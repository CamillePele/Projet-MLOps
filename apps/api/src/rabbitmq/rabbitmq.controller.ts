import { Repository } from 'typeorm';

import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';

import { IPredictionResponse } from '../common/interfaces';
import { Image, Prediction } from '../database/entities';
import { BatchGateway } from '../modules/batch/batch.gateway';
import { BatchService } from '../modules/batch/batch.service';

@Controller()
export class RabbitMQController {
    constructor(
        @InjectRepository(Image)
        private readonly imageRepository: Repository<Image>,
        @InjectRepository(Prediction)
        private readonly predictionRepository: Repository<Prediction>,
        private readonly batchService: BatchService,
        private readonly batchGateway: BatchGateway,
    ) { }

    /**
     * Handle prediction results from Python service
     */
    @EventPattern('prediction_result')
    async handlePredictionResult(@Payload() data: IPredictionResponse) {
        try {
            if (!data.success) {
                console.error(
                    `❌ Prediction failed for image ${data.imageId}:`,
                    data.error,
                );
                return;
            }

            const image = await this.imageRepository.findOne({
                where: { id: data.imageId },
                relations: ['batch'],
            });

            if (!image) {
                console.error(
                    `❌ Image ${data.imageId} not found in database`,
                );
                return;
            }

            const prediction = this.predictionRepository.create({
                image,
                model: data.modelName,
                result: data.result,
            });

            // Save prediction and update batch in parallel for speed
            const savePromise = this.predictionRepository.save(prediction);

            // Update batch if image belongs to one (don't wait for save)
            if (image.batch) {
                const batchId = image.batch.id;

                // Emit prediction complete immediately
                this.batchGateway.emitPredictionComplete(batchId, image.id, true);

                // Update batch and emit stats
                const updatedBatch = await this.batchService.incrementProcessed(
                    batchId,
                    true,
                );

                // Emit update with fresh data directly (no additional DB query)
                this.batchGateway.emitBatchUpdateDirect(batchId, {
                    id: updatedBatch.id,
                    status: updatedBatch.status,
                    progress: updatedBatch.progress,
                    totalImages: updatedBatch.totalImages,
                    processedImages: updatedBatch.processedImages,
                    successfulPredictions: updatedBatch.successfulPredictions,
                    failedPredictions: updatedBatch.failedPredictions,
                    modelName: updatedBatch.modelName,
                    createdAt: updatedBatch.createdAt,
                    updatedAt: updatedBatch.updatedAt,
                });
            }

            await savePromise;
        } catch (error) {
            console.error(`❌ Error handling prediction result:`, error);

            // Try to update batch on error
            try {
                const image = await this.imageRepository.findOne({
                    where: { id: data.imageId },
                    relations: ['batch'],
                });
                if (image?.batch) {
                    await this.batchService.incrementProcessed(
                        image.batch.id,
                        false,
                    );
                    this.batchGateway.emitPredictionComplete(
                        image.batch.id,
                        image.id,
                        false,
                    );
                    await this.batchGateway.emitBatchUpdate(image.batch.id);
                }
            } catch (batchError) {
                console.error(`❌ Error updating batch:`, batchError);
            }
        }
    }
}
