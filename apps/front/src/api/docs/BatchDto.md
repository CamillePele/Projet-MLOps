
# BatchDto


## Properties

Name | Type
------------ | -------------
`id` | string
`status` | string
`totalImages` | number
`processedImages` | number
`successfulPredictions` | number
`failedPredictions` | number
`modelName` | string
`progress` | number
`images` | [Array&lt;ImageDto&gt;](ImageDto.md)
`createdAt` | Date
`updatedAt` | Date

## Example

```typescript
import type { BatchDto } from ''

// TODO: Update the object below with actual values
const example = {
  "id": 123e4567-e89b-12d3-a456-426614174000,
  "status": processing,
  "totalImages": 100,
  "processedImages": 50,
  "successfulPredictions": 48,
  "failedPredictions": 2,
  "modelName": default_model,
  "progress": 50,
  "images": null,
  "createdAt": 2025-11-18T13:49:32Z,
  "updatedAt": 2025-11-18T13:49:32Z,
} satisfies BatchDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as BatchDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


