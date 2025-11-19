
# ImageDto


## Properties

Name | Type
------------ | -------------
`id` | string
`isTraining` | boolean
`filename` | string
`imageUrl` | string
`processeds` | [Array&lt;PredictionDto&gt;](PredictionDto.md)
`createdAt` | Date
`updatedAt` | Date

## Example

```typescript
import type { ImageDto } from ''

// TODO: Update the object below with actual values
const example = {
  "id": 123e4567-e89b-12d3-a456-426614174000,
  "isTraining": false,
  "filename": photo.jpg,
  "imageUrl": /images/file/123e4567-e89b-12d3-a456-426614174000.jpg,
  "processeds": null,
  "createdAt": 2025-11-18T13:49:32Z,
  "updatedAt": 2025-11-18T13:49:32Z,
} satisfies ImageDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ImageDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


