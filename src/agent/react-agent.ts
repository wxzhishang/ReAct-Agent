import OpenAI from "openai";
import { consola } from "consola";
import type { AgentConfig, AgentResult, Step, ThoughtAction } from "./types.ts";
import { ThoughtActionSchema } from "./types.ts";
import { ToolRegistry } from "../tools/base.ts";
import {
  generateSystemPrompt,
  generateUserMessage,
  formatObservation,
} from "../prompts/react-prompt.ts";

/**
 * 对话历史消息
 */
interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * ReAct Agent 核心类
 * 实现基于 ReAct 架构的推理和行动循环
 */
export class ReActAgent {
  private openai: OpenAI;
  private toolRegistry: ToolRegistry;
  private config: {
    model: string;
    maxIterations: number;
    temperature: number;
    verbose: boolean;
    baseURL?: string;
    maxHistoryRounds: number;
  };
  private conversationHistory: ConversationMessage[] = []; // 对话历史

  constructor(
    apiKeyOrConfig: string | AgentConfig,
    toolRegistry: ToolRegistry,
    config: AgentConfig = {}
  ) {
    // 支持两种调用方式：
    // 1. new ReActAgent(apiKey, registry, config)
    // 2. new ReActAgent(config, registry) - apiKey 在 config 中
    let finalApiKey: string;
    let finalConfig: AgentConfig;

    if (typeof apiKeyOrConfig === "string") {
      // 第一种方式：传入 apiKey
      finalApiKey = apiKeyOrConfig;
      finalConfig = config;
    } else {
      // 第二种方式：apiKey 在 config 中
      finalConfig = apiKeyOrConfig;
      finalApiKey = finalConfig.apiKey || "";
      
      if (!finalApiKey) {
        throw new Error("必须提供 apiKey，可以通过构造函数参数或 config.apiKey 传入");
      }
    }

    // 初始化 OpenAI 客户端
    const openaiConfig: any = { apiKey: finalApiKey };
    
    // 如果提供了 baseURL，则使用自定义端点
    if (finalConfig.baseURL) {
      openaiConfig.baseURL = finalConfig.baseURL;
    }
    
    this.openai = new OpenAI(openaiConfig);

    // 初始化工具注册表
    this.toolRegistry = toolRegistry;

    // 合并配置
    this.config = {
      model: finalConfig.model || "",
      maxIterations: finalConfig.maxIterations || 10,
      temperature: finalConfig.temperature || 0,
      verbose: finalConfig.verbose || false,
      baseURL: finalConfig.baseURL,
      maxHistoryRounds: finalConfig.maxHistoryRounds || 10,
    };

    if (this.config.verbose) {
      consola.info("ReAct Agent 初始化完成");
      consola.info(`模型: ${this.config.model}`);
      if (this.config.baseURL) {
        consola.info(`API 端点: ${this.config.baseURL}`);
      }
      consola.info(`最大迭代次数: ${this.config.maxIterations}`);
      consola.info(`历史记录限制: ${this.config.maxHistoryRounds} 轮（超出自动压缩）`);
      consola.info(
        `可用工具: ${this.toolRegistry.getNames().join(", ")}`
      );
    }
  }

  /**
   * 执行 Agent 推理
   * @param question 用户问题
   * @returns Agent 执行结果
   */
  async run(question: string): Promise<AgentResult> {
    const steps: Step[] = [];
    let totalTokens = 0;

    if (this.config.verbose) {
      consola.box(`\n🎯 问题: ${question}\n`);
    }

    // ReAct 循环
    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      if (this.config.verbose) {
        consola.info(`\n📍 迭代 ${iteration + 1}/${this.config.maxIterations}`);
      }

      try {
        // 调试：显示当前 steps 状态
        if (this.config.verbose) {
          if (steps.length > 0) {
            const lastObs = steps[steps.length - 1]?.observation;
            consola.debug(`🔍 当前已有 ${steps.length} 个步骤，最后一步的观察：${lastObs ? lastObs.substring(0, 60) : '无'}`);
          } else {
            consola.debug(`🔍 当前无历史步骤`);
          }
        }

        // 1. 调用 LLM 获取思考和行动
        const response = await this.callLLM(question, steps);
        totalTokens += response.usage?.total_tokens || 0;

        // 2. 解析 LLM 响应
        const thoughtAction = this.parseResponse(response);

        if (this.config.verbose) {
          consola.start(`💭 思考: ${thoughtAction.thought}`);
        }

        // 3. 检查是否有最终答案
        if (thoughtAction.finalAnswer) {
          // finalAnswer 已在 parseResponse 中转换为 string
          const finalAnswer = String(thoughtAction.finalAnswer);
          
          if (this.config.verbose) {
            consola.success(`\n✅ 最终答案: ${finalAnswer}\n`);
          }

          steps.push({
            thought: thoughtAction.thought,
          });

          // 保存当前对话到历史
          this.saveConversation(question, finalAnswer, steps);

          return {
            answer: finalAnswer,
            steps,
            totalTokens,
          };
        }

        // 4. 执行工具
        if (thoughtAction.action) {
          // 检测重复操作：如果连续2次执行相同的 action 和 actionInput
          if (steps.length >= 2) {
            const lastStep = steps[steps.length - 1];
            const secondLastStep = steps[steps.length - 2];
            
            if (
              lastStep &&
              secondLastStep &&
              lastStep.action === thoughtAction.action &&
              secondLastStep.action === thoughtAction.action &&
              JSON.stringify(lastStep.actionInput) === JSON.stringify(thoughtAction.actionInput) &&
              JSON.stringify(secondLastStep.actionInput) === JSON.stringify(thoughtAction.actionInput)
            ) {
              consola.warn("⚠️  检测到重复执行相同操作，强制停止");
              const answer = `检测到重复操作循环。已执行 ${steps.length} 步，但 AI 一直重复相同的操作。最后的观察结果是：${lastStep.observation || "无"}。请尝试更具体的问题或使用不同的模型。`;
              
              // 保存对话历史（即使是错误结果）
              this.saveConversation(question, answer, steps);
              
              return {
                answer,
                steps,
                totalTokens,
              };
            }
          }

          const observation = await this.executeTool(
            thoughtAction.action,
            thoughtAction.actionInput
          );

          if (this.config.verbose) {
            consola.info(`🔧 行动: ${thoughtAction.action}`);
            consola.info(
              `📥 输入: ${JSON.stringify(thoughtAction.actionInput)}`
            );
            consola.info(`👀 观察: ${observation}`);
          }

          steps.push({
            thought: thoughtAction.thought,
            action: thoughtAction.action,
            actionInput: thoughtAction.actionInput,
            observation,
          });

          // 调试：确认步骤已保存
          if (this.config.verbose) {
            consola.debug(`✅ 步骤已保存到 steps 数组，当前总数：${steps.length}`);
          }
        } else {
          // 没有 action 也没有 finalAnswer，说明出错了
          throw new Error("LLM 响应中既没有 action 也没有 finalAnswer");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        consola.error(`执行出错: ${errorMessage}`);

        const answer = `抱歉，执行过程中出现错误: ${errorMessage}`;
        
        // 保存对话历史（即使是错误结果）
        this.saveConversation(question, answer, steps);

        return {
          answer,
          steps,
          totalTokens,
        };
      }
    }

    // 达到最大迭代次数
    if (this.config.verbose) {
      consola.warn("\n⚠️  已达到最大迭代次数");
    }

    const answer = "抱歉，我无法在规定的步骤内完成推理。请尝试简化问题或增加最大迭代次数。";
    
    // 保存对话历史（即使未完成）
    this.saveConversation(question, answer, steps);

    return {
      answer,
      steps,
      totalTokens,
    };
  }

  /**
   * 调用 LLM
   */
  private async callLLM(
    question: string,
    steps: Step[]
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    const systemPrompt = generateSystemPrompt(
      this.toolRegistry.getDescriptions(),
      this.toolRegistry.getNames()
    );

    const userMessage = generateUserMessage(question, steps);

    // 构建消息列表：系统提示 + 历史对话 + 当前问题
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...this.conversationHistory, // 添加历史对话
      { role: "user", content: userMessage },
    ];

    // 调试信息：显示当前步骤数
    if (this.config.verbose && steps.length > 0) {
      consola.debug(`📝 当前迭代包含 ${steps.length} 个历史步骤`);
      steps.forEach((step, idx) => {
        if (step.observation) {
          consola.debug(`  步骤 ${idx + 1}: ${step.action} → ${step.observation.substring(0, 50)}...`);
        }
      });
    }

    const completion = await this.openai.chat.completions.create({
      model: this.config.model,
      temperature: this.config.temperature,
      messages,
      response_format: { type: "json_object" },
    });

