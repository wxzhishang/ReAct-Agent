/**
 * Swagger/OpenAPI 解析工具
 * 解析 Swagger 2.0 和 OpenAPI 3.x 文档
 */

import { z } from "zod";
import { Tool } from "./base.ts";
import type { ToolResult } from "../agent/types.ts";
import type { APIEndpoint, OpenAPIDocument, OpenAPISchema } from "./types.ts";
import SwaggerParser from "@apidevtools/swagger-parser";

const swaggerParserSchema = z.object({
  filePath: z.string().describe("Swagger/OpenAPI 文档路径（JSON 或 YAML 格式）"),
  filterTags: z.array(z.string()).optional().describe("只提取指定标签的接口（可选）"),
  filterPaths: z.array(z.string()).optional().describe("只提取匹配的路径（支持通配符，可选）"),
});

/**
 * SwaggerParserTool - 解析 Swagger/OpenAPI 文档
 */
export class SwaggerParserTool extends Tool {
  name = "swagger_parser";
  description = "解析 Swagger 2.0 或 OpenAPI 3.x 文档，提取 API 接口定义、数据模型等信息";
  schema = swaggerParserSchema;

  async execute(input: unknown): Promise<ToolResult> {
    try {
      const { filePath, filterTags, filterPaths } = this.schema.parse(input);

      // 使用 Bun.file() 检查文件是否存在
      const file = Bun.file(filePath);
      const exists = await file.exists();
      
      if (!exists) {
        return {
          success: false,
          error: `文件不存在: ${filePath}`,
        };
      }

      // 解析 Swagger 文档
      const api = await SwaggerParser.parse(filePath) as OpenAPIDocument;

      // 验证文档（使用 unknown 避免类型冲突）
      await SwaggerParser.validate(api as unknown as Parameters<typeof SwaggerParser.validate>[0]);

      // 提取基本信息
      const info = {
        title: api.info?.title || "未命名 API",
        version: api.info?.version || "未知版本",
        description: api.info?.description,
        basePath: api.basePath || api.servers?.[0]?.url,
      };

      // 提取接口列表
      const endpoints: APIEndpoint[] = [];
      const paths = api.paths || {};

      for (const [path, pathItem] of Object.entries(paths)) {
        // 路径过滤
        if (filterPaths && !this.matchPath(path, filterPaths)) {
          continue;
        }

        // 遍历 HTTP 方法
        const methods = ["get", "post", "put", "delete", "patch", "options", "head"];
        for (const method of methods) {
          const operation = (pathItem as Record<string, unknown>)[method] as Record<string, unknown> | undefined;
          if (!operation) continue;

          // 标签过滤
          const tags = operation.tags as string[] | undefined;
          if (filterTags && !this.matchTags(tags, filterTags)) {
            continue;
          }

          endpoints.push({
            path,
            method: method.toUpperCase(),
            operationId: operation.operationId as string | undefined,
            summary: operation.summary as string | undefined,
            description: operation.description as string | undefined,
            tags: tags || [],
            parameters: operation.parameters as APIEndpoint['parameters'],
            requestBody: operation.requestBody as APIEndpoint['requestBody'],
            responses: operation.responses as APIEndpoint['responses'],
          });
        }
      }

      // 提取数据模型（Schemas）
      const schemas = this.extractSchemas(api);

      return {
        success: true,
        data: {
          info,
          endpointsCount: endpoints.length,
          endpoints,
          schemasCount: Object.keys(schemas).length,
          schemas,
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
   * 匹配路径
   */
  private matchPath(path: string, patterns: string[]): boolean {
    return patterns.some((pattern) => {
      // 简单的通配符匹配
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      return regex.test(path);
    });
  }

  /**
   * 匹配标签
   */
  private matchTags(tags: string[] | undefined, filterTags: string[]): boolean {
    if (!tags || tags.length === 0) return false;
    return tags.some((tag) => filterTags.includes(tag));
  }

  /**
   * 提取数据模型
   */
  private extractSchemas(api: OpenAPIDocument): Record<string, OpenAPISchema> {
    // OpenAPI 3.x
    if (api.components?.schemas) {
      return api.components.schemas;
    }

    // Swagger 2.0
    if (api.definitions) {
      return api.definitions;
    }

    return {};
  }
}

