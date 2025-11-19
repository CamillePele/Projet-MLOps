
# ModelsResponseDto


## Properties

Name | Type
------------ | -------------
`models` | [Array&lt;ModelDto&gt;](ModelDto.md)
`bestModel` | [ModelDto](ModelDto.md)

## Example

```typescript
import type { ModelsResponseDto } from ''

// TODO: Update the object below with actual values
const example = {
  "models": null,
  "bestModel": null,
} satisfies ModelsResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ModelsResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


