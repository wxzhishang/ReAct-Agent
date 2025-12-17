import { z } from "zod";
import { Tool } from "./base.ts";
import type { ToolResult } from "../agent/types.ts";

/**
 * 搜索工具（支持真实 API）
 * 
 * 支持的搜索引擎：
 * 1. Serper API (推荐) - 需要 SERPER_API_KEY
 * 2. 内置知识库（fallback）
 * 
 */
export class SearchTool extends Tool {
  name = "search";
  description = "在互联网上搜索信息。用于查找实时信息、事实、新闻等。如果配置了 SERPER_API_KEY，将使用真实的搜索引擎";

  schema = z.object({
    query: z.string().describe("搜索查询关键词"),
  });

  private serperApiKey?: string;

  constructor() {
    super();
    this.serperApiKey = process.env.SERPER_API_KEY;
  }

  async execute(input: any): Promise<ToolResult> {
    try {
      // 容错处理：如果输入是字符串，自动包装成对象
      const normalizedInput = typeof input === 'string' ? { query: input } : input;
      
      const parsed = this.schema.parse(normalizedInput);
      const { query } = parsed;

      // 如果配置了 Serper API Key，使用真实搜索
      if (this.serperApiKey) {
        return await this.searchWithSerper(query);
      }

      // 否则使用内置知识库（fallback）
      return await this.searchWithKnowledgeBase(query);
    } catch (error) {
      return {
        success: false,
        error: `搜索失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 使用 Serper API 进行真实搜索
   */
  private async searchWithSerper(query: string): Promise<ToolResult> {
    try {
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": this.serperApiKey!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: query,
          num: 3, // 返回前3个结果
        }),
      });

      if (!response.ok) {
        throw new Error(`Serper API 错误: ${response.status}`);
      }

      const data = await response.json();

      // 提取搜索结果
      const results = (data as any).organic || [];
      if (results.length === 0) {
        return {
          success: true,
          data: `未找到关于"${query}"的搜索结果`,
        };
      }

      // 格式化搜索结果
      const formattedResults = results
        .slice(0, 3)
        .map((result: any, index: number) => {
          return `${index + 1}. ${result.title}\n   ${result.snippet}`;
        })
        .join("\n\n");

      return {
        success: true,
        data: `搜索"${query}"的结果:\n\n${formattedResults}`,
      };
    } catch (error) {
      // 如果 API 调用失败，回退到知识库
      return await this.searchWithKnowledgeBase(query);
    }
  }

  /**
   * 使用内置知识库搜索（fallback）
   */
  private async searchWithKnowledgeBase(query: string): Promise<ToolResult> {
    // 内置知识库
    const knowledgeBase: Record<string, string> = {
      "埃菲尔铁塔": "埃菲尔铁塔位于法国巴黎，高324米，建于1889年，是为了纪念法国大革命100周年而建造的。它是巴黎的标志性建筑，每年吸引数百万游客。",
      "长城": "中国长城是世界上最长的防御工事，总长度超过21,000公里，主要建于明朝时期（1368-1644年）。它是中国古代的军事防御工程，也是世界七大奇迹之一。",
      "泰姬陵": "泰姬陵位于印度阿格拉，是莫卧儿皇帝沙贾汗为纪念他的妻子而建造的白色大理石陵墓，建于1632-1653年。它被认为是印度穆斯林建筑的杰作。",
      "人工智能": "人工智能（AI）是计算机科学的一个分支，致力于创建能够执行通常需要人类智能的任务的系统，如视觉感知、语音识别、决策和语言翻译等。",
      "机器学习": "机器学习是人工智能的一个子领域，使计算机系统能够从数据中学习和改进，而无需显式编程。常见类型包括监督学习、无监督学习和强化学习。",
      "北京": "北京是中国的首都，位于中国北部，是中国的政治、文化和国际交往中心，人口超过2100万。主要景点包括故宫、长城、天安门等。",
      "上海": "上海是中国最大的城市之一，是重要的经济、金融和贸易中心，人口超过2400万。它是中国的经济中心，也是国际大都市。",
    };

    // 搜索知识库
    for (const [key, value] of Object.entries(knowledgeBase)) {
      if (query.includes(key) || key.includes(query)) {
        return {
          success: true,
          data: value,
        };
      }
    }

    // 未找到
    return {
      success: true,
      data: `关于"${query}"的信息：内置知识库中未找到相关信息。建议配置 SERPER_API_KEY 以使用真实搜索引擎。`,
    };
  }
}

