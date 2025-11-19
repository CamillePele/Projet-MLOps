# ImagesApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**imagesControllerFindAll**](ImagesApi.md#imagescontrollerfindall) | **GET** /images | Get all images |
| [**imagesControllerFindOne**](ImagesApi.md#imagescontrollerfindone) | **GET** /images/{id} | Get image by ID |
| [**imagesControllerGetImageFile**](ImagesApi.md#imagescontrollergetimagefile) | **GET** /images/file/{filename} | Get image file |
| [**imagesControllerGetImagePredictions**](ImagesApi.md#imagescontrollergetimagepredictions) | **GET** /images/{id}/predictions | Get predictions for an image |



## imagesControllerFindAll

> Array&lt;ImageDto&gt; imagesControllerFindAll(limit, offset, beard, mustache, glasses, hairColor, hairLength)

Get all images

Retrieve all uploaded images with their predictions

### Example

```ts
import {
  Configuration,
  ImagesApi,
} from '';
import type { ImagesControllerFindAllRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ImagesApi();

  const body = {
    // number | Number of results to return (optional)
    limit: 10,
    // number | Number of results to skip (optional)
    offset: 0,
    // boolean | Filter by beard presence (optional)
    beard: true,
    // boolean | Filter by mustache presence (optional)
    mustache: true,
    // boolean | Filter by glasses presence (optional)
    glasses: true,
    // 'blond' | 'lightBrown' | 'red' | 'darkBrown' | 'grayBlue' | Filter by hair color (optional)
    hairColor: hairColor_example,
    // 'bald' | 'short' | 'long' | Filter by hair length (optional)
    hairLength: hairLength_example,
  } satisfies ImagesControllerFindAllRequest;

  try {
    const data = await api.imagesControllerFindAll(body);
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
| **beard** | `boolean` | Filter by beard presence | [Optional] [Defaults to `undefined`] |
| **mustache** | `boolean` | Filter by mustache presence | [Optional] [Defaults to `undefined`] |
| **glasses** | `boolean` | Filter by glasses presence | [Optional] [Defaults to `undefined`] |
| **hairColor** | `blond`, `lightBrown`, `red`, `darkBrown`, `grayBlue` | Filter by hair color | [Optional] [Defaults to `undefined`] [Enum: blond, lightBrown, red, darkBrown, grayBlue] |
| **hairLength** | `bald`, `short`, `long` | Filter by hair length | [Optional] [Defaults to `undefined`] [Enum: bald, short, long] |

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

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## imagesControllerFindOne

> ImageDto imagesControllerFindOne(id)

Get image by ID

Retrieve a specific image with all its predictions

### Example

```ts
import {
  Configuration,
  ImagesApi,
} from '';
import type { ImagesControllerFindOneRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ImagesApi();

  const body = {
    // string | Image ID (UUID)
    id: 123e4567-e89b-12d3-a456-426614174000,
  } satisfies ImagesControllerFindOneRequest;

  try {
    const data = await api.imagesControllerFindOne(body);
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
| **id** | `string` | Image ID (UUID) | [Defaults to `undefined`] |

### Return type

[**ImageDto**](ImageDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Image found |  -  |
| **404** | Image not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## imagesControllerGetImageFile

> imagesControllerGetImageFile(filename)

Get image file

Retrieve the actual image file by filename

### Example

```ts
import {
  Configuration,
  ImagesApi,
} from '';
import type { ImagesControllerGetImageFileRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ImagesApi();

  const body = {
    // string | Image filename (UUID with extension)
    filename: 123e4567-e89b-12d3-a456-426614174000.jpg,
  } satisfies ImagesControllerGetImageFileRequest;

  try {
    const data = await api.imagesControllerGetImageFile(body);
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
| **filename** | `string` | Image filename (UUID with extension) | [Defaults to `undefined`] |

### Return type

`void` (Empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Image file |  -  |
| **404** | Image not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## imagesControllerGetImagePredictions

> Array&lt;PredictionDto&gt; imagesControllerGetImagePredictions(id)

Get predictions for an image

Retrieve all predictions for a specific image

### Example

```ts
import {
  Configuration,
  ImagesApi,
} from '';
import type { ImagesControllerGetImagePredictionsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ImagesApi();

  const body = {
    // string | Image ID (UUID)
    id: 123e4567-e89b-12d3-a456-426614174000,
  } satisfies ImagesControllerGetImagePredictionsRequest;

  try {
    const data = await api.imagesControllerGetImagePredictions(body);
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
| **id** | `string` | Image ID (UUID) | [Defaults to `undefined`] |

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
| **200** | List of predictions for the image |  -  |
| **404** | Image not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

