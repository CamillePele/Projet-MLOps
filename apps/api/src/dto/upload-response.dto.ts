import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
    @ApiProperty({
        description: 'Success message',
        example: 'Batch created with 10 image(s). Use batchId to track progress.',
    })
    message: string;

    @ApiProperty({
        description: 'Batch ID for tracking progress',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    batchId: string;

    @ApiProperty({
        description: 'Number of images in the batch',
        example: 10,
    })
    count: number;
}
