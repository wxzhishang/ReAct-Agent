/**
 * 基本使用示例
 * 这个示例展示了如何使用 ReAct Agent 的最基本功能
 */

import { consola } from "consola";
import {
  ReActAgent,
  ToolRegistry,
  CalculatorTool,
  SearchTool,
  WeatherTool,
} from "../src/index.ts";

async function basicExample() {
  // 从环境变量读取配置
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey) {
    consola.error("请设置 OPENAI_API_KEY 环境变量");
    process.exit(1);
  }

  // 创建工具注册表
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(new CalculatorTool());
  toolRegistry.register(new SearchTool());
  toolRegistry.register(new WeatherTool());

  // 创建 Agent（启用详细日志）
  const agent = new ReActAgent(apiKey, toolRegistry, {
    model: model || "Qwen/Qwen2.5-72B-Instruct",
    baseURL: baseURL || "https://api.siliconflow.cn/v1",
    verbose: true,
  });

  // 运行一个简单的问题
  const question = "计算 123 + 456";
  consola.info(`\n提问: ${question}\n`);

  const result = await agent.run(question);

  consola.success(`\n答案: ${result.answer}`);
  consola.info(`步骤数: ${result.steps.length}`);
  consola.info(`Token 使用: ${result.totalTokens}`);
}

basicExample().catch((error) => {
  consola.error("执行失败:", error);
  process.exit(1);
});

