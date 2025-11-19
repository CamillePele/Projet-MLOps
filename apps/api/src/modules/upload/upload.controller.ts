import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { UploadImageDto } from '../../dto/upload-image.dto';
import { UploadResponseDto } from '../../dto/upload-response.dto';
import { UploadService } from './upload.service';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post('images')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: 'Upload image(s) for prediction',
        description:
            'Upload a single image or a ZIP archive containing multiple images. Images will be processed and sent for ML prediction.',
    })
    @ApiBody({
        description: 'Image file or ZIP archive',
        type: UploadImageDto,
    })
    @ApiResponse({
        status: 201,
        description: 'Batch created successfully. Use batchId to track progress via WebSocket or REST API.',
        type: UploadResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid file type or extraction error',
    })
    async uploadImages(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: UploadImageDto,
    ) {
        return this.uploadService.handleFileUpload(file, body.modelName);
    }
}
