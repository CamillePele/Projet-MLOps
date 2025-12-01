import { Repository } from 'typeorm';

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Batch, BatchStatus, Image } from '../../database/entities';

@Injectable()
export class BatchService {
    constructor(
        @InjectRepository(Batch)
        private readonly batchRepository: Repository<Batch>,
        @InjectRepository(Image)
        private readonly imageRepository: Repository<Image>,
    ) { }

    /**
     * Create a new batch
     */
    async createBatch(
        totalImages: number,
        modelName: string,
    ): Promise<Batch> {
        const batch = this.batchRepository.create({
            totalImages,
            modelName,
            status: BatchStatus.PENDING,
            processedImages: 0,
            successfulPredictions: 0,
            failedPredictions: 0,
        });

        return this.batchRepository.save(batch);
    }

    /**
     * Get all batches with pagination
     */
    async findAll(limit: number = 10, offset: number = 0): Promise<Batch[]> {
        const batches = await this.batchRepository.find({
            take: limit,
            skip: offset,
            order: { createdAt: 'DESC' },
            relations: ['images', 'images.processeds'],
        });

        // Explicitly include computed progress property
        return batches.map(batch => ({
            ...batch,
            progress: batch.progress,
        }));
    }

    /**
     * Get batch by ID (without images for performance)
     */
    async findOne(id: string): Promise<Batch> {
        const batch = await this.batchRepository.findOne({
            where: { id },
        });

        if (!batch) {
            throw new NotFoundException(`Batch with ID ${id} not found`);
        }

        // Explicitly include computed progress property
        return {
            ...batch,
            progress: batch.progress,
        };
    }

    /**
     * Get batch images with pagination
     */
    async getBatchImages(id: string, limit: number = 20, offset: number = 0) {
        // First verify batch exists
        const batch = await this.batchRepository.findOne({
            where: { id },
        });

        if (!batch) {
            throw new NotFoundException(`Batch with ID ${id} not found`);
        }

        // Get paginated images
        const images = await this.imageRepository.find({
            where: { batches: { id } },
            relations: ['processeds'],
            take: limit,
            skip: offset,
            order: { createdAt: 'ASC' },
        });

        return images;
    }

    /**
     * Update batch status
     */
    async updateStatus(id: string, status: BatchStatus): Promise<Batch> {
        const batch = await this.findOne(id);
        batch.status = status;
        return this.batchRepository.save(batch);
    }

    /**
     * Update batch total images count (used when count is determined after batch creation)
     */
    async updateBatchTotalImages(id: string, totalImages: number): Promise<Batch> {
        await this.batchRepository.update(
            { id },
            { totalImages }
        );

        const batch = await this.batchRepository.findOne({
            where: { id },
        });

        if (!batch) {
            throw new NotFoundException(`Batch with ID ${id} not found`);
        }

        return batch;
    }

    /**
     * Increment processed images count (optimized with direct query)
     */
    async incrementProcessed(
        batchId: string,
        success: boolean,
    ): Promise<Batch> {
        // Use direct SQL update for better performance
        await this.batchRepository.increment(
            { id: batchId },
            'processedImages',
            1,
        );

        if (success) {
            await this.batchRepository.increment(
                { id: batchId },
                'successfulPredictions',
                1,
            );
        } else {
            await this.batchRepository.increment(
                { id: batchId },
                'failedPredictions',
                1,
            );
        }

        // Fetch updated batch
        const batch = await this.batchRepository.findOne({
            where: { id: batchId },
        });

        if (!batch) {
            throw new NotFoundException(`Batch with ID ${batchId} not found`);
        }

        // Update status based on progress
        let needsUpdate = false;

        if (batch.processedImages === 1 && batch.status === BatchStatus.PENDING) {
            batch.status = BatchStatus.PROCESSING;
            needsUpdate = true;
        } else if (batch.processedImages === batch.totalImages) {
            batch.status =
                batch.failedPredictions === batch.totalImages
                    ? BatchStatus.FAILED
                    : BatchStatus.COMPLETED;
            needsUpdate = true;
        }

        if (needsUpdate) {
            await this.batchRepository.save(batch);
        }

        return batch;
    }

    /**
     * Get batch statistics (lightweight version without relations)
     */
    async getStatistics(id: string) {
        const batch = await this.batchRepository.findOne({
            where: { id },
        });

        if (!batch) {
            throw new NotFoundException(`Batch with ID ${id} not found`);
        }

        return {
            id: batch.id,
            status: batch.status,
            progress: batch.progress,
            totalImages: batch.totalImages,
            processedImages: batch.processedImages,
            successfulPredictions: batch.successfulPredictions,
            failedPredictions: batch.failedPredictions,
            modelName: batch.modelName,
            createdAt: batch.createdAt,
            updatedAt: batch.updatedAt,
        };
    }

    /**
     * Export batch results as CSV
     */
    async exportToCSV(id: string): Promise<string> {
        const batch = await this.batchRepository.findOne({
            where: { id },
            relations: ['images', 'images.processeds'],
        });

        if (!batch) {
            throw new NotFoundException(`Batch with ID ${id} not found`);
        }

        // Enum mappings
        const hairColorMap = {
            'blond': 0,
            'lightBrown': 1,
            'red': 2,
            'darkBrown': 3,
            'grayBlue': 4
        };

        const hairLengthMap = {
            'long': 0,
            'short': 1,
            'bald': 2
        };

        // CSV header
        const headers = [
            'image_name',
            'barbe',
            'moustache',
            'lunettes',
            'taille_cheveux',
            'couleur_cheveux',
        ];

        // CSV rows - only include images with predictions
        const rows = batch.images
            .filter(image => image.processeds && image.processeds.length > 0)
            .map(image => {
                const prediction = image.processeds[0]; // Get first (latest) prediction

                // Filename without extension
                const filename = image.filename.split('.').slice(0, -1).join('.');

                return [
                    filename || 'unknown',
                    prediction.result.beard ? 1 : 0,
                    prediction.result.mustache ? 1 : 0,
                    prediction.result.glasses ? 1 : 0,
                    hairLengthMap[prediction.result.hairLength] ?? -1,
                    hairColorMap[prediction.result.hairColor] ?? -1,
                ];
            });

        // Convert to CSV format
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => {
                // Escape cells containing commas or quotes
                const cellStr = String(cell);
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(','))
        ].join('\n');

        return csvContent;
    }
}
