import * as AdmZip from 'adm-zip';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
    SUPPORTED_ARCHIVE_EXTENSIONS, SUPPORTED_IMAGE_EXTENSIONS, UPLOAD_PATHS
} from '../../common/constants';
import { ArchiveExtractionException, UnsupportedFileTypeException } from '../../common/exceptions';
import { IImageBuffer } from '../../common/interfaces';

@Injectable()
export class FileService {
    private readonly logger = new Logger(FileService.name);
    private s3Client: S3Client;
    private bucketName: string;

    constructor(private readonly configService: ConfigService) {
        this.initializeS3();
    }

    private initializeS3() {
        const region = this.configService.get<string>('AWS_REGION');
        const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
        this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME') || '';
        const endpoint = this.configService.get<string>('AWS_ENDPOINT');

        if (region && accessKeyId && secretAccessKey && this.bucketName) {
            this.s3Client = new S3Client({
                region,
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
                endpoint: endpoint, // Optional, for MinIO
                forcePathStyle: true, // Required for MinIO
            });
            this.logger.log('S3 Client initialized');
        } else {
            this.logger.warn('S3 configuration missing. Uploads will fail if S3 is required.');
        }
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
     * Compute SHA256 hash of image buffer
     */
    computeHash(buffer: Buffer): string {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Upload image to S3
     */
    async uploadToS3(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
        if (!this.s3Client) {
            throw new Error('S3 Client not initialized');
        }

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: filename,
            Body: buffer,
            ContentType: mimeType,
        });

        await this.s3Client.send(command);

        return filename;
    }

    /**
     * Generate image URL (S3 or Proxy)
     */
    generateImageUrl(filename: string): string {
        // If we proxy:
        return `/images/file/${filename}`;
    }

    /**
     * Get image file path (Legacy/Fallback)
     */
    getImageFilePath(filename: string): string {
        return path.join(process.cwd(), UPLOAD_PATHS.IMAGES, filename);
    }

    /**
     * Check if image file exists (Legacy/Fallback)
     */
    async imageFileExists(filename: string): Promise<boolean> {
        if (!this.s3Client) return false;
        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucketName,
                Key: filename,
            });
            await this.s3Client.send(command);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get file stream from S3
     */
    async getFileStream(filename: string): Promise<Readable> {
        if (!this.s3Client) {
            throw new Error('S3 Client not initialized');
        }

        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: filename,
        });

        const response = await this.s3Client.send(command);
        return response.Body as Readable;
    }
}
