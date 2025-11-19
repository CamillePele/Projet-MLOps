# BatchesApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**batchControllerExportCSV**](BatchesApi.md#batchcontrollerexportcsv) | **GET** /batches/{id}/export/csv | Export batch results as CSV |
| [**batchControllerFindAll**](BatchesApi.md#batchcontrollerfindall) | **GET** /batches | Get all batches |
| [**batchControllerFindOne**](BatchesApi.md#batchcontrollerfindone) | **GET** /batches/{id} | Get batch by ID |
| [**batchControllerGetBatchImages**](BatchesApi.md#batchcontrollergetbatchimages) | **GET** /batches/{id}/images | Get batch images with pagination |
| [**batchControllerGetStatistics**](BatchesApi.md#batchcontrollergetstatistics) | **GET** /batches/{id}/statistics | Get batch statistics |



## batchControllerExportCSV

> string batchControllerExportCSV(id)

Export batch results as CSV

Download all predictions for a batch in CSV format. Binary values (0/1) for Beard, Mustache, Glasses. Numeric indexes for Hair Color (0&#x3D;blond, 1&#x3D;lightBrown, 2&#x3D;red, 3&#x3D;darkBrown, 4&#x3D;grayBlue) and Hair Length (0&#x3D;bald, 1&#x3D;short, 2&#x3D;long).

### Example

```ts
import {
  Configuration,
  BatchesApi,
} from '';
import type { BatchControllerExportCSVRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new BatchesApi();

  const body = {
    // string | Batch ID (UUID)
    id: 123e4567-e89b-12d3-a456-426614174000,
  } satisfies BatchControllerExportCSVRequest;

  try {
    const data = await api.batchControllerExportCSV(body);
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
| **id** | `string` | Batch ID (UUID) | [Defaults to `undefined`] |

### Return type

**string**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `text/csv`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | CSV file download with binary values (0/1) and enum indexes |  -  |
| **404** | Batch not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## batchControllerFindAll

> Array&lt;BatchDto&gt; batchControllerFindAll(limit, offset)

Get all batches

Retrieve all upload batches with pagination

### Example

```ts
import {
  Configuration,
  BatchesApi,
} from '';
import type { BatchControllerFindAllRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new BatchesApi();

  const body = {
    // number | Number of results to return (optional)
    limit: 10,
    // number | Number of results to skip (optional)
    offset: 0,
  } satisfies BatchControllerFindAllRequest;

  try {
    const data = await api.batchControllerFindAll(body);
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

[**Array&lt;BatchDto&gt;**](BatchDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of batches |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## batchControllerFindOne

> BatchDto batchControllerFindOne(id)

Get batch by ID

Retrieve a specific batch with basic info (without images)

### Example

```ts
import {
  Configuration,
  BatchesApi,
} from '';
import type { BatchControllerFindOneRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new BatchesApi();

  const body = {
    // string | Batch ID (UUID)
    id: 123e4567-e89b-12d3-a456-426614174000,
  } satisfies BatchControllerFindOneRequest;

  try {
    const data = await api.batchControllerFindOne(body);
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
| **id** | `string` | Batch ID (UUID) | [Defaults to `undefined`] |

### Return type

[**BatchDto**](BatchDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Batch found |  -  |
| **404** | Batch not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## batchControllerGetBatchImages

> Array&lt;ImageDto&gt; batchControllerGetBatchImages(id, limit, offset)

Get batch images with pagination

Retrieve images from a specific batch with pagination

### Example

```ts
import {
  Configuration,
  BatchesApi,
} from '';
import type { BatchControllerGetBatchImagesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new BatchesApi();

  const body = {
    // string | Batch ID (UUID)
    id: 123e4567-e89b-12d3-a456-426614174000,
    // number | Number of images to return (optional)
    limit: 20,
    // number | Number of images to skip (optional)
    offset: 0,
  } satisfies BatchControllerGetBatchImagesRequest;

  try {
    const data = await api.batchControllerGetBatchImages(body);
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
| **id** | `string` | Batch ID (UUID) | [Defaults to `undefined`] |
| **limit** | `number` | Number of images to return | [Optional] [Defaults to `undefined`] |
| **offset** | `number` | Number of images to skip | [Optional] [Defaults to `undefined`] |

### Return type

[**Array&lt;ImageDto&gt;**](ImageDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of images |  -  |
| **404** | Batch not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## batchControllerGetStatistics

> BatchDto batchControllerGetStatistics(id)

Get batch statistics

Retrieve progress and statistics for a specific batch

### Example

```ts
import {
  Configuration,
  BatchesApi,
} from '';
import type { BatchControllerGetStatisticsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new BatchesApi();

  const body = {
    // string | Batch ID (UUID)
    id: 123e4567-e89b-12d3-a456-426614174000,
  } satisfies BatchControllerGetStatisticsRequest;

  try {
    const data = await api.batchControllerGetStatistics(body);
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
| **id** | `string` | Batch ID (UUID) | [Defaults to `undefined`] |

### Return type

[**BatchDto**](BatchDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Batch statistics |  -  |
| **404** | Batch not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

