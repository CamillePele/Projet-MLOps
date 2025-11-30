import { ApiProperty } from '@nestjs/swagger';

export class ModelDto {
    @ApiProperty({ description: 'Model run ID' })
    id: string;

    @ApiProperty({ description: 'Model display name with metrics' })
    name: string;

    @ApiProperty({ description: 'Model metrics' })
    metrics: Record<string, number>;

    @ApiProperty({ description: 'Model parameters' })
    params: Record<string, any>;

    @ApiProperty({ description: 'MLflow model URI (e.g., runs:/<run_id>/model)' })
    uri: string;

    @ApiProperty({ description: 'Model creation timestamp' })
    createdAt: number;
}

export class ModelsResponseDto {
    @ApiProperty({ description: 'List of available models', type: [ModelDto] })
    models: ModelDto[];

    @ApiProperty({ description: 'Best model based on validation loss', type: ModelDto, nullable: true })
    bestModel: ModelDto | null;
}