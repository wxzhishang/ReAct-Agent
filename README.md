# ReAct Agent

基于 ReAct（Reasoning and Acting）架构的 AI Agent 实现，使用 TypeScript 和 Bun 运行时。通过自然语言对话，Agent 能够自主选择工具、推理决策，完成从 Swagger/OpenAPI 文档自动生成 TypeScript API 代码等复杂任务。

## 🌟 核心特性

- 🤖 **ReAct 架构**：实现思考（Reasoning）和行动（Acting）的完整循环，Agent 自主决策
- 🛠️ **可扩展工具系统**：原子化工具设计，轻松添加自定义工具
- 🚀 **智能代码生成**：从 Swagger/OpenAPI 文档自动生成 TypeScript 类型定义和 API 函数
- 💬 **交互式对话**：命令行交互式问答，自然语言驱动
- 🧠 **多轮对话上下文**：支持连续提问，自动记忆和压缩对话历史
- 🔄 **防循环机制**：智能检测和防止重复操作
- 📊 **可视化日志**：详细展示 Agent 的思考和决策过程
- 📝 **类型安全**：完整的 TypeScript 类型定义和 Zod 数据验证
- ⚡ **高性能**：使用 Bun 运行时，快速高效

## 📦 技术栈

- **Bun** - 高性能 JavaScript/TypeScript 运行时
- **TypeScript** - 类型安全的开发体验
- **OpenAI SDK** - LLM 调用（支持 OpenAI、SiliconFlow 等兼容端点）
- **Zod** - 运行时数据验证和类型推断
- **Consola** - 美观的控制台日志输出
- **Swagger Parser** - Swagger 2.0 和 OpenAPI 3.x 文档解析
- **Fast-Glob** - 快速文件搜索和匹配

## 🚀 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# OpenAI API 配置（必需）
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://api.siliconflow.cn/v1
OPENAI_MODEL=Qwen/Qwen2.5-72B-Instruct
```

**推荐 API 提供商：**
- **SiliconFlow**（推荐）: https://cloud.siliconflow.cn/account/ak
  - 支持多种开源模型（Qwen、DeepSeek 等）
  - 价格实惠，响应快速
- **OpenAI**: https://platform.openai.com/api-keys
  - 官方 GPT 模型
- 其他兼容 OpenAI API 的服务

### 3. 运行程序

```bash
bun run start
```

### 4. 开始提问

```
🤔 请输入你的问题: 解析 examples/sample-swagger.json 并生成 TypeScript 代码
```

**可用命令：**
- 直接输入问题 - Agent 自动推理并执行
- `exit` / `quit` - 退出程序
- `clear` - 清空屏幕
- `reset` - 清除对话历史
- `history` - 查看对话历史
- `Ctrl+C` - 强制退出

## 📖 使用方法

### 交互式模式（推荐）

运行主程序，进入交互式问答：

```bash
bun run start
```

**多轮对话示例：**

```
🤔 请输入你的问题: 解析 examples/sample-swagger.json 文档
💭 思考: 我需要使用 swagger_parser 工具解析文档
🔧 行动: swagger_parser
✅ 答案: 已成功解析 Swagger 文档，找到 5 个 API 接口和 3 个数据模型。

🤔 请输入你的问题: 根据刚才解析的结果生成 TypeScript 类型定义
💭 思考: 我可以使用之前解析的 schemas 生成类型
🔧 行动: basic_type_generator
✅ 答案: 已生成 TypeScript 类型定义，包含 3 个接口类型。

🤔 请输入你的问题: 将类型定义保存到 generated/types.ts 文件
💭 思考: 使用 file_writer 工具保存代码
🔧 行动: file_writer
✅ 答案: 已成功保存类型定义到 generated/types.ts 文件。
```

Agent 会自动记住之前的对话内容，支持连续提问而无需重复说明上下文。当对话历史超过限制时，会自动压缩早期对话为摘要。

### 程序化使用

```typescript
import {
  ReActAgent,
  ToolRegistry,
  SwaggerParserTool,
  BasicTypeGeneratorTool,
  BasicAPIGeneratorTool,
  FileWriterTool,
} from "./src/index.ts";

// 1. 创建工具注册表并注册工具
const toolRegistry = new ToolRegistry();
toolRegistry.register(new SwaggerParserTool());
toolRegistry.register(new BasicTypeGeneratorTool());
toolRegistry.register(new BasicAPIGeneratorTool());
toolRegistry.register(new FileWriterTool());

