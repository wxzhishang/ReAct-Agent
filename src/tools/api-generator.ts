/**
 * API 代码生成工具
 * 基于 Swagger 接口定义生成 API 请求代码
 */

import { z } from "zod";
import { Tool } from "./base.ts";
import type { ToolResult } from "../agent/types.ts";
import type { APIEndpoint, ParametersByLocation, OpenAPIParameter } from "./types.ts";

const apiGeneratorSchema = z.object({
  endpoints: z.array(z.unknown()).describe("API 接口列表"),
  options: z.object({
    httpClient: z.enum(["axios", "fetch"]).optional().describe("HTTP 客户端类型（默认 axios）"),
    baseURL: z.string().optional().describe("API 基础 URL"),
    addComments: z.boolean().optional().describe("添加注释（默认 true）"),
    errorHandling: z.enum(["try-catch", "promise"]).optional().describe("错误处理方式（默认 try-catch）"),
    generateTypes: z.boolean().optional().describe("生成请求和响应类型（默认 true）"),
  }).optional(),
});

/**
 * BasicAPIGeneratorTool - 生成基础 API 代码
 */
export class BasicAPIGeneratorTool extends Tool {
  name = "basic_api_generator";
  description = "根据 Swagger 接口定义生成 API 请求函数代码（支持 axios 和 fetch）";
  schema = apiGeneratorSchema;

