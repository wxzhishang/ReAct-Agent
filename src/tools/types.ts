/**
 * 工具公共类型定义
 */

// ==================== Swagger/OpenAPI 相关类型 ====================

/**
 * OpenAPI Parameter 定义
 */
export interface OpenAPIParameter {
  name: string;
  in: "query" | "path" | "header" | "cookie" | "body";
  description?: string;
  required?: boolean;
  schema?: OpenAPISchema;
  deprecated?: boolean;
}

/**
 * OpenAPI Schema 定义
 */
export interface OpenAPISchema {
  type?: "string" | "number" | "integer" | "boolean" | "array" | "object" | "null";
  format?: string;
  description?: string;
  enum?: (string | number)[];
  items?: OpenAPISchema;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  $ref?: string;
  additionalProperties?: boolean | OpenAPISchema;
  allOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  oneOf?: OpenAPISchema[];
}

/**
 * OpenAPI RequestBody 定义
 */
export interface OpenAPIRequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, {
    schema?: OpenAPISchema;
  }>;
}

/**
 * OpenAPI Response 定义
 */
export interface OpenAPIResponse {
  description?: string;
  content?: Record<string, {
    schema?: OpenAPISchema;
  }>;
}

/**
 * API 接口端点定义
 */
export interface APIEndpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
}

/**
 * OpenAPI 文档信息
 */
export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
  basePath?: string;
}

/**
 * OpenAPI 文档结构
 */
export interface OpenAPIDocument {
  openapi?: string;
  swagger?: string;
  info: {
    title?: string;
    version?: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  basePath?: string;
  paths: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
  };
  definitions?: Record<string, OpenAPISchema>;
}

// ==================== 文件操作相关类型 ====================

/**
 * 文件/目录项类型
 */
export type FileItemType = "file" | "directory" | "unknown";

/**
 * 目录项信息
 */
export interface DirectoryItem {
  name: string;
  path: string;
  type: FileItemType;
  size?: number;
}

/**
 * 文件统计信息
 */
export interface FileStats {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  modifiedTime: Date;
}

// ==================== 代码生成相关类型 ====================

/**
 * 参数分类结果
 */
export interface ParametersByLocation {
  path: OpenAPIParameter[];
  query: OpenAPIParameter[];
  header: OpenAPIParameter[];
  body: OpenAPIParameter[];
}

/**
 * 类型生成选项
 */
export interface TypeGeneratorOptions {
  useInterface?: boolean;
  addComments?: boolean;
  exportTypes?: boolean;
  prefix?: string;
}

/**
 * API 生成选项
 */
export interface APIGeneratorOptions {
  httpClient?: "axios" | "fetch";
  baseURL?: string;
  addComments?: boolean;
  errorHandling?: "try-catch" | "promise";
  generateTypes?: boolean;
}