// 2. 创建 Agent（两种方式）
// 方式 1：分离 API Key 和配置
const agent = new ReActAgent(
  process.env.OPENAI_API_KEY!,
  toolRegistry,
  {
    model: "Qwen/Qwen2.5-72B-Instruct",
    baseURL: "https://api.siliconflow.cn/v1",
    maxIterations: 10,
    temperature: 0,
    verbose: true,
  }
);

// 方式 2：配置对象包含 API Key
const agent2 = new ReActAgent(
  {
    apiKey: process.env.OPENAI_API_KEY!,
    model: "Qwen/Qwen2.5-72B-Instruct",
    baseURL: "https://api.siliconflow.cn/v1",
    maxIterations: 10,
    temperature: 0,
    verbose: true,
  },
  toolRegistry
);

// 3. 运行查询（支持多轮对话）
const result1 = await agent.run("解析 examples/sample-swagger.json");
console.log(result1.answer); // 已成功解析...
console.log(result1.steps.length); // 推理步骤数
console.log(result1.totalTokens); // Token 使用量

// 第二轮对话 - Agent 会记住第一轮的内容
const result2 = await agent.run("根据刚才的解析结果生成 TypeScript 类型");
console.log(result2.answer); // 已生成类型定义...

// 管理对话历史
console.log(agent.getHistorySummary()); // "共 2 轮对话，4 条消息"
agent.clearHistory(); // 清除历史
const history = agent.getHistory(); // 获取完整历史数组
```

## 🛠️ 内置工具

项目采用**原子化工具设计**，每个工具只做一件事，Agent 可以灵活组合使用。

### 文档解析类
- **SwaggerParserTool** - 解析 Swagger 2.0 和 OpenAPI 3.x 文档
  - 提取 API 接口定义、数据模型
  - 支持标签和路径过滤
  - 自动验证文档格式

### 代码生成类
- **BasicTypeGeneratorTool** - 生成 TypeScript 类型定义
  - 支持 interface 和 type 两种风格
  - 自动生成注释和文档
  - 处理嵌套对象、数组、枚举等复杂类型
- **BasicAPIGeneratorTool** - 生成 API 请求函数
  - 支持 axios 和 fetch 两种 HTTP 客户端
  - 智能函数命名和参数处理
  - 完整的错误处理和类型安全

### 文件操作类
- **FileReaderTool** - 读取文件内容
- **FileWriterTool** - 写入文件（自动创建目录）
- **FileExistsTool** - 检查文件是否存在
- **FileSearchTool** - 搜索文件（支持 glob 模式）
- **DirectoryListTool** - 列出目录内容

### 快速开始

```bash
# 运行 API 代码生成示例
bun run example:api-codegen
```

### 使用示例

```typescript
// 自然语言驱动，Agent 自主决策
const agent = new ReActAgent(apiKey, toolRegistry, config);

await agent.run(
  "请帮我完成以下任务：\n" +
  "1. 解析 examples/sample-swagger.json 文档\n" +
  "2. 生成 TypeScript 类型定义（使用 interface，添加注释）\n" +
  "3. 生成 API 请求函数（使用 axios，添加错误处理）\n" +
  "4. 将类型定义保存到 generated/types.ts\n" +
  "5. 将 API 函数保存到 generated/api.ts"
);

// Agent 会自动：
// 1. 选择 swagger_parser 工具解析文档
// 2. 选择 basic_type_generator 工具生成类型
// 3. 选择 basic_api_generator 工具生成 API 函数
// 4. 选择 file_writer 工具保存文件
```

### 生成代码示例

**类型定义 (generated/types.ts):**

```typescript
/**
 * API 类型定义
 * 自动生成，请勿手动修改
 */

/**
 * 用户对象
 */
export interface User {
  /** 用户唯一标识 */
  id: string;
  /** 用户名 */
  username: string;
  /** 电子邮箱 */
  email: string;
  /** 用户头像 */
  avatar?: string;
  /** 用户角色 */
  role?: UserRole;
}

/**
 * 用户角色枚举
 */
export type UserRole = "admin" | "user" | "guest";
```

**API 函数 (generated/api.ts):**

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
});

/**
 * 获取用户详情
 * @param userId 用户ID
 */
export async function getUserById(userId: string | number): Promise<User> {
  try {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('API 请求失败:', error);
    throw error;
  }
}

/**
 * 创建新用户
 * @param userData 用户数据
 */
export async function createUser(userData: Partial<User>): Promise<User> {
  try {
    const response = await apiClient.post('/users', userData);
    return response.data;
  } catch (error) {
    console.error('API 请求失败:', error);
    throw error;
  }
}
```

### 核心优势

