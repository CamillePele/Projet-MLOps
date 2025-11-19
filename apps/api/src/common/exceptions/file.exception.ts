import { BadRequestException } from '@nestjs/common';

export class UnsupportedFileTypeException extends BadRequestException {
    constructor(fileExtension: string) {
        super(`Unsupported file type: ${fileExtension}`);
    }
}

export class ArchiveExtractionException extends BadRequestException {
    constructor(message: string) {
        super(`Failed to extract archive: ${message}`);
    }
}

export class ImageNotFoundException extends BadRequestException {
    constructor(imageId?: string) {
        super(imageId ? `Image not found: ${imageId}` : 'Image not found');
    }
}