    return completion;
  }

  /**
   * 解析 LLM 响应
   */
  private parseResponse(
    response: OpenAI.Chat.Completions.ChatCompletion
  ): ThoughtAction {
    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("LLM 返回空响应");
    }

    try {
      const parsed = JSON.parse(content);
      const validated = ThoughtActionSchema.parse(parsed);
      
      // 将 null 值转换为 undefined，同时处理 finalAnswer 的类型转换
      return {
        thought: validated.thought,
        action: validated.action ?? undefined,
        actionInput: validated.actionInput ?? undefined,
        // 如果 finalAnswer 是数字，转换为字符串
        finalAnswer: validated.finalAnswer != null 
          ? String(validated.finalAnswer) 
          : undefined,
      };
    } catch (error) {
      consola.error("解析 LLM 响应失败:", content);
      throw new Error(
        `解析 LLM 响应失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 保存对话到历史
   */
  private saveConversation(
    question: string,
    answer: string,
    steps: Step[]
  ): void {
    // 构建用户消息（问题）
    this.conversationHistory.push({
      role: "user",
      content: question,
    });

    // 构建助手消息（包含推理过程和答案）
    let assistantMessage = "";
    
    // 如果有推理步骤，简要记录
    if (steps.length > 0) {
      assistantMessage += "推理过程：\n";
      steps.forEach((step, index) => {
        if (step.action && step.observation) {
          assistantMessage += `- 步骤${index + 1}: 使用 ${step.action} 工具，获得：${step.observation}\n`;
        }
      });
      assistantMessage += "\n";
    }
    
    assistantMessage += `答案：${answer}`;

    this.conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });

    if (this.config.verbose) {
      consola.info(`💾 已保存对话历史（共 ${this.conversationHistory.length} 条消息）`);
    }

    // 检查是否需要压缩历史
    this.compressHistoryIfNeeded();
  }

  /**
   * 压缩历史对话（如果超过最大轮数）
   */
  private compressHistoryIfNeeded(): void {
    const maxMessages = this.config.maxHistoryRounds * 2; // 每轮2条消息（user + assistant）
    
    if (this.conversationHistory.length <= maxMessages) {
      return; // 没有超出限制，不需要压缩
    }

    // 计算需要压缩的消息数量（保留最近的 60% 完整对话，压缩早期的 40%）
    const keepRecentMessages = Math.floor(maxMessages * 0.6);
    const compressCount = this.conversationHistory.length - keepRecentMessages;

    // 确保压缩的是偶数条消息（成对的 user+assistant）
    const compressRounds = Math.floor(compressCount / 2);
    const messagesToCompress = compressRounds * 2;

    if (messagesToCompress < 2) {
      return; // 没有足够的消息可以压缩
    }

    if (this.config.verbose) {
      consola.info(`🗜️  对话历史超过 ${this.config.maxHistoryRounds} 轮，开始压缩...`);
    }

    // 提取要压缩的消息
    const toCompress = this.conversationHistory.slice(0, messagesToCompress);
    const toKeep = this.conversationHistory.slice(messagesToCompress);

    // 生成摘要
    const summary = this.generateHistorySummary(toCompress, compressRounds);

    // 用摘要替换原始消息
    this.conversationHistory = [
      {
        role: "assistant",
        content: summary,
      },
      ...toKeep,
    ];

    if (this.config.verbose) {
      consola.success(
        `✅ 已压缩 ${compressRounds} 轮对话（${messagesToCompress} 条消息）为摘要，` +
        `保留 ${toKeep.length} 条最近消息`
      );
    }
  }

  /**
   * 生成历史对话摘要
   */
  private generateHistorySummary(
    messages: ConversationMessage[],
    rounds: number
  ): string {
    let summary = `📝 早期对话摘要（已压缩 ${rounds} 轮对话）：\n\n`;

    // 按对提取 Q&A
    for (let i = 0; i < messages.length; i += 2) {
      const userMsg = messages[i];
      const assistantMsg = messages[i + 1];

      if (userMsg && assistantMsg) {
        const roundNum = Math.floor(i / 2) + 1;
        
        // 提取问题（限制长度）
        const question = userMsg.content.length > 80 
          ? userMsg.content.substring(0, 80) + "..." 
          : userMsg.content;

        // 提取答案的关键信息（只保留"答案："后的部分，限制长度）
        const answerContent = assistantMsg.content;
        let answer = answerContent;
        
        // 尝试提取"答案："后的内容
        const answerMatch = answerContent.match(/答案[：:]\s*(.+)/s);
        if (answerMatch && answerMatch[1]) {
          answer = answerMatch[1].trim();
        }
        
        // 限制答案长度
        if (answer.length > 100) {
          answer = answer.substring(0, 100) + "...";
        }

        summary += `第 ${roundNum} 轮 - Q: ${question}\n         A: ${answer}\n\n`;
      }
    }

    summary += `💡 提示：以上是早期对话的简化摘要，如需引用这些内容，请基于摘要信息推理。`;

    return summary;
  }

  /**
   * 清除对话历史
   */
  public clearHistory(): void {
    this.conversationHistory = [];
    if (this.config.verbose) {
      consola.info("🗑️  对话历史已清除");
    }
  }

  /**
   * 获取对话历史
   */
  public getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * 获取对话历史摘要
   */
  public getHistorySummary(): string {
    if (this.conversationHistory.length === 0) {
      return "暂无对话历史";
    }

    const pairs = this.conversationHistory.length / 2;
    return `共 ${pairs} 轮对话，${this.conversationHistory.length} 条消息`;
  }

  /**
   * 执行工具
   */
  private async executeTool(
    toolName: string,
    toolInput: any
  ): Promise<string> {
    const tool = this.toolRegistry.get(toolName);

    if (!tool) {
      return formatObservation(
        toolName,
        false,
        undefined,
        `工具 "${toolName}" 不存在。可用工具：${this.toolRegistry.getNames().join(", ")}`
      );
    }

    try {
      const result = await tool.execute(toolInput);
      return formatObservation(
        toolName,
        result.success,
        result.data,
        result.error
      );
    } catch (error) {
      return formatObservation(
        toolName,
        false,
        undefined,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}