- ✅ **自然语言驱动** - 无需编写配置，直接描述需求
- ✅ **Agent 自主决策** - 自动选择工具和执行顺序
- ✅ **支持多种格式** - Swagger 2.0 和 OpenAPI 3.x
- ✅ **灵活的代码风格** - interface/type、axios/fetch 可选
- ✅ **完整的类型安全** - TypeScript 类型定义和验证
- ✅ **智能命名** - 根据 operationId 或路径生成函数名
- ✅ **详细注释** - 自动生成 JSDoc 注释
- ✅ **错误处理** - 完整的 try-catch 和错误提示

## 🔧 自定义工具

创建自定义工具非常简单，只需继承 `Tool` 基类并实现 `execute` 方法：

```typescript
import { z } from "zod";
import { Tool } from "./src/tools/base.ts";
import type { ToolResult } from "./src/agent/types.ts";

export class MyCustomTool extends Tool {
  // 工具名称（Agent 用于选择工具）
  name = "my_custom_tool";
  
  // 工具描述（Agent 用于理解工具功能）
  description = "这是我的自定义工具，用于处理特定任务";

  // 输入参数的 Zod Schema（用于验证和生成文档）
  schema = z.object({
    input: z.string().describe("输入参数说明"),
    options: z.object({
      verbose: z.boolean().optional().describe("是否显示详细信息"),
    }).optional(),
  });

  // 执行工具逻辑
  async execute(input: unknown): Promise<ToolResult> {
    try {
      // 1. 验证输入参数
      const parsed = this.schema.parse(input);
      
      // 2. 实现你的工具逻辑
      const result = `处理结果: ${parsed.input}`;

      // 3. 返回成功结果
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // 4. 返回错误信息
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// 注册工具到 Agent
const toolRegistry = new ToolRegistry();
toolRegistry.register(new MyCustomTool());
```

**工具设计原则：**
- **原子化** - 每个工具只做一件事
- **独立性** - 不依赖特定的执行顺序
- **可组合** - Agent 可以任意组合使用
- **类型安全** - 使用 Zod 进行运行时验证

## 📂 项目结构

```
ReAct-Agent/
├── src/
│   ├── agent/
│   │   ├── react-agent.ts         # ReAct Agent 核心实现
│   │   └── types.ts               # Agent 类型定义
│   ├── tools/
│   │   ├── base.ts                # Tool 基类和 ToolRegistry
│   │   ├── file-operations.ts    # 文件操作工具集
│   │   ├── swagger-parser.ts     # Swagger/OpenAPI 解析工具
│   │   ├── type-generator.ts     # TypeScript 类型生成工具
│   │   ├── api-generator.ts      # API 函数生成工具
│   │   ├── types.ts               # 工具相关类型定义
│   │   └── index.ts               # 工具统一导出
│   ├── prompts/
│   │   └── react-prompt.ts        # ReAct Prompt 模板
│   ├── services/                  # 服务层（可选）
│   └── index.ts                   # 库主入口
├── examples/
│   ├── api-code-gen-example.ts    # API 代码生成完整示例
│   └── sample-swagger.json        # 示例 Swagger 文档
├── tests/
│   ├── unit/                      # 单元测试
│   └── property/                  # 属性测试
├── index.ts                       # 交互式 CLI 程序
├── package.json                   # 项目配置和依赖
├── tsconfig.json                  # TypeScript 配置
├── bun.lock                       # Bun 依赖锁定
├── .env                           # 环境变量配置
├── API_CODE_GEN_PLAN.md          # 项目规划文档
└── README.md                      # 项目文档
```

## 🎯 ReAct 架构原理

ReAct (Reasoning and Acting) 是一种让 LLM 交替进行推理和行动的方法，通过思考-行动-观察的循环来解决复杂问题。

### 工作流程

1. **Thought（思考）** - Agent 分析当前问题，思考需要做什么
2. **Action（行动）** - 如果需要更多信息，选择并执行一个工具
3. **Observation（观察）** - 观察工具返回的结果
4. **循环迭代** - 基于观察结果继续思考，直到能给出最终答案

### 实际执行示例

```
用户问题: "解析 examples/sample-swagger.json 并生成 TypeScript 类型定义"

📍 迭代 1:
  💭 思考: 我需要先使用 swagger_parser 工具解析 Swagger 文档
  🔧 行动: swagger_parser
  📥 输入: {"filePath": "examples/sample-swagger.json"}
  👀 观察: 成功解析，找到 5 个接口和 3 个 schema 定义

📍 迭代 2:
  💭 思考: 现在我需要根据 schemas 生成 TypeScript 类型定义
  🔧 行动: basic_type_generator
  📥 输入: {"schemas": {...}, "options": {"useInterface": true, "addComments": true}}
  👀 观察: 成功生成类型定义代码，包含 3 个 interface

📍 迭代 3:
  💭 思考: 我已经完成了任务，可以给出最终答案
  ✅ 最终答案: 已成功解析 Swagger 文档并生成 TypeScript 类型定义，包含 3 个接口类型
```

