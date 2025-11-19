/**
 * File upload-related interfaces
 */

export interface IImageBuffer {
    buffer: Buffer;
    filename: string;
}

export interface IUploadResult {
    message: string;
    batchId: string;
    count: number;
}
