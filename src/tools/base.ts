import { z } from "zod";
import type { ToolResult } from "../agent/types.ts";

/**
 * Tool 抽象基类
 * 所有工具都需要继承这个类
 */
export abstract class Tool {
  /** 工具名称（唯一标识） */
  abstract name: string;

  /** 工具描述（告诉 Agent 这个工具是做什么的） */
  abstract description: string;

  /** 工具参数的 Zod Schema（用于验证输入） */
  abstract schema: z.ZodType<any>;

  /**
   * 执行工具
   * @param input 工具输入参数
   * @returns 执行结果
   */
  abstract execute(input: any): Promise<ToolResult>;

  /**
   * 获取工具的完整描述（包含名称、描述和参数说明）
   */
  getDescription(): string {
    return `${this.name}: ${this.description}\n参数格式: ${this.getSchemaDescription()}`;
  }

  /**
   * 获取参数 Schema 的描述
   */
  private getSchemaDescription(): string {
    try {
      return this.formatZodSchema(this.schema, 0);
    } catch (error) {
      console.error(`获取 schema 描述失败 (${this.name}):`, error);
      return "{}";
    }
  }

  /**
   * 递归格式化 Zod Schema
   */
  private formatZodSchema(schema: any, depth: number): string {
    const indent = "  ".repeat(depth);
    
    // 尝试多种方式获取 shape
    const shape = schema?.shape || schema?.def?.shape || schema?._def?.shape;
    
    if (!shape || typeof shape !== 'object') {
      return "{}";
    }

    const fields: string[] = [];
    
    for (const [key, value] of Object.entries(shape)) {
      const field = value as any;
      
      // 尝试多种方式获取 def
      const def = field?._def || field?.def || field?._zod?.def;
      const typeName = def?.typeName || def?.type;
      const description = def?.description || "";
      
      // 判断是否可选
      const isOptional = typeName === "ZodOptional" || typeName === "optional";
      const required = isOptional ? " (可选)" : " (必需)";
      
      // 获取实际类型
      let actualField = field;
      if (isOptional && def?.innerType) {
        actualField = def.innerType;
      }
      
      const actualDef = actualField?._def || actualField?.def || actualField?._zod?.def;
      const actualTypeName = actualDef?.typeName || actualDef?.type;
      
      // 格式化类型
      let typeStr = "";
      
      if (actualTypeName === "ZodObject" || actualTypeName === "object") {
        // 嵌套对象，递归展开
        const nestedSchema = this.formatZodSchema(actualField, depth + 1);
        typeStr = `object ${nestedSchema}`;
      } else if (actualTypeName === "ZodEnum" || actualTypeName === "enum") {
        // 枚举类型 - 尝试多种方式获取枚举值
        const entries = actualDef?.entries;
        const zodValues = actualField?._zod?.values;
        const options = actualField?.options;
        
        let values: string[] = [];
        if (entries && typeof entries === 'object') {
          values = Object.keys(entries);
        } else if (zodValues && zodValues instanceof Set) {
          values = Array.from(zodValues);
        } else if (Array.isArray(options)) {
          values = options;
        }
        
        if (values.length > 0) {
          typeStr = `enum [${values.map((v: any) => `"${v}"`).join(", ")}]`;
        } else {
          typeStr = "enum";
        }
      } else if (actualTypeName === "ZodArray" || actualTypeName === "array") {
        // 数组类型
        typeStr = "array";
      } else if (actualTypeName === "ZodString" || actualTypeName === "string") {
        typeStr = "string";
      } else if (actualTypeName === "ZodNumber" || actualTypeName === "number") {
        typeStr = "number";
      } else if (actualTypeName === "ZodBoolean" || actualTypeName === "boolean") {
        typeStr = "boolean";
      } else {
        typeStr = actualTypeName?.replace("Zod", "").toLowerCase() || "unknown";
      }
      
      const descStr = description ? ` - ${description}` : "";
      fields.push(`${indent}  "${key}"${required}: ${typeStr}${descStr}`);
    }
    
    return `{\n${fields.join(',\n')}\n${indent}}`;
  }

  /**
   * 验证输入参数
   */
  protected validate(input: any): boolean {
    try {
      this.schema.parse(input);
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Tool Registry - 工具注册表
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * 注册工具
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name "${tool.name}" already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * 获取工具
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有工具
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 获取所有工具的描述
   */
  getDescriptions(): string {
    return this.getAll()
      .map((tool) => tool.getDescription())
      .join("\n\n");
  }

  /**
   * 获取所有工具名称列表
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

