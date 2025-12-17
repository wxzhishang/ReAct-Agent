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
      // 生成一个示例对象来展示参数结构
      const shape = (this.schema as any)._def?.shape?.();
      if (shape) {
        const example: Record<string, any> = {};
        for (const [key, value] of Object.entries(shape)) {
          const zodType = (value as any)._def;
          example[key] = `<${zodType.typeName || "value"}>`;
        }
        return JSON.stringify(example, null, 2);
      }
      return "{}";
    } catch {
      return "{}";
    }
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