  async execute(input: unknown): Promise<ToolResult> {
    try {
      const { endpoints, options = {} } = this.schema.parse(input);

      const {
        httpClient = "axios",
        baseURL = "/api",
        addComments = true,
        errorHandling = "try-catch",
        generateTypes = true,
      } = options;

      // 生成代码
      const codeParts: string[] = [];

      // 添加导入语句
      codeParts.push(this.generateImports(httpClient));
      codeParts.push("");

      // 添加基础配置
      if (httpClient === "axios") {
        codeParts.push(this.generateAxiosConfig(baseURL));
        codeParts.push("");
      } else {
        codeParts.push(this.generateFetchConfig(baseURL));
        codeParts.push("");
      }

      // 生成 API 函数
      for (const endpoint of endpoints) {
        const functionCode = this.generateAPIFunction(
          endpoint as APIEndpoint,
          httpClient,
          baseURL,
          addComments,
          errorHandling,
          generateTypes
        );
        codeParts.push(functionCode);
        codeParts.push("");
      }

      const code = codeParts.join("\n");

      return {
        success: true,
        data: {
          code,
          endpointsCount: endpoints.length,
          options,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 生成导入语句
   */
  private generateImports(httpClient: string): string {
    if (httpClient === "axios") {
      return `import axios from 'axios';`;
    } else {
      return `// 使用原生 fetch API`;
    }
  }

  /**
   * 生成基础 URL 配置（用于 fetch）
   */
  private generateFetchConfig(baseURL: string): string {
    return `const BASE_URL = '${baseURL}';`;
  }

  /**
   * 生成 Axios 配置
   */
  private generateAxiosConfig(baseURL: string): string {
    return `/**
 * API 基础配置
 */
const apiClient = axios.create({
  baseURL: '${baseURL}',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});`;
  }

  /**
   * 生成 API 函数
   */
  private generateAPIFunction(
    endpoint: APIEndpoint,
    httpClient: string,
    baseURL: string,
    addComments: boolean,
    errorHandling: string,
    generateTypes: boolean
  ): string {
    const lines: string[] = [];

    // 生成函数名
    const functionName = endpoint.operationId || 
      this.generateFunctionName(endpoint.method, endpoint.path);

    // 生成参数列表
    const params = this.extractParameters(endpoint);
    const hasPathParams = params.path.length > 0;
    const hasQueryParams = params.query.length > 0;
    const hasBodyParams = endpoint.requestBody;

    // 添加注释
    if (addComments) {
      lines.push("/**");
      if (endpoint.summary) {
        lines.push(` * ${endpoint.summary}`);
      }
      if (endpoint.description) {
        lines.push(` * ${endpoint.description}`);
      }
      lines.push(` * @method ${endpoint.method}`);
      lines.push(` * @path ${endpoint.path}`);
      lines.push(" */");
    }

    // 生成函数签名
    const functionParams: string[] = [];
    
    if (hasPathParams) {
      params.path.forEach(p => {
        functionParams.push(`${p.name}: string`);
      });
    }
    
    if (hasQueryParams) {
      const queryParamTypes = params.query.map(p => `${p.name}?: ${this.getParamType(p)}`).join('; ');
      functionParams.push(`params?: { ${queryParamTypes} }`);
    }
    
    if (hasBodyParams) {
      // 尝试从 requestBody 获取类型名称
      const bodyTypeName = this.getRequestBodyTypeName(endpoint);
      functionParams.push(`data: ${bodyTypeName}`);
    }

    // 获取返回类型
    const responseTypeName = this.getResponseTypeName(endpoint);
    const returnType = generateTypes ? `: Promise<${responseTypeName}>` : "";
    
    lines.push(`export async function ${functionName}(${functionParams.join(', ')})${returnType} {`);

    // 生成函数体
    if (errorHandling === "try-catch") {
      lines.push("  try {");
      lines.push(this.generateRequestCode(endpoint, httpClient, params, 4));
      lines.push("  } catch (error) {");
      lines.push("    console.error('API 请求失败:', error);");
      lines.push("    throw error;");
      lines.push("  }");
    } else {
      lines.push(this.generateRequestCode(endpoint, httpClient, params, 2));
    }

    lines.push("}");

    return lines.join("\n");
  }

  /**
   * 获取参数类型
   */
  private getParamType(param: OpenAPIParameter): string {
    const schema = param.schema;
    if (!schema) return 'any';
    
    const type = schema.type;
    if (type === 'integer' || type === 'number') return 'number';
    if (type === 'boolean') return 'boolean';
    if (type === 'array') return 'any[]';
    return 'string';
  }

  /**
   * 获取请求体类型名称
   */
  private getRequestBodyTypeName(endpoint: APIEndpoint): string {
    // 尝试从 operationId 或路径推断类型名称
    const functionName = endpoint.operationId || this.generateFunctionName(endpoint.method, endpoint.path);
    
    // 转换为 PascalCase
    const typeName = functionName.charAt(0).toUpperCase() + functionName.slice(1);
    return `${typeName}Request`;
  }

  /**
   * 获取响应类型名称
   */
  private getResponseTypeName(endpoint: APIEndpoint): string {
    // DELETE 通常返回 void
    if (endpoint.method.toUpperCase() === 'DELETE') {
      return 'void';
    }
    
    // 尝试从 operationId 或路径推断类型名称
    const functionName = endpoint.operationId || this.generateFunctionName(endpoint.method, endpoint.path);
    
    // 转换为 PascalCase
    const typeName = functionName.charAt(0).toUpperCase() + functionName.slice(1);
    
    // 根据方法推断返回类型
    if (endpoint.method.toUpperCase() === 'GET' && endpoint.path.includes('{')) {
      // GET /users/{id} -> User
      const parts = endpoint.path.split('/').filter(p => p && !p.startsWith('{'));
      const resource = parts[parts.length - 1] || 'Data';
      const singular = resource.endsWith('s') ? resource.slice(0, -1) : resource;
      return singular.charAt(0).toUpperCase() + singular.slice(1);
    } else if (endpoint.method.toUpperCase() === 'GET') {
      // GET /users -> UserListResponse or User[]
      return `${typeName}Response`;
    } else {
      // POST, PUT, PATCH -> 返回单个资源
      const parts = endpoint.path.split('/').filter(p => p && !p.startsWith('{'));
      const resource = parts[parts.length - 1] || 'Data';
      const singular = resource.endsWith('s') ? resource.slice(0, -1) : resource;
      return singular.charAt(0).toUpperCase() + singular.slice(1);
    }
  }

  /**
   * 生成请求代码
   */
  private generateRequestCode(
    endpoint: APIEndpoint,
    httpClient: string,
    params: ParametersByLocation,
    indent: number
  ): string {
    const spaces = " ".repeat(indent);
    let url = endpoint.path;

    // 替换路径参数
    if (params.path.length > 0) {
      params.path.forEach((p) => {
        url = url.replace(`{${p.name}}`, `\${${p.name}}`);
      });
      url = `\`${url}\``;
    } else {
      url = `'${url}'`;
    }

    if (httpClient === "axios") {
      const method = endpoint.method.toLowerCase();
      
      if (method === "get" || method === "delete") {
        return `${spaces}const response = await apiClient.${method}(${url}${params.query.length > 0 ? ', { params }' : ''});\n${spaces}return response.data;`;
      } else {
        return `${spaces}const response = await apiClient.${method}(${url}, data${params.query.length > 0 ? ', { params }' : ''});\n${spaces}return response.data;`;
      }
    } else {
      // fetch 实现
      const lines: string[] = [];
      
      // 处理查询参数
      if (params.query.length > 0) {
        lines.push(`${spaces}const queryParams = new URLSearchParams();`);
        params.query.forEach(p => {
          lines.push(`${spaces}if (params?.${p.name}) queryParams.append('${p.name}', params.${p.name}.toString());`);
        });
        lines.push(`${spaces}const queryString = queryParams.toString() ? \`?\${queryParams.toString()}\` : '';`);
        url = url.includes('`') ? url.replace('`', '`${BASE_URL}').replace(/`$/, '${queryString}`') : `\`\${BASE_URL}${url}\${queryString}\``;
      } else {
        url = url.includes('`') ? url.replace('`', '`${BASE_URL}') : `\`\${BASE_URL}${url}\``;
      }
      
      const options: string[] = [];
      options.push(`method: '${endpoint.method}'`);
      
      if (endpoint.requestBody) {
        options.push("headers: { 'Content-Type': 'application/json' }");
        options.push("body: JSON.stringify(data)");
      }

      lines.push(`${spaces}const response = await fetch(${url}, { ${options.join(', ')} });`);
      lines.push(`${spaces}if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);`);
      
      // 根据响应类型决定是否解析 JSON
      if (endpoint.method.toUpperCase() === 'DELETE') {
        lines.push(`${spaces}// 204 No Content 没有响应体`);
      } else {
        lines.push(`${spaces}return await response.json() as any;`);
      }
      
      return lines.join('\n');
    }
  }

  /**
   * 提取参数
   */
  private extractParameters(endpoint: APIEndpoint): ParametersByLocation {
    const result: ParametersByLocation = {
      path: [],
      query: [],
      header: [],
      body: [],
    };

    if (!endpoint.parameters) return result;

    endpoint.parameters.forEach((param) => {
      const paramIn = param.in || "query";
      if (paramIn === "path") {
        result.path.push(param);
      } else if (paramIn === "query") {
        result.query.push(param);
      } else if (paramIn === "header") {
        result.header.push(param);
      } else if (paramIn === "body") {
        result.body.push(param);
      }
    });

    return result;
  }

  /**
   * 生成函数名
   */
  private generateFunctionName(method: string, path: string): string {
    // 从路径生成函数名
    // 例如: GET /api/users/{id} -> getUserById
    const parts = path.split("/").filter(p => p && !p.startsWith("{"));
    const resource = parts[parts.length - 1] || "api";
    
    const methodMap: Record<string, string> = {
      GET: "get",
      POST: "create",
      PUT: "update",
      DELETE: "delete",
      PATCH: "patch",
    };

    const methodPrefix = methodMap[method.toUpperCase()] || method.toLowerCase();
    
    // 驼峰命名
    const camelResource = resource.replace(/-([a-z])/g, (g) => g[1]?.toUpperCase() || g);
    
    return `${methodPrefix}${camelResource.charAt(0).toUpperCase()}${camelResource.slice(1)}`;
  }
}

