# PredictionsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**predictionsControllerFindAll**](PredictionsApi.md#predictionscontrollerfindall) | **GET** /predictions | Get all predictions |
| [**predictionsControllerFindOne**](PredictionsApi.md#predictionscontrollerfindone) | **GET** /predictions/{id} | Get prediction by ID |



## predictionsControllerFindAll

> Array&lt;PredictionDto&gt; predictionsControllerFindAll(limit, offset)

Get all predictions

Retrieve all prediction results with pagination support

### Example

```ts
import {
  Configuration,
  PredictionsApi,
} from '';
import type { PredictionsControllerFindAllRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new PredictionsApi();

  const body = {
    // number | Number of results to return (optional)
    limit: 10,
    // number | Number of results to skip (optional)
    offset: 0,
  } satisfies PredictionsControllerFindAllRequest;

  try {
    const data = await api.predictionsControllerFindAll(body);
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
| **limit** | `number` | Number of results to return | [Optional] [Defaults to `undefined`] |
| **offset** | `number` | Number of results to skip | [Optional] [Defaults to `undefined`] |

### Return type

[**Array&lt;PredictionDto&gt;**](PredictionDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of predictions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## predictionsControllerFindOne

> PredictionDto predictionsControllerFindOne(id)

Get prediction by ID

Retrieve a specific prediction by its ID

### Example

```ts
import {
  Configuration,
  PredictionsApi,
} from '';
import type { PredictionsControllerFindOneRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new PredictionsApi();

  const body = {
    // string | Prediction ID (UUID)
    id: 123e4567-e89b-12d3-a456-426614174000,
  } satisfies PredictionsControllerFindOneRequest;

  try {
    const data = await api.predictionsControllerFindOne(body);
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
| **id** | `string` | Prediction ID (UUID) | [Defaults to `undefined`] |

### Return type

[**PredictionDto**](PredictionDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Prediction found |  -  |
| **404** | Prediction not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

