import { Configuration } from './api/runtime';
import { ImagesApi, BatchesApi, UploadApi, PredictionsApi } from './api/apis';

const config = new Configuration({
    basePath: 'http://localhost:3000',
});

export const imagesApi = new ImagesApi(config);
export const batchesApi = new BatchesApi(config);
export const uploadApi = new UploadApi(config);
export const predictionsApi = new PredictionsApi(config);
