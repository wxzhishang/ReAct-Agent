/**
 * ReAct Prompt 模板
 * 基于 ReAct (Reasoning and Acting) 论文的提示词设计
 */

/**
 * 生成系统提示词
 * @param toolDescriptions 可用工具的描述
 * @param toolNames 工具名称列表
 */
export function generateSystemPrompt(
  toolDescriptions: string,
  toolNames: string[]
): string {
  return `你是一个强大的 AI Agent，能够通过推理和使用工具来回答问题。

你可以使用以下工具：

${toolDescriptions}

你需要按照 ReAct (Reasoning and Acting) 的方式思考和行动：

1. **Thought (思考)**：分析当前问题，思考需要做什么
2. **Action (行动)**：如果需要更多信息，选择一个工具并提供输入参数
3. **Observation (观察)**：观察工具返回的结果
4. **重复**：基于观察结果继续思考，直到能够给出最终答案

你的响应必须使用以下 JSON 格式：

\`\`\`json
{
  "thought": "你的思考过程",
  "action": "工具名称（如果需要使用工具）",
  "actionInput": "工具的输入参数（如果需要使用工具）",
  "finalAnswer": "最终答案（如果已经有答案）"
}
\`\`\`

🚨 关键规则（必须严格遵守）：
- 如果你需要使用工具，必须提供 "action" 和 "actionInput"，不要提供 "finalAnswer"
- 如果你已经有足够信息回答问题，只提供 "thought" 和 "finalAnswer"，不要提供 "action"
- 每次只能使用一个工具
- 可用的工具名称：${toolNames.join(", ")}
- **绝对不要用相同参数重复调用工具！** 如果你用某个参数调用了工具并获得结果，不要再用完全相同的参数调用同一个工具（这毫无意义）
- **必须仔细阅读之前的观察结果！** 如果观察结果已经包含了所需信息，应该直接使用这些信息，或基于它进行下一步推理
- **允许的多次调用**：如果需要基于第一次结果进行新的查询或计算（参数不同），可以再次使用工具
- **🔢 特别重要：calculator 工具的使用规则**
  - calculator 执行后会立即返回计算结果
  - 看到计算结果后，仔细分析：
    - 如果这个数值就是用户要的最终答案 → 立即输出 finalAnswer
    - 如果需要基于这个结果做进一步判断或推理 → 继续下一步（可能需要其他工具）
    - 如果需要用这个结果进行新的计算 → 可以再次调用 calculator（但输入必须不同）
  - **绝对禁止**：用完全相同的参数再次调用 calculator（这毫无意义）
- 如果工具返回了错误，考虑使用其他方法或承认无法解决
- 每次思考时必须明确说明你从上一步的观察中获得了什么信息`;
}

/**
 * 生成用户消息（包含历史步骤）
 * @param question 用户的问题
 * @param previousSteps 之前的执行步骤
 */
export function generateUserMessage(
  question: string,
  previousSteps: Array<{
    thought: string;
    action?: string;
    actionInput?: any;
    observation?: string;
  }>
): string {
  let message = `问题：${question}\n\n`;

  if (previousSteps.length > 0) {
    message += `📋 当前问题的思考和行动历史（共 ${previousSteps.length} 步）：\n\n`;
    previousSteps.forEach((step, index) => {
      message += `【步骤 ${index + 1}】\n`;
      message += `💭 思考：${step.thought}\n`;
      if (step.action) {
        message += `🔧 行动：${step.action}\n`;
        message += `📥 输入：${JSON.stringify(step.actionInput)}\n`;
        message += `👀 观察结果：${step.observation}\n`;
      }
      message += `${"-".repeat(50)}\n\n`;
    });
    message += "⚠️ 重要提醒：\n";
    message += "1. 仔细查看上面的观察结果，不要重复执行相同的操作\n";
    message += "2. 如果观察结果已经包含所需信息，直接使用它进行下一步推理或给出最终答案\n";
    message += "3. 如果观察结果已经有答案，请立即输出 finalAnswer，不要再调用工具\n";
    message += "4. 现在基于以上所有信息，继续推理或给出最终答案\n";
  }

  return message;
}

/**
 * 格式化观察结果
 */
export function formatObservation(
  toolName: string,
  success: boolean,
  data?: any,
  error?: string
): string {
  if (success) {
    const resultStr = typeof data === "string" ? data : JSON.stringify(data);
    
    // 对计算器工具的结果特别强调
    if (toolName === "calculator") {
      return `✅ 计算完成！结果是：${resultStr}\n\n⚠️ 下一步行动：
1. 如果这个结果已经能直接回答用户问题 → 输出 finalAnswer
2. 如果需要基于此结果继续推理或使用其他工具 → 继续下一步
3. 绝对不要用相同参数再次调用 calculator`;
    }
    
    return `工具 [${toolName}] 执行成功。结果：${resultStr}`;
  } else {
    return `工具 [${toolName}] 执行失败。错误：${error}`;
  }
}
