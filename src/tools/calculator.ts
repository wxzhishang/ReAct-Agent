import { z } from "zod";
import { evaluate } from "mathjs";
import { Tool } from "./base.ts";
import type { ToolResult } from "../agent/types.ts";

/**
 * 计算器工具
 * 可以执行数学运算，支持基本的算术运算和函数
 */
export class CalculatorTool extends Tool {
  name = "calculator";
  description = "执行数学计算。支持基本算术运算（+、-、*、/）、幂运算（^）、括号，以及数学函数（如 sqrt、sin、cos 等）";

  schema = z.object({
    expression: z.string().describe("要计算的数学表达式，例如：'2 + 3 * 4' 或 'sqrt(16)'"),
  });

  async execute(input: any): Promise<ToolResult> {
    try {
      // 验证输入
      const normalizedInput = typeof input === 'string' ? { expression: input } : input;
      const parsed = this.schema.parse(normalizedInput);
      const { expression } = parsed;

      // 使用 mathjs 进行安全的数学计算
      const result = evaluate(expression);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: `计算失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

