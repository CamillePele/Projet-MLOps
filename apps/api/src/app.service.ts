import * as AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';

import { Injectable } from '@nestjs/common';

import { RabbitMQService } from './rabbitmq/rabbitmq.service';

@Injectable()
export class AppService {
  constructor(private readonly rabbitMQService: RabbitMQService) { }

  getHello(): string {
    return 'Hello World!';
  }

  async updloadFile(file: Express.Multer.File, modelName: string = 'default_model'): Promise<{ message: string; imageIds: string[] }> {
    const imageBuffers: { buffer: Buffer; filename: string }[] = [];

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const compressedExtensions = ['.zip', '.tar', '.gz', '.rar'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];

    // If file is a compressed archive, extract it
    if (compressedExtensions.includes(fileExtension)) {
      try {
        if (fileExtension === '.zip') {
          const zip = new AdmZip(file.buffer);
          const zipEntries = zip.getEntries();

          for (const entry of zipEntries) {
            if (!entry.isDirectory) {
              const entryExtension = path.extname(entry.entryName).toLowerCase();
              if (imageExtensions.includes(entryExtension)) {
                imageBuffers.push({
                  buffer: entry.getData(),
                  filename: entry.entryName,
                });
              }
            }
          }
        } else {
          // For other archive types, you might want to add tar extraction logic
          throw new Error(`Archive type ${fileExtension} not yet supported`);
        }
      } catch (error) {
        throw new Error(`Failed to extract archive: ${error.message}`);
      }
    }
    // else, add the file buffer directly to the imageBuffers array
    else if (imageExtensions.includes(fileExtension)) {
      imageBuffers.push({
        buffer: file.buffer,
        filename: file.originalname,
      });
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }

    // Send all images to RabbitMQ for prediction
    const imageIds = await this.rabbitMQService.sendImagesForPrediction(imageBuffers, modelName);

    return {
      message: `${imageBuffers.length} images sent for prediction`,
      imageIds,
    };
  }
}
