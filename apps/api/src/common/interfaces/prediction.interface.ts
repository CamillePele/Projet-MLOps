/**
 * Prediction-related interfaces
 */

export interface IPredictionResult {
    beard: boolean;
    mustache: boolean;
    glasses: boolean;
    hairColor: 'blond' | 'lightBrown' | 'red' | 'darkBrown' | 'grayBlue';
    hairLength: 'long' | 'short' | 'bald';
}

export interface IPredictionRequest {
    imageId: string;
    s3Key: string;
    bucketName: string;
    modelName: string;
    imageBase64?: string;
}

export interface IPredictionResponse {
    imageId: string;
    modelName: string;
    result: IPredictionResult;
    success: boolean;
    error?: string;
}
