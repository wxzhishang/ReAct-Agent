import { z } from "zod";

/**
 * Tool 执行结果
 */
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Agent 思考步骤
 */
export interface Step {
  thought: string;    // 思考过程
  action?: string;    // 要执行的动作（工具名称）
  actionInput?: any;  // 动作的输入参数
  observation?: string; // 观察结果
}

/**
 * Agent 执行结果
 */
export interface AgentResult {
  answer: string;     // 最终答案
  steps: Step[];      // 执行步骤
  totalTokens?: number; // 消耗的 token 数
}

/**
 * Agent 配置
 */
export interface AgentConfig {
  model?: string;           // 使用的模型，默认 gpt-4o-mini
  maxIterations?: number;   // 最大迭代次数，默认 10
  temperature?: number;     // 温度参数，默认 0
  verbose?: boolean;        // 是否输出详细日志，默认 false
  baseURL?: string;         // OpenAI API 的 base URL，用于自定义 API 端点
  apiKey?: string;          // API Key（可选，如果不在构造函数中传入）
  maxHistoryRounds?: number; // 最大历史对话轮数，默认 10（超出后自动摘要压缩）
  projectStructure?: string; // 项目文件结构，帮助 agent 自动选择正确的文件路径
}

/**
 * LLM 响应格式的 Zod Schema
 */
export const ThoughtActionSchema = z.object({
  thought: z.string().describe("对当前问题的思考和推理过程"),
  action: z.string().optional().nullable().describe("要使用的工具名称，如果已有答案则不需要"),
  actionInput: z.any().optional().nullable().describe("工具的输入参数"),
  // finalAnswer 可以是字符串或数字（某些模型会直接返回数字）
  finalAnswer: z.union([z.string(), z.number()]).optional().nullable().describe("如果能直接回答问题，则提供最终答案"),
});

export type ThoughtAction = z.infer<typeof ThoughtActionSchema>;

