import { ApiProperty } from '@nestjs/swagger';
import { PredictionDto } from './prediction.dto';

export class ImageDto {
    @ApiProperty({
        description: 'Image ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    id: string;

    @ApiProperty({
        description: 'Is training image',
        example: false,
    })
    isTraining: boolean;

    @ApiProperty({
        description: 'Original filename',
        example: 'photo.jpg',
        required: false,
    })
    filename?: string;

    @ApiProperty({
        description: 'Image URL',
        example: '/images/file/123e4567-e89b-12d3-a456-426614174000.jpg',
        required: false,
    })
    imageUrl?: string;

    @ApiProperty({
        description: 'Predictions for this image',
        type: () => [PredictionDto],
    })
    processeds?: PredictionDto[];

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
