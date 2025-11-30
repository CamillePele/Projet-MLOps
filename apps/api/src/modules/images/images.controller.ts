import { Response } from 'express';
import * as fs from 'fs';

import { Controller, Get, NotFoundException, Param, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { IMAGE_MIME_TYPES } from '../../common/constants';
import { ImageDto } from '../../dto/image.dto';
import { PredictionDto } from '../../dto/prediction.dto';
import { FileService } from '../upload/file.service';
import { ImagesService } from './images.service';

@ApiTags('images')
@Controller('images')
export class ImagesController {
    constructor(
        private readonly imagesService: ImagesService,
        private readonly fileService: FileService,
    ) { }

    @Get()
    @ApiOperation({
        summary: 'Get all images',
        description: 'Retrieve all uploaded images with their predictions',
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
    @ApiQuery({
        name: 'beard',
        required: false,
        type: Boolean,
        description: 'Filter by beard presence',
    })
    @ApiQuery({
        name: 'mustache',
        required: false,
        type: Boolean,
        description: 'Filter by mustache presence',
    })
    @ApiQuery({
        name: 'glasses',
        required: false,
        type: Boolean,
        description: 'Filter by glasses presence',
    })
    @ApiQuery({
        name: 'hairColor',
        required: false,
        enum: ['blond', 'lightBrown', 'red', 'darkBrown', 'grayBlue'],
        description: 'Filter by hair color',
    })
    @ApiQuery({
        name: 'hairLength',
        required: false,
        enum: ['bald', 'short', 'long'],
        description: 'Filter by hair length',
    })
    @ApiQuery({
        name: 'model',
        required: false,
        type: String,
        description: 'Filter by model name',
    })
    @ApiResponse({
        status: 200,
        description: 'List of images',
        type: [ImageDto],
    })
    async findAll(
        @Query('limit') limit: number = 10,
        @Query('offset') offset: number = 0,
        @Query('beard') beard?: boolean,
        @Query('mustache') mustache?: boolean,
        @Query('glasses') glasses?: boolean,
        @Query('hairColor') hairColor?: string,
        @Query('hairLength') hairLength?: string,
        @Query('model') model?: string,
    ) {
        return this.imagesService.findAll(limit, offset, {
            beard,
            mustache,
            glasses,
            hairColor,
            hairLength,
            model,
        });
    }

    @Get('file/:filename')
    @ApiOperation({
        summary: 'Get image file',
        description: 'Retrieve the actual image file by filename',
    })
    @ApiParam({
        name: 'filename',
        description: 'Image filename (UUID with extension)',
        example: '123e4567-e89b-12d3-a456-426614174000.jpg',
    })
    @ApiResponse({ status: 200, description: 'Image file' })
    @ApiResponse({ status: 404, description: 'Image not found' })
    async getImageFile(@Param('filename') filename: string, @Res() res: Response) {
        const exists = await this.fileService.imageFileExists(filename);
        if (!exists) {
            throw new NotFoundException('Image file not found');
        }

        const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
        const contentType = IMAGE_MIME_TYPES[ext] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000');

        try {
            const fileStream = await this.fileService.getFileStream(filename);
            fileStream.pipe(res);
        } catch (error) {
            throw new NotFoundException('Image file could not be retrieved');
        }
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get image by ID',
        description: 'Retrieve a specific image with all its predictions',
    })
    @ApiParam({
        name: 'id',
        description: 'Image ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @ApiResponse({
        status: 200,
        description: 'Image found',
        type: ImageDto,
    })
    @ApiResponse({ status: 404, description: 'Image not found' })
    async findOne(@Param('id') id: string) {
        return this.imagesService.findOne(id);
    }

    @Get(':id/predictions')
    @ApiOperation({
        summary: 'Get predictions for an image',
        description: 'Retrieve all predictions for a specific image',
    })
    @ApiParam({
        name: 'id',
        description: 'Image ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @ApiResponse({
        status: 200,
        description: 'List of predictions for the image',
        type: [PredictionDto],
    })
    @ApiResponse({ status: 404, description: 'Image not found' })
    async getImagePredictions(@Param('id') id: string) {
        return this.imagesService.getImagePredictions(id);
    }
}
