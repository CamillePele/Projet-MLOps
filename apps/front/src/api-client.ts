import { BatchesApi, ImagesApi, ModelsApi, PredictionsApi, UploadApi } from './api/apis';
import { Configuration } from './api/runtime';

const config = new Configuration({
    basePath: 'http://localhost:3000',
});

export const imagesApi = new ImagesApi(config);
export const batchesApi = new BatchesApi(config);
export const uploadApi = new UploadApi(config);
export const predictionsApi = new PredictionsApi(config);
export const modelsApi = new ModelsApi(config);
