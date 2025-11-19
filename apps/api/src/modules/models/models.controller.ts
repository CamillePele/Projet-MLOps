import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ModelsResponseDto } from '../../dto/model.dto';
import { ModelsService } from './models.service';

@ApiTags('models')
@Controller('models')
export class ModelsController {
    constructor(private readonly modelsService: ModelsService) { }

    @Get()
    @ApiOperation({ summary: 'Get available MLflow models' })
    @ApiResponse({
        status: 200,
        description: 'List of models with the best one marked.',
        type: ModelsResponseDto
    })
    async getModels(): Promise<ModelsResponseDto> {
        return this.modelsService.getModels();
    }
}
