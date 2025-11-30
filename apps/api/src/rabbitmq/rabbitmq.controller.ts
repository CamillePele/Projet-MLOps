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
                relations: ['batches'],
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

            // Save prediction and update batches in parallel for speed
            const savePromise = this.predictionRepository.save(prediction);

            // Update batches if image belongs to any (don't wait for save)
            if (image.batches && image.batches.length > 0) {
                for (const batch of image.batches) {
                    // Only update the batch if the model matches?
                    // Or update all batches that contain this image?
                    // Ideally, we should only update the batch that requested this prediction.
                    // But we don't have the batchId in the prediction result (unless we add it to the request).
                    // However, if we filter by model name, we can guess.
                    // Or simpler: update all batches that have this image AND use this model.

                    if (batch.modelName === data.modelName) {
                        const batchId = batch.id;

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
                }
            }

            await savePromise;
        } catch (error) {
            console.error(`❌ Error handling prediction result:`, error);

            // Try to update batch on error
            try {
                const image = await this.imageRepository.findOne({
                    where: { id: data.imageId },
                    relations: ['batches'],
                });

                if (image?.batches) {
                    for (const batch of image.batches) {
                        // Only update relevant batches (matching model)
                        if (batch.modelName === data.modelName) {
                            await this.batchService.incrementProcessed(
                                batch.id,
                                false,
                            );
                            this.batchGateway.emitPredictionComplete(
                                batch.id,
                                image.id,
                                false,
                            );
                            await this.batchGateway.emitBatchUpdate(batch.id);
                        }
                    }
                }
            } catch (batchError) {
                console.error(`❌ Error updating batch:`, batchError);
            }
        }
    }
}
