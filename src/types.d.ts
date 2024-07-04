export interface OpenAPI {
  openapi: string;
  info: Info;
  servers: Server[];
  security: any[];
  tags: TagClass[];
  paths: Paths;
  components: any;
}

export interface Server {
    url:         string;
    description: string;
}

export interface Info {
  title: string;
  description: string;
  version: string;
}

export interface TagClass {
    name:        string;
    description: string;
}

export interface Paths {
  [key: string]: Path;
}

export type Method =
  | "post"
  | "get"
  | "put"
  | "delete"
  | "patch"
  | "options"
  | "head"
  | "trace";

export type Path = {
  [method in Method]: MethodClass;
};

export interface MethodClass {
  tags: string[];
  operationId: string;
  requestBody?: RequestBody;
  responses: { [key: string]: PostResponse };
  summary?: string;
  parameters?: PurpleParameter[];
  description?: string;
}

export interface PurpleParameter {
  name: string;
  in: 'path' | 'query';
  description?: string;
  required: boolean;
  schema: IndigoSchema;
  examples?: any;
}


export interface IndigoSchema {
  type: FilesType;
  format?: Format;
  items?: FilesClass;
  default?: number | string;
}

export interface FilesClass {
    type:    FilesType;
    format?: Format;
}


export enum Format {
    Binary = "binary",
    Byte = "byte",
    Int32 = "int32",
    Int64 = "int64",
}

export enum FilesType {
  Array = "array",
  Integer = "integer",
  String = "string",
}

export interface RequestBody {
  content: Content;
  required: boolean;
}

export interface Content {
  "application/json": ApplicationJSON;
}

export interface ApplicationJSON {
  schema: ContentSchema;
}

export interface ContentSchema {
  $ref: string;
}

export interface PostResponse {
  description: ResponseDescription;
  content: FluffyContent;
}

export interface FluffyContent {
  "*/*": Empty;
}

export interface Empty {
  schema: PurpleSchema;
}

export interface PurpleSchema {
  type?: PurpleType;
  $ref?: string;
}

export enum PurpleType {
  Object = "object",
  String = "string",
}

export enum ResponseDescription {
  NotFound = "Not Found",
  Ok = "OK",
  The0전체 = "0.전체",
  전체 = "전체",
}
