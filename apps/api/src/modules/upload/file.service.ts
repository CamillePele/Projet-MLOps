import * as AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';

import { Injectable } from '@nestjs/common';

import {
    SUPPORTED_ARCHIVE_EXTENSIONS, SUPPORTED_IMAGE_EXTENSIONS, UPLOAD_PATHS
} from '../../common/constants';
import { ArchiveExtractionException, UnsupportedFileTypeException } from '../../common/exceptions';
import { IImageBuffer } from '../../common/interfaces';

@Injectable()
export class FileService {
    constructor() {
        this.ensureUploadDirectoriesExist();
    }

    /**
     * Ensure upload directories exist
     */
    private ensureUploadDirectoriesExist(): void {
        Object.values(UPLOAD_PATHS).forEach((dir) => {
            const fullPath = path.join(process.cwd(), dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        });
    }

    /**
     * Check if file is an image
     */
    isImageFile(filename: string): boolean {
        const extension = path.extname(filename).toLowerCase();
        return SUPPORTED_IMAGE_EXTENSIONS.includes(extension as any);
    }

    /**
     * Check if file is an archive
     */
    isArchiveFile(filename: string): boolean {
        const extension = path.extname(filename).toLowerCase();
        return SUPPORTED_ARCHIVE_EXTENSIONS.includes(extension as any);
    }

    /**
     * Extract images from uploaded file (single image or archive)
     */
    extractImages(file: Express.Multer.File): IImageBuffer[] {
        const fileExtension = path.extname(file.originalname).toLowerCase();

        if (this.isArchiveFile(file.originalname)) {
            return this.extractImagesFromArchive(file, fileExtension);
        } else if (this.isImageFile(file.originalname)) {
            return [
                {
                    buffer: file.buffer,
                    filename: file.originalname,
                },
            ];
        } else {
            throw new UnsupportedFileTypeException(fileExtension);
        }
    }

    /**
     * Extract images from archive file
     */
    private extractImagesFromArchive(
        file: Express.Multer.File,
        fileExtension: string,
    ): IImageBuffer[] {
        const images: IImageBuffer[] = [];

        try {
            if (fileExtension === '.zip') {
                const zip = new AdmZip(file.buffer);
                const zipEntries = zip.getEntries();

                for (const entry of zipEntries) {
                    if (!entry.isDirectory && this.isImageFile(entry.entryName)) {
                        images.push({
                            buffer: entry.getData(),
                            filename: entry.entryName,
                        });
                    }
                }
            } else {
                throw new ArchiveExtractionException(
                    `Archive type ${fileExtension} not yet supported`,
                );
            }
        } catch (error) {
            if (error instanceof ArchiveExtractionException) {
                throw error;
            }
            throw new ArchiveExtractionException(error.message);
        }

        if (images.length === 0) {
            throw new ArchiveExtractionException('No images found in archive');
        }

        return images;
    }

    /**
     * Save image buffer to disk
     */
    saveImageToDisk(imageId: string, buffer: Buffer, filename: string): string {
        const fileExtension = path.extname(filename);
        const savedFilename = `${imageId}${fileExtension}`;
        const filePath = path.join(process.cwd(), UPLOAD_PATHS.IMAGES, savedFilename);

        fs.writeFileSync(filePath, buffer);

        return savedFilename;
    }

    /**
     * Generate image URL
     */
    generateImageUrl(imageId: string, filename: string): string {
        const fileExtension = path.extname(filename);
        return `/images/file/${imageId}${fileExtension}`;
    }

    /**
     * Get image file path
     */
    getImageFilePath(filename: string): string {
        return path.join(process.cwd(), UPLOAD_PATHS.IMAGES, filename);
    }

    /**
     * Check if image file exists
     */
    imageFileExists(filename: string): boolean {
        return fs.existsSync(this.getImageFilePath(filename));
    }
}
