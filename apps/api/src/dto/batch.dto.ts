import { ApiProperty } from '@nestjs/swagger';
import { BatchStatus } from '../database/entities/batch.entity';
import { ImageDto } from './image.dto';

export class BatchDto {
    @ApiProperty({
        description: 'Batch ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    id: string;

    @ApiProperty({
        description: 'Batch status',
        enum: BatchStatus,
        example: BatchStatus.PROCESSING,
    })
    status: BatchStatus;

    @ApiProperty({
        description: 'Total number of images in the batch',
        example: 100,
    })
    totalImages: number;

    @ApiProperty({
        description: 'Number of processed images',
        example: 50,
    })
    processedImages: number;

    @ApiProperty({
        description: 'Number of successful predictions',
        example: 48,
    })
    successfulPredictions: number;

    @ApiProperty({
        description: 'Number of failed predictions',
        example: 2,
    })
    failedPredictions: number;

    @ApiProperty({
        description: 'Model name used for prediction',
        example: 'default_model',
        required: false,
    })
    modelName?: string;

    @ApiProperty({
        description: 'Progress percentage',
        example: 50,
    })
    progress: number;

    @ApiProperty({
        description: 'Images in the batch',
        type: [ImageDto],
        required: false,
    })
    images?: ImageDto[];

    @ApiProperty({
        description: 'Creation date',
        example: '2025-11-18T13:49:32.000Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Last update date',
        example: '2025-11-18T13:49:32.000Z',
    })
    updatedAt: Date;
}
