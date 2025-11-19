/**
 * Prediction-related interfaces
 */

export interface IPredictionResult {
    beard: boolean;
    mustache: boolean;
    glasses: boolean;
    hairColor: 'blond' | 'lightBrown' | 'red' | 'darkBrown' | 'grayBlue';
    hairLength: 'bald' | 'short' | 'long';
}

export interface IPredictionRequest {
    imageId: string;
    imageData: string; // Base64 encoded image
    modelName: string;
}

export interface IPredictionResponse {
    imageId: string;
    modelName: string;
    result: IPredictionResult;
    success: boolean;
    error?: string;
}
