/**
 * API 代码生成示例
 * 演示 ReAct Agent 自主使用工具从 Swagger 文档生成 TypeScript API 代码
 */

import { ReActAgent } from "../src/agent/react-agent.ts";
import { ToolRegistry } from "../src/tools/base.ts";
import {
  SwaggerParserTool,
  BasicTypeGeneratorTool,
  BasicAPIGeneratorTool,
  FileWriterTool,
} from "../src/tools/index.ts";

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 ReAct Agent - API 代码生成示例");
  console.log("=".repeat(80) + "\n");

  // 1. 创建工具注册表并注册 API 代码生成相关工具
  const registry = new ToolRegistry();
  registry.register(new SwaggerParserTool());
  registry.register(new BasicTypeGeneratorTool());
  registry.register(new BasicAPIGeneratorTool());
  registry.register(new FileWriterTool());

  // 调试：查看工具描述
  console.log("📋 工具描述信息：");
  console.log(registry.getDescriptions());
  console.log("\n");

  // 2. 创建 ReAct Agent（使用环境变量中的 API Key）
  const apiKey = process.env.OPENAI_API_KEY || process.env.SILICONFLOW_API_KEY || "";
  const baseURL = process.env.OPENAI_BASE_URL || process.env.SILICONFLOW_BASE_URL || "https://api.siliconflow.cn/v1";
  const model = process.env.OPENAI_MODEL || process.env.SILICONFLOW_MODEL || "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B";
  
  console.log(`🔑 使用 API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`🌐 API 端点: ${baseURL}`);
  console.log(`🤖 模型: ${model}\n`);

  const agent = new ReActAgent(
    {
      apiKey,
      model,
      baseURL,
      maxIterations: 10,
      verbose: false, // 先关闭详细日志
    },
    registry
  );

  // ==================== 场景：Agent 自主完成 API 代码生成 ====================
  console.log("📍 场景：让 Agent 自主从 Swagger 文档生成完整的 API 代码");
  console.log("-".repeat(80) + "\n");

  const result = await agent.run(
    "请帮我完成以下任务：\n" +
    "1. 解析 'examples/sample-swagger.json' 文档\n" +
    "2. 根据解析结果生成 TypeScript 类型定义（使用 interface，添加注释）\n" +
    "3. 生成对应的 API 请求函数（使用 axios，添加错误处理）\n" +
    "4. 将类型定义保存到 'generated/types.ts'\n" +
    "5. 将 API 函数保存到 'generated/api.ts'\n" +
    "\n完成后告诉我生成了多少个接口和类型。"
  );

  console.log("\n" + "=".repeat(80));
  console.log("📊 执行结果");
  console.log("=".repeat(80));
  console.log(`✅ 答案: ${result.answer}`);
  console.log(`📈 推理步骤: ${result.steps.length}`);
  console.log(`🔢 Token 使用: ${result.totalTokens || 0}`);
  console.log("=".repeat(80));
}

// 运行示例
main().catch(console.error);

