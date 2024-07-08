# Open API to Bruno file

Convert Open APIs to bruno collections.

## How to use

```bash
Usage: openApiToBruno [options]

Convert Swagger to Bruno

Options:
  -V, --version        output the version number
  -s, --source <type>  OpenAPI URL or file path
  -o, --output <type>  Output folder
  -u, --update         Do not delete existing files
  -h, --help           display help for command
```


```bash
npx github:gyuha/openapi-to-bruno -s [OpenAPI api-docs url] -o [Output folder]
```

## Config file

```
bruno:
  version: "1"
  name: "Best Fetstore"
  type: "collectin"
  ignore:
    - "node_modules"
    - ".git"

update:
  ignore:
    addNew: true
    folders:
      - /pet/findByTags
      - /api/admin
    ids:
      - addPet
      - uploadFile

auth:
  type: bearer
  value:
    token: "{{accessToken}}"
  ignore:
    ids:
      - login
    folders:
      - /user
```

### example
```bash
npx --verbose github:gyuha/openapi-to-bruno -s https://petstore.swagger.io/v2/swagger.json -o ./output
```
