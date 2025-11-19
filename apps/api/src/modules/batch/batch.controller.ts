import { Response } from 'express';

import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { BatchDto } from '../../dto/batch.dto';
import { ImageDto } from '../../dto/image.dto';
import { BatchService } from './batch.service';

@ApiTags('batches')
@Controller('batches')
export class BatchController {
    constructor(private readonly batchService: BatchService) { }

    @Get()
    @ApiOperation({
        summary: 'Get all batches',
        description: 'Retrieve all upload batches with pagination',
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
        description: 'List of batches',
        type: [BatchDto],
    })
    async findAll(
        @Query('limit') limit: number = 10,
        @Query('offset') offset: number = 0,
    ) {
        return this.batchService.findAll(limit, offset);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get batch by ID',
        description: 'Retrieve a specific batch with basic info (without images)',
    })
    @ApiParam({
        name: 'id',
        description: 'Batch ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @ApiResponse({
        status: 200,
        description: 'Batch found',
        type: BatchDto,
    })
    @ApiResponse({ status: 404, description: 'Batch not found' })
    async findOne(@Param('id') id: string) {
        return this.batchService.findOne(id);
    }

    @Get(':id/images')
    @ApiOperation({
        summary: 'Get batch images with pagination',
        description: 'Retrieve images from a specific batch with pagination',
    })
    @ApiParam({
        name: 'id',
        description: 'Batch ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of images to return',
        example: 20,
    })
    @ApiQuery({
        name: 'offset',
        required: false,
        type: Number,
        description: 'Number of images to skip',
        example: 0,
    })
    @ApiResponse({
        status: 200,
        description: 'List of images',
        type: [ImageDto],
    })
    @ApiResponse({ status: 404, description: 'Batch not found' })
    async getBatchImages(
        @Param('id') id: string,
        @Query('limit') limit: number = 20,
        @Query('offset') offset: number = 0,
    ) {
        return this.batchService.getBatchImages(id, limit, offset);
    }

    @Get(':id/statistics')
    @ApiOperation({
        summary: 'Get batch statistics',
        description: 'Retrieve progress and statistics for a specific batch',
    })
    @ApiParam({
        name: 'id',
        description: 'Batch ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @ApiResponse({
        status: 200,
        description: 'Batch statistics',
        type: BatchDto,
    })
    @ApiResponse({ status: 404, description: 'Batch not found' })
    async getStatistics(@Param('id') id: string) {
        return this.batchService.getStatistics(id);
    }

    @Get(':id/export/csv')
    @ApiOperation({
        summary: 'Export batch results as CSV',
        description: 'Download all predictions for a batch in CSV format. Binary values (0/1) for Beard, Mustache, Glasses. Numeric indexes for Hair Color (0=blond, 1=lightBrown, 2=red, 3=darkBrown, 4=grayBlue) and Hair Length (0=bald, 1=short, 2=long).',
    })
    @ApiParam({
        name: 'id',
        description: 'Batch ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @ApiResponse({
        status: 200,
        description: 'CSV file download with binary values (0/1) and enum indexes',
        content: {
            'text/csv': {
                schema: {
                    type: 'string',
                    example: 'Filename,Beard,Mustache,Glasses,Hair Color,Hair Length,Predicted At\nphoto1.jpg,1,0,1,3,1,2025-11-18T14:30:00.000Z'
                }
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Batch not found' })
    @Header('Content-Type', 'text/csv')
    async exportCSV(
        @Param('id') id: string,
        @Res() res: Response
    ) {
        const csv = await this.batchService.exportToCSV(id);

        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="batch_${id}_results.csv"`);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');

        // Send CSV content
        res.send(csv);
    }
}
