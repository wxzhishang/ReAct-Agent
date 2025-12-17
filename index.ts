/**
 * ReAct Agent 交互式问答程序
 * 
 * 运行方式：
 * 1. 设置环境变量（创建 .env 文件或直接 export）
 *    OPENAI_API_KEY="your-api-key"
 *    OPENAI_BASE_URL="https://api.siliconflow.cn/v1"
 *    OPENAI_MODEL="Qwen/Qwen2.5-72B-Instruct"
 * 
 * 2. 运行程序: bun run start
 * 
 * 3. 输入问题，Agent 会自动推理并使用工具
 * 
 * 4. 输入 'exit' 或 'quit' 退出
 */

import { consola } from "consola";
import {
  ReActAgent,
  ToolRegistry,
  CalculatorTool,
  SearchTool,
  WeatherTool,
} from "./src/index.ts";

async function main() {
  // 1. 从环境变量读取配置
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey) {
    consola.error("请设置 OPENAI_API_KEY 环境变量");
    consola.info("方法 1: 创建 .env 文件（复制 env.example）");
    consola.info("方法 2: export OPENAI_API_KEY='your-api-key'");
    process.exit(1);
  }

  // 显示配置信息
  consola.info("📝 配置信息:");
  consola.info(`  API Key: ${apiKey.substring(0, 10)}...`);
  if (baseURL) {
    consola.info(`  Base URL: ${baseURL}`);
  }
  if (model) {
    consola.info(`  模型: ${model}`);
  }

  // 2. 创建工具注册表并注册工具
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(new CalculatorTool());
  toolRegistry.register(new SearchTool());
  toolRegistry.register(new WeatherTool());

  // 3. 创建 Agent（新的配置方式）
  const agent = new ReActAgent(apiKey, toolRegistry, {
    model: model || "",
    baseURL: baseURL || "https://api.siliconflow.cn/v1",
    maxIterations: 10,
    temperature: 0,
    verbose: true, // 启用详细日志
  });

  // 4. 交互式问答循环
  consola.success("\n🎉 ReAct Agent 启动成功！");
  consola.info("\n💡 使用提示:");
  consola.info("  - 输入你的问题，Agent 会自动选择工具并推理");
  consola.info("  - 支持多轮对话，Agent 会记住之前的对话内容");
  consola.info("  - 输入 'exit' 或 'quit' 退出程序");
  consola.info("  - 输入 'clear' 清空屏幕");
  consola.info("  - 输入 'reset' 清除对话历史");
  consola.info("  - 输入 'history' 查看对话历史");
  consola.info("  - 按 Ctrl+C 强制退出\n");

  // 交互式循环
  while (true) {
    try {
      // 读取用户输入
      const question = prompt("🤔 请输入你的问题: ");

      // 处理空输入
      if (!question || question.trim() === "") {
        continue;
      }

      const command = question.trim().toLowerCase();
      
      // 处理退出命令
      if (command === "exit" || command === "quit") {
        consola.success("\n👋 再见！");
        break;
      }

      // 处理清屏命令
      if (command === "clear") {
        console.clear();
        consola.info("📝 配置信息:");
        consola.info(`  API Key: ${apiKey.substring(0, 10)}...`);
        if (baseURL) {
          consola.info(`  Base URL: ${baseURL}`);
        }
        if (model) {
          consola.info(`  模型: ${model}`);
        }
        consola.info("");
        continue;
      }

      // 处理重置历史命令
      if (command === "reset") {
        agent.clearHistory();
        consola.success("✅ 对话历史已清除\n");
        continue;
      }

      // 处理查看历史命令
      if (command === "history") {
        const history = agent.getHistory();
        if (history.length === 0) {
          consola.info("📭 暂无对话历史\n");
        } else {
          consola.box(`📚 对话历史\n\n${agent.getHistorySummary()}`);
          history.forEach((msg, index) => {
            const role = msg.role === "user" ? "👤 用户" : "🤖 AI";
            const preview = msg.content.length > 100 
              ? msg.content.substring(0, 100) + "..." 
              : msg.content;
            consola.info(`${index + 1}. ${role}: ${preview}\n`);
          });
        }
        continue;
      }

      // 执行问题
      consola.info("\n" + "=".repeat(80));
      const startTime = Date.now();
      
      const result = await agent.run(question);
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      // 显示结果
      consola.box(
        `📊 执行结果\n\n` +
        `❓ 问题: ${question}\n` +
        `✅ 答案: ${result.answer}\n` +
        `📈 步骤数: ${result.steps.length}\n` +
        `🎫 Token 使用: ${result.totalTokens || "未知"}\n` +
        `⏱️  耗时: ${duration}秒\n` +
        `💬 对话历史: ${agent.getHistorySummary()}`
      );

      consola.info("\n" + "=".repeat(80) + "\n");
    } catch (error) {
      consola.error("\n❌ 执行出错:");
      consola.error(error);
      consola.info("\n请重新输入问题，或输入 'exit' 退出\n");
    }
  }
}

// 运行主函数
main().catch((error) => {
  consola.error("程序执行失败:");
  consola.error(error);
  process.exit(1);
});