/**
 * 多轮对话上下文示例
 * 演示 Agent 如何在多轮对话中保持上下文记忆
 */

import { consola } from "consola";
import {
  ReActAgent,
  ToolRegistry,
  CalculatorTool,
  SearchTool,
} from "../src/index.ts";

async function main() {
  const apiKey = process.env.OPENAI_API_KEY || "";
  const baseURL = process.env.OPENAI_BASE_URL || "https://api.siliconflow.cn/v1";
  const model = process.env.OPENAI_MODEL || "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B";

  if (!apiKey) {
    consola.error("请设置 OPENAI_API_KEY 环境变量");
    process.exit(1);
  }

  // 初始化 Agent
  const registry = new ToolRegistry();
  registry.register(new SearchTool());
  registry.register(new CalculatorTool());

  const agent = new ReActAgent(
    {
      apiKey,
      baseURL,
      model,
      maxIterations: 10,
      temperature: 0,
      verbose: true,
    },
    registry
  );

  consola.start("🧪 测试多轮对话上下文功能\n");

  // 第一轮：查询埃菲尔铁塔高度
  consola.box("第 1 轮对话：查询埃菲尔铁塔的高度");
  const result1 = await agent.run("埃菲尔铁塔的高度是多少米？");
  consola.info(`✅ 答案: ${result1.answer}`);
  consola.info(`📊 对话历史: ${agent.getHistorySummary()}\n`);

  // 等待一下
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 第二轮：基于第一轮的结果进行计算
  consola.box("第 2 轮对话：基于上一轮的结果进行计算");
  const result2 = await agent.run("把刚才查到的高度乘以2再加上100，结果是多少？");
  consola.info(`✅ 答案: ${result2.answer}`);
  consola.info(`📊 对话历史: ${agent.getHistorySummary()}\n`);

  // 等待一下
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 第三轮：再次引用之前的结果
  consola.box("第 3 轮对话：引用之前两轮的计算结果");
  const result3 = await agent.run("现在把第一轮的原始高度和第二轮的计算结果相加，结果是多少？");
  consola.info(`✅ 答案: ${result3.answer}`);
  consola.info(`📊 对话历史: ${agent.getHistorySummary()}\n`);

  // 显示完整的对话历史
  consola.box("📚 完整对话历史");
  const history = agent.getHistory();
  history.forEach((msg, index) => {
    const role = msg.role === "user" ? "👤 用户" : "🤖 AI";
    consola.info(`\n${index + 1}. ${role}:`);
    consola.info(msg.content);
  });

  // 测试清除历史
  consola.box("\n🗑️  测试清除历史功能");
  agent.clearHistory();
  consola.info(`📊 对话历史: ${agent.getHistorySummary()}`);

  // 清除历史后，Agent 应该无法引用之前的对话
  consola.box("\n第 4 轮对话：清除历史后，尝试引用之前的内容");
  const result4 = await agent.run("刚才的埃菲尔铁塔高度是多少来着？");
  consola.info(`✅ 答案: ${result4.answer}`);
  consola.info(`📊 对话历史: ${agent.getHistorySummary()}\n`);

  consola.success("\n✅ 多轮对话测试完成！");
}

main().catch((error) => {
  consola.error("测试失败:", error);
  process.exit(1);
});

