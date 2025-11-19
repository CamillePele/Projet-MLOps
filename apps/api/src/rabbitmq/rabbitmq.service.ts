import { Repository } from 'typeorm';

import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';

import { IImageBuffer, IPredictionRequest, IPredictionResponse } from '../common/interfaces';
import { Batch, Image, Prediction } from '../database/entities';
import { FileService } from '../modules/upload/file.service';

@Injectable()
export class RabbitMQService implements OnModuleInit {
    constructor(
        @Inject('PREDICTION_SERVICE')
        private readonly predictionClient: ClientProxy,
        @InjectRepository(Image)
        private readonly imageRepository: Repository<Image>,
        @InjectRepository(Prediction)
        private readonly predictionRepository: Repository<Prediction>,
        @InjectRepository(Batch)
        private readonly batchRepository: Repository<Batch>,
        private readonly fileService: FileService,
    ) { }

    async onModuleInit() {
        await this.predictionClient.connect();
        console.log('✅ RabbitMQ client connected');
    }

    /**
     * Send images for prediction
     */
    async sendImagesForPrediction(
        imageBuffers: IImageBuffer[],
        modelName: string = 'default_model',
        batchId?: string,
    ): Promise<string[]> {
        const imageIds: string[] = [];

        // Get batch if provided
        let batch: Batch | null = null;
        if (batchId) {
            batch = await this.batchRepository.findOne({ where: { id: batchId } });
        }

        for (const { buffer, filename } of imageBuffers) {
            // Create image record in database
            const image = this.imageRepository.create({
                isTraining: false,
                filename,
                batch: batch || undefined,
            });
            const savedImage = await this.imageRepository.save(image);

            // Save image to disk
            this.fileService.saveImageToDisk(savedImage.id, buffer, filename);

            // Generate and save image URL
            savedImage.imageUrl = this.fileService.generateImageUrl(
                savedImage.id,
                filename,
            );
            await this.imageRepository.save(savedImage);

            imageIds.push(savedImage.id);

            // Send to prediction queue with batch info
            const request: IPredictionRequest = {
                imageId: savedImage.id,
                imageData: buffer.toString('base64'),
                modelName,
            };

            this.predictionClient.emit('image_prediction', request);
        }

        return imageIds;
    }
}
