/**
 * SiliconFlow API 使用示例
 * 演示如何使用 SiliconFlow 的 API 端点和模型
 */

import { consola } from "consola";
import {
  ReActAgent,
  ToolRegistry,
  CalculatorTool,
  SearchTool,
  WeatherTool,
} from "../src/index.ts";

async function siliconflowExample() {
  // 从环境变量读取配置
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || "https://api.siliconflow.cn/v1";
  const model = process.env.OPENAI_MODEL || "Qwen/Qwen2.5-72B-Instruct";

  if (!apiKey) {
    consola.error("请设置 OPENAI_API_KEY 环境变量");
    consola.info("\n获取 API Key:");
    consola.info("1. 访问 https://cloud.siliconflow.cn/account/ak");
    consola.info("2. 注册并创建 API Key");
    consola.info("3. 复制 env.example 为 .env 并填入配置");
    process.exit(1);
  }

  consola.success("✅ SiliconFlow 配置检测成功\n");
  consola.info("📝 当前配置:");
  consola.info(`  API Key: ${apiKey.substring(0, 20)}...`);
  consola.info(`  Base URL: ${baseURL}`);
  consola.info(`  模型: ${model}\n`);

  // 创建工具注册表
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(new CalculatorTool());
  toolRegistry.register(new SearchTool());
  toolRegistry.register(new WeatherTool());

  // 创建 Agent
  const agent = new ReActAgent(apiKey, toolRegistry, {
    model: model || "Qwen/Qwen2.5-72B-Instruct",
    baseURL: baseURL,
    maxIterations: 10,
    temperature: 0,
    verbose: true,
  });

  // 测试问题
  const questions = [
    "计算 (123 + 456) * 789 的结果",
    "北京今天天气怎么样？温度乘以 2 是多少？",
    "搜索埃菲尔铁塔的信息，然后计算它的高度除以 10",
  ];

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    
    if (!question) continue;
    
    consola.info("\n" + "=".repeat(80));
    consola.box(`问题 ${i + 1}/${questions.length}: ${question}`);

    try {
      const result = await agent.run(question);

      consola.success("\n✅ 执行完成！");
      consola.box(
        `📊 执行结果\n\n` +
        `答案: ${result.answer}\n` +
        `步骤数: ${result.steps.length}\n` +
        `Token 使用: ${result.totalTokens || "未知"}`
      );

      // 等待一下再执行下一个问题
      if (i < questions.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      consola.error(`❌ 执行失败: ${question}`);
      consola.error(error);
    }
  }

  consola.success("\n🎉 所有示例执行完成！");
}

// 运行示例
siliconflowExample().catch((error) => {
  consola.error("程序执行失败:");
  consola.error(error);
  process.exit(1);
});