### 核心优势

- **自主决策** - Agent 自己选择使用哪个工具、何时使用
- **灵活应对** - 根据观察结果动态调整策略
- **可解释性** - 每一步的思考过程都清晰可见
- **防止循环** - 智能检测重复操作，自动终止

ReAct (Reasoning and Acting) 是一种让 LLM 交替进行推理和行动的方法：

1. **Thought（思考）**：Agent 分析问题，思考需要做什么
2. **Action（行动）**：如果需要更多信息，选择并执行一个工具
3. **Observation（观察）**：观察工具返回的结果
4. **循环**：基于观察结果继续思考，直到能给出最终答案

### 示例执行流程

```
问题: "解析 examples/sample-swagger.json 并生成 TypeScript 类型定义"

迭代 1:
  💭 思考: 我需要先解析 Swagger 文档
  🔧 行动: swagger_parser
  📥 输入: {"filePath": "examples/sample-swagger.json"}
  👀 观察: 成功解析，找到 5 个接口和 3 个 schema

迭代 2:
  💭 思考: 现在我需要根据 schemas 生成 TypeScript 类型
  🔧 行动: basic_type_generator
  📥 输入: {"schemas": {...}}
  👀 观察: 成功生成类型定义代码

迭代 3:
  💭 思考: 我已经完成了任务
  ✅ 最终答案: 已成功解析 Swagger 文档并生成 TypeScript 类型定义
```

## 🧠 多轮对话与上下文管理

Agent 支持智能的多轮对话，能够记住之前的对话内容并在后续问题中引用。

### 核心特性

- **自动记忆** - 每次对话完成后，问题和答案自动保存到历史
- **上下文引用** - 可以引用之前的查询结果、工具输出等信息
- **智能压缩** - 当历史超过限制时，自动压缩早期对话为摘要
- **灵活管理** - 提供查看、清除历史的 API 方法

### 对话历史管理

```typescript
// 获取对话历史摘要
const summary = agent.getHistorySummary();
// 返回: "共 3 轮对话，6 条消息"

// 获取完整对话历史
const history = agent.getHistory();
// 返回: ConversationMessage[] 数组

// 清除对话历史（开始新话题）
agent.clearHistory();
```

### 实际应用示例

```typescript
// 第一轮：解析文档
const result1 = await agent.run("解析 examples/sample-swagger.json");
// 答案：已成功解析，找到 5 个接口和 3 个数据模型

// 第二轮：基于第一轮的结果生成类型（无需重复说明文档路径）
const result2 = await agent.run("根据刚才解析的结果生成 TypeScript 类型定义");
// 答案：已生成 3 个类型定义

// 第三轮：继续处理
const result3 = await agent.run("将类型定义保存到 generated/types.ts");
// 答案：已成功保存到文件

// 第四轮：引用之前的内容
const result4 = await agent.run("再生成对应的 API 函数");
// Agent 会记住之前解析的接口信息
```

### 历史压缩机制

当对话历史超过配置的最大轮数（默认 10 轮）时，Agent 会自动：
1. 保留最近 60% 的完整对话
2. 将早期 40% 的对话压缩为摘要
3. 确保上下文连贯性的同时节省 Token

## ⚙️ 配置选项

```typescript
interface AgentConfig {
  apiKey?: string;              // OpenAI API Key（可选，也可通过构造函数传入）
  model?: string;               // 模型名称，默认 ""（需要指定）
  baseURL?: string;             // API 端点，默认 undefined（使用 OpenAI 官方）
  maxIterations?: number;       // 最大推理迭代次数，默认 10
  temperature?: number;         // 温度参数（0-2），默认 0（更确定性）
  verbose?: boolean;            // 是否显示详细日志，默认 false
  maxHistoryRounds?: number;    // 最大历史轮数，默认 10（超出自动压缩）
}
```

### 配置说明

- **apiKey** - API 密钥，可以通过构造函数参数或配置对象传入
- **model** - 模型名称，如 `Qwen/Qwen2.5-72B-Instruct`、`gpt-4` 等
- **baseURL** - 自定义 API 端点，用于兼容 OpenAI API 的服务（如 SiliconFlow）
- **maxIterations** - Agent 最多执行多少轮推理，防止无限循环
- **temperature** - 控制输出随机性，0 表示最确定，2 表示最随机
- **verbose** - 开启后会显示详细的推理过程、工具调用等日志
- **maxHistoryRounds** - 对话历史保留的最大轮数，超出后自动压缩