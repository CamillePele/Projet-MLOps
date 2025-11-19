import { ApiProperty } from '@nestjs/swagger';

export class UploadImageDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Image file or ZIP archive containing images',
    })
    file: any;

    @ApiProperty({
        description: 'Name of the model to use for prediction',
        example: 'default_model',
        required: false,
    })
    modelName?: string;
}

export class UploadImageResponseDto {
    @ApiProperty({
        description: 'Success message',
        example: '5 images sent for prediction',
    })
    message: string;

    @ApiProperty({
        description: 'Array of created image IDs',
        example: [
            '123e4567-e89b-12d3-a456-426614174000',
            '123e4567-e89b-12d3-a456-426614174001',
        ],
        type: [String],
    })
    imageIds: string[];
}
