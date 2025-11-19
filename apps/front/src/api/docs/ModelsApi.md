# ModelsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**modelsControllerGetModels**](ModelsApi.md#modelscontrollergetmodels) | **GET** /models | Get available MLflow models |



## modelsControllerGetModels

> ModelsResponseDto modelsControllerGetModels()

Get available MLflow models

### Example

```ts
import {
  Configuration,
  ModelsApi,
} from '';
import type { ModelsControllerGetModelsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ModelsApi();

  try {
    const data = await api.modelsControllerGetModels();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**ModelsResponseDto**](ModelsResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of models with the best one marked. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

