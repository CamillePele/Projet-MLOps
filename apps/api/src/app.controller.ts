import { Body, Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service';
import { UploadImageDto, UploadImageResponseDto } from './dto/upload-image.dto';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'API is running', schema: { example: 'Hello World!' } })
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('upload')
  @ApiTags('images')
  @ApiOperation({
    summary: 'Upload images for prediction',
    description: 'Upload a single image or a ZIP archive containing multiple images. The images will be sent to the prediction queue for processing.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file or ZIP archive',
    type: UploadImageDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Images successfully uploaded and sent for prediction',
    type: UploadImageResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or bad request' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('modelName') modelName?: string
  ): Promise<UploadImageResponseDto> {
    return this.appService.updloadFile(file, modelName);
  }
}
