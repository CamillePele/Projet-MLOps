# UploadApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**uploadControllerUploadImages**](UploadApi.md#uploadcontrolleruploadimages) | **POST** /upload/images | Upload image(s) for prediction |



## uploadControllerUploadImages

> UploadResponseDto uploadControllerUploadImages(file, modelName)

Upload image(s) for prediction

Upload a single image or a ZIP archive containing multiple images. Images will be processed and sent for ML prediction.

### Example

```ts
import {
  Configuration,
  UploadApi,
} from '';
import type { UploadControllerUploadImagesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UploadApi();

  const body = {
    // Blob | Image file or ZIP archive containing images
    file: BINARY_DATA_HERE,
    // string | Name of the model to use for prediction (optional)
    modelName: modelName_example,
  } satisfies UploadControllerUploadImagesRequest;

  try {
    const data = await api.uploadControllerUploadImages(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **file** | `Blob` | Image file or ZIP archive containing images | [Defaults to `undefined`] |
| **modelName** | `string` | Name of the model to use for prediction | [Optional] [Defaults to `undefined`] |

### Return type

[**UploadResponseDto**](UploadResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `multipart/form-data`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Batch created successfully. Use batchId to track progress via WebSocket or REST API. |  -  |
| **400** | Invalid file type or extraction error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

