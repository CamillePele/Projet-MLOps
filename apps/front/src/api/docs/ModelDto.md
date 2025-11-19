
# ModelDto


## Properties

Name | Type
------------ | -------------
`id` | string
`name` | string
`metrics` | object
`params` | object
`uri` | string
`createdAt` | number

## Example

```typescript
import type { ModelDto } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "name": null,
  "metrics": null,
  "params": null,
  "uri": null,
  "createdAt": null,
} satisfies ModelDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ModelDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


