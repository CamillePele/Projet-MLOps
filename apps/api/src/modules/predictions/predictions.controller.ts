import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PredictionDto } from '../../dto/prediction.dto';
import { PredictionsService } from './predictions.service';

@ApiTags('predictions')
@Controller('predictions')
export class PredictionsController {
    constructor(private readonly predictionsService: PredictionsService) { }

    @Get()
    @ApiOperation({
        summary: 'Get all predictions',
        description: 'Retrieve all prediction results with pagination support',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of results to return',
        example: 10,
    })
    @ApiQuery({
        name: 'offset',
        required: false,
        type: Number,
        description: 'Number of results to skip',
        example: 0,
    })
    @ApiResponse({
        status: 200,
        description: 'List of predictions',
        type: [PredictionDto],
    })
    async findAll(
        @Query('limit') limit: number = 10,
        @Query('offset') offset: number = 0,
    ) {
        return this.predictionsService.findAll(limit, offset);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get prediction by ID',
        description: 'Retrieve a specific prediction by its ID',
    })
    @ApiParam({
        name: 'id',
        description: 'Prediction ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @ApiResponse({
        status: 200,
        description: 'Prediction found',
        type: PredictionDto,
    })
    @ApiResponse({ status: 404, description: 'Prediction not found' })
    async findOne(@Param('id') id: string) {
        return this.predictionsService.findOne(id);
    }
}
