import { Repository } from 'typeorm';

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Prediction } from '../../database/entities';

@Injectable()
export class PredictionsService {
    constructor(
        @InjectRepository(Prediction)
        private readonly predictionRepository: Repository<Prediction>,
    ) { }

    /**
     * Get all predictions with pagination
     */
    async findAll(limit: number = 10, offset: number = 0): Promise<Prediction[]> {
        return this.predictionRepository.find({
            take: limit,
            skip: offset,
            order: { createdAt: 'DESC' },
            relations: ['image'],
        });
    }

    /**
     * Get prediction by ID
     */
    async findOne(id: string): Promise<Prediction> {
        const prediction = await this.predictionRepository.findOne({
            where: { id },
            relations: ['image'],
        });

        if (!prediction) {
            throw new NotFoundException(`Prediction with ID ${id} not found`);
        }

        return prediction;
    }
}
