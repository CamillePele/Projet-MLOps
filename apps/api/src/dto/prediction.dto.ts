import { ApiProperty } from '@nestjs/swagger';

export class PredictionResultDto {
    @ApiProperty({ description: 'Has beard', example: true })
    beard: boolean;

    @ApiProperty({ description: 'Has mustache', example: false })
    mustache: boolean;

    @ApiProperty({ description: 'Wears glasses', example: true })
    glasses: boolean;

    @ApiProperty({
        description: 'Hair color',
        enum: ['blond', 'lightBrown', 'red', 'darkBrown', 'grayBlue'],
        example: 'darkBrown',
    })
    hairColor: 'blond' | 'lightBrown' | 'red' | 'darkBrown' | 'grayBlue';

    @ApiProperty({
        description: 'Hair length',
        enum: ['bald', 'short', 'long'],
        example: 'short',
    })
    hairLength: 'long' | 'short' | 'bald';
}

export class PredictionDto {
    @ApiProperty({
        description: 'Prediction ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    id: string;

    @ApiProperty({
        description: 'Model name used for prediction',
        example: 'default_model',
    })
    model: string;

    @ApiProperty({
        description: 'Prediction result',
        type: PredictionResultDto,
    })
    result: PredictionResultDto;

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
        example: '/api/images/file/123e4567-e89b-12d3-a456-426614174000.jpg',
        required: false,
    })
    imageUrl?: string;

    @ApiProperty({
        description: 'Predictions for this image',
        type: [PredictionDto],
    })
    processeds: PredictionDto[];

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
