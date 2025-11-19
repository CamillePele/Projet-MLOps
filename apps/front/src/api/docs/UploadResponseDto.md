
# UploadResponseDto


## Properties

Name | Type
------------ | -------------
`message` | string
`batchId` | string
`count` | number

## Example

```typescript
import type { UploadResponseDto } from ''

// TODO: Update the object below with actual values
const example = {
  "message": Batch created with 10 image(s). Use batchId to track progress.,
  "batchId": 123e4567-e89b-12d3-a456-426614174000,
  "count": 10,
} satisfies UploadResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UploadResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


