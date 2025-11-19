
# PredictionDto


## Properties

Name | Type
------------ | -------------
`id` | string
`model` | string
`result` | [PredictionResultDto](PredictionResultDto.md)
`createdAt` | Date
`updatedAt` | Date

## Example

```typescript
import type { PredictionDto } from ''

// TODO: Update the object below with actual values
const example = {
  "id": 123e4567-e89b-12d3-a456-426614174000,
  "model": default_model,
  "result": null,
  "createdAt": 2025-11-18T13:49:32Z,
  "updatedAt": 2025-11-18T13:49:32Z,
} satisfies PredictionDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PredictionDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


