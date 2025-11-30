import { Repository } from 'typeorm';

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Image } from '../../database/entities';

@Injectable()
export class ImagesService {
    constructor(
        @InjectRepository(Image)
        private readonly imageRepository: Repository<Image>,
    ) { }

    /**
     * Get all images with pagination and filters
     */
    async findAll(
        limit: number = 10,
        offset: number = 0,
        filters: {
            beard?: boolean;
            mustache?: boolean;
            glasses?: boolean;
            hairColor?: string;
            hairLength?: string;
            model?: string;
        } = {},
    ): Promise<Image[]> {
        const query = this.imageRepository.createQueryBuilder('image');

        if (filters.model) {
            // If model is specified, only load predictions for that model
            // and only return images that have such predictions
            query.innerJoinAndSelect('image.processeds', 'prediction', 'prediction.model = :model', { model: filters.model });
        } else {
            // Otherwise load all predictions
            query.leftJoinAndSelect('image.processeds', 'prediction');
        }

        query
            .orderBy('image.createdAt', 'DESC')
            .take(limit)
            .skip(offset);

        if (filters.beard !== undefined) {
            query.andWhere('prediction.result ::jsonb ->> \'beard\' = :beard', { beard: String(filters.beard) });
        }

        if (filters.mustache !== undefined) {
            query.andWhere('prediction.result ::jsonb ->> \'mustache\' = :mustache', { mustache: String(filters.mustache) });
        }

        if (filters.glasses !== undefined) {
            query.andWhere('prediction.result ::jsonb ->> \'glasses\' = :glasses', { glasses: String(filters.glasses) });
        }

        if (filters.hairColor) {
            query.andWhere('prediction.result ::jsonb ->> \'hairColor\' = :hairColor', { hairColor: filters.hairColor });
        }

        if (filters.hairLength) {
            query.andWhere('prediction.result ::jsonb ->> \'hairLength\' = :hairLength', { hairLength: filters.hairLength });
        }

        return query.getMany();
    }

    /**
     * Get image by ID
     */
    async findOne(id: string): Promise<Image> {
        const image = await this.imageRepository.findOne({
            where: { id },
            relations: ['processeds'],
        });

        if (!image) {
            throw new NotFoundException(`Image with ID ${id} not found`);
        }

        return image;
    }

    /**
     * Get predictions for an image
     */
    async getImagePredictions(id: string) {
        const image = await this.findOne(id);
        return image.processeds;
    }
}
