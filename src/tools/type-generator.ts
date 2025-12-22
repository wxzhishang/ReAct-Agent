/**
 * 类型定义生成工具
 * 基于 Swagger Schema 生成 TypeScript 类型定义
 */

import { z } from "zod";
import { Tool } from "./base.ts";
import type { ToolResult } from "../agent/types.ts";
import type { OpenAPISchema } from "./types.ts";

const typeGeneratorSchema = z.object({
  schemas: z.record(z.string(), z.unknown()).describe("Swagger schemas 对象"),
  options: z.object({
    useInterface: z.boolean().optional().describe("使用 interface 而非 type（默认 true）"),
    addComments: z.boolean().optional().describe("添加注释（默认 true）"),
    exportTypes: z.boolean().optional().describe("导出类型（默认 true）"),
    prefix: z.string().optional().describe("类型名前缀（如 'I'）"),
  }).optional(),
});

/**
 * BasicTypeGeneratorTool - 生成基础类型定义
 */
export class BasicTypeGeneratorTool extends Tool {
  name = "basic_type_generator";
  description = "根据 Swagger Schema 生成 TypeScript 类型定义（interface 或 type）";
  schema = typeGeneratorSchema;

  async execute(input: unknown): Promise<ToolResult> {
    try {
      const { schemas, options = {} } = this.schema.parse(input);

      const {
        useInterface = true,
        addComments = true,
        exportTypes = true,
        prefix = "",
      } = options;

      // 生成类型定义
      const typeDefinitions: string[] = [];
      
      // 添加文件头注释
      if (addComments) {
        typeDefinitions.push("/**");
        typeDefinitions.push(" * API 类型定义");
        typeDefinitions.push(" * 自动生成，请勿手动修改");
        typeDefinitions.push(" */");
        typeDefinitions.push("");
      }

      // 遍历所有 schemas
      for (const [schemaName, schema] of Object.entries(schemas)) {
        const typeName = prefix + schemaName;
        const typeCode = this.generateTypeFromSchema(
          typeName,
          schema as OpenAPISchema,
          useInterface,
          addComments,
          exportTypes
        );
        typeDefinitions.push(typeCode);
        typeDefinitions.push(""); // 空行
      }

      const code = typeDefinitions.join("\n");

      return {
        success: true,
        data: {
          code,
          typesCount: Object.keys(schemas).length,
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
   * 从 Schema 生成类型定义
   */
  private generateTypeFromSchema(
    typeName: string,
    schema: OpenAPISchema,
    useInterface: boolean,
    addComments: boolean,
    exportTypes: boolean
  ): string {
    const lines: string[] = [];

    // 添加注释
    if (addComments && schema.description) {
      lines.push("/**");
      lines.push(` * ${schema.description}`);
      lines.push(" */");
    }

    // 生成类型定义
    const exportKeyword = exportTypes ? "export " : "";
    const keyword = useInterface ? "interface" : "type";
    
    if (schema.type === "object" && schema.properties) {
      // 对象类型
      if (useInterface) {
        lines.push(`${exportKeyword}${keyword} ${typeName} {`);
      } else {
        lines.push(`${exportKeyword}${keyword} ${typeName} = {`);
      }

      // 生成属性
      const required = schema.required || [];
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const isRequired = required.includes(propName);
        const optional = isRequired ? "" : "?";
        const propType = this.getTypeFromSchema(propSchema);
        
        // 属性注释
        const propSchemaTyped = propSchema as OpenAPISchema;
        if (addComments && propSchemaTyped.description) {
          lines.push(`  /** ${propSchemaTyped.description} */`);
        }
        
        lines.push(`  ${propName}${optional}: ${propType};`);
      }

      if (useInterface) {
        lines.push("}");
      } else {
        lines.push("};");
      }
    } else if (schema.enum) {
      // 枚举类型（始终使用 type，不能用 interface）
      const enumValues = schema.enum.map((v: any) => 
        typeof v === "string" ? `"${v}"` : v
      ).join(" | ");
      lines.push(`${exportKeyword}type ${typeName} = ${enumValues};`);
    } else {
      // 其他类型（别名）
      const tsType = this.getTypeFromSchema(schema);
      lines.push(`${exportKeyword}${keyword} ${typeName} = ${tsType};`);
    }

    return lines.join("\n");
  }

  /**
   * 从 Schema 获取 TypeScript 类型
   */
  private getTypeFromSchema(schema: OpenAPISchema): string {
    // 引用类型
    if (schema.$ref) {
      const refName = schema.$ref.split("/").pop();
      return refName || "any";
    }

    // 数组类型
    if (schema.type === "array") {
      const itemType = schema.items ? this.getTypeFromSchema(schema.items) : "any";
      return `${itemType}[]`;
    }

    // 对象类型
    if (schema.type === "object") {
      if (schema.properties) {
        // 内联对象
        const props = Object.entries(schema.properties).map(([key, value]) => {
          const required = schema.required || [];
          const optional = required.includes(key) ? "" : "?";
          const type = this.getTypeFromSchema(value);
          return `${key}${optional}: ${type}`;
        });
        return `{ ${props.join("; ")} }`;
      }
      return "Record<string, any>";
    }

    // 基础类型映射
    const typeMap: Record<string, string> = {
      string: "string",
      number: "number",
      integer: "number",
      boolean: "boolean",
      null: "null",
    };

    return (schema.type && typeMap[schema.type]) || "unknown";
  }
}

