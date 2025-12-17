/**
 * 自定义工具示例
 * 这个示例展示了如何创建和使用自定义工具
 */

import { z } from "zod";
import { consola } from "consola";
import {
  ReActAgent,
  ToolRegistry,
  Tool,
  type ToolResult,
} from "../src/index.ts";

/**
 * 自定义工具：字符串处理工具
 */
class StringTool extends Tool {
  name = "string_tool";
  description = "处理字符串，支持转大写、转小写、反转、获取长度等操作";

  schema = z.object({
    text: z.string().describe("要处理的文本"),
    operation: z
      .enum(["upper", "lower", "reverse", "length"])
      .describe("操作类型：upper(大写), lower(小写), reverse(反转), length(长度)"),
  });

  async execute(input: any): Promise<ToolResult> {
    try {
      const parsed = this.schema.parse(input);
      const { text, operation } = parsed;

      let result: string | number;

      switch (operation) {
        case "upper":
          result = text.toUpperCase();
          break;
        case "lower":
          result = text.toLowerCase();
          break;
        case "reverse":
          result = text.split("").reverse().join("");
          break;
        case "length":
          result = text.length;
          break;
        default:
          throw new Error(`不支持的操作: ${operation}`);
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: `字符串处理失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

/**
 * 自定义工具：随机数生成器
 */
class RandomTool extends Tool {
  name = "random";
  description = "生成指定范围内的随机数";

  schema = z.object({
    min: z.number().describe("最小值"),
    max: z.number().describe("最大值"),
  });

  async execute(input: any): Promise<ToolResult> {
    try {
      const parsed = this.schema.parse(input);
      const { min, max } = parsed;

      if (min >= max) {
        throw new Error("最小值必须小于最大值");
      }

      const random = Math.floor(Math.random() * (max - min + 1)) + min;

      return {
        success: true,
        data: random,
      };
    } catch (error) {
      return {
        success: false,
        error: `生成随机数失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

async function customToolExample() {
  // 从环境变量读取配置
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey) {
    consola.error("请设置 OPENAI_API_KEY 环境变量");
    process.exit(1);
  }

  // 创建工具注册表并注册自定义工具
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(new StringTool());
  toolRegistry.register(new RandomTool());

  // 创建 Agent
  const agent = new ReActAgent(apiKey, toolRegistry, {
    model: model || "Qwen/Qwen2.5-72B-Instruct",
    baseURL: baseURL || "https://api.siliconflow.cn/v1",
    verbose: true,
  });

  // 测试问题
  const questions = [
    "把 'Hello World' 转换成大写",
    "生成一个1到100之间的随机数",
    "把 'TypeScript' 反转过来",
  ];

  for (const question of questions) {
    consola.info("\n" + "=".repeat(60));
    consola.info(`\n提问: ${question}\n`);

    const result = await agent.run(question);

    consola.success(`\n答案: ${result.answer}\n`);

    // 等待一下
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

customToolExample().catch((error) => {
  consola.error("执行失败:", error);
  process.exit(1);
});

