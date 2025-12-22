# AI 驱动接口文档转代码 - 完整方案

## 🎯 核心理念

### Agent 思想 vs Workflow 思想

**Workflow（工作流）**：固定步骤、预定义流程、适合标准化任务
```
用户输入 → 步骤1 → 步骤2 → 步骤3 → 输出
```

**Agent（智能代理）**：自主决策、动态选择工具、根据观察调整策略
```
用户输入 → [思考] → 选择工具 → 观察结果 → [再思考] → 继续行动 → ...
```

**本方案采用 Agent 模式**，让 AI 自主决策如何完成任务。

---

## ⭐ 核心改进点

基于对 Pont 等传统工具的改进：

### 1. 规范优先策略
- **自动扫描项目代码**，提取真实的代码风格和规范
- **生成策略优先级**：
  1. 项目规范（如果扫描到） → 使用项目风格
  2. 自定义模板（如果提供） → 使用用户模板
  3. 内置最佳实践（默认） → 使用标准模板

### 2. 工具化 Diff（非 AI）
- 使用 **算法精确对比**代码差异（Myers Diff / LCS）
- 比 AI 推断更**精确、快速、便宜、可靠**
- 输出结构化的差异报告

### 3. 智能代码合并
- 保留用户自定义的业务逻辑
- 只更新接口相关的部分
- 自动检测并标记冲突

---

## 🏗️ 工具架构设计

### 工具设计原则
- **原子化**：每个工具只做一件事
- **独立**：不依赖特定的执行顺序
- **可组合**：Agent 可以任意组合使用

### 工具分类

#### 📁 文件操作类
- `FileSearchTool` - 搜索文件
- `FileReaderTool` - 读取文件内容
- `FileWriterTool` - 写入文件
- `DirectoryListTool` - 列出目录
- `FileExistsTool` - 检查文件存在

#### 📄 文档解析类
- `SwaggerParserTool` - 解析 Swagger/OpenAPI
- `PostmanParserTool` - 解析 Postman Collection
- `YAPIParserTool` - 解析 YAPI 导出

#### 🔍 项目分析类（核心创新）
- `ProjectScannerTool` ⭐ - 扫描项目代码规范
- `StyleExtractorTool` - 提取代码风格
- `TemplateDetectorTool` - 检测自定义模板

#### ⚙️ 代码生成类
- `SmartTypeGeneratorTool` ⭐ - 智能生成类型定义（规范感知）
- `SmartAPIGeneratorTool` ⭐ - 智能生成 API 代码（规范感知）
- `MockGeneratorTool` - 生成 Mock 数据

#### 🔬 代码分析类
- `DiffTool` ⭐ - 精确对比代码差异（算法实现，非 AI）
- `CodeAnalyzerTool` - 分析代码结构
- `ASTParserTool` - 解析抽象语法树

#### 🔧 代码处理类
- `CodeMergerTool` ⭐ - 智能合并代码
- `ConflictResolverTool` - 处理合并冲突
- `CodeFormatterTool` - 格式化代码（Prettier）
- `CodeLinterTool` - 检查代码（ESLint）

#### 🤖 AI 增强类（适合用 AI 的场景）
- `CodeOptimizerTool` - AI 优化代码
- `CodeReviewerTool` - AI 代码审查
- `CommentGeneratorTool` - AI 生成注释

#### 🧪 测试与文档类
- `TestGeneratorTool` - 生成单元测试
- `DocGeneratorTool` - 生成 API 文档

---

## 📅 实现迭代计划

### 阶段一：MVP - 基础生成能力

**目标**：Agent 能够解析接口文档并生成基础代码

**Week 1：核心基础（P0）**
- ✅ `SwaggerParserTool` - 解析 Swagger/OpenAPI 文档
- ✅ `FileReaderTool` - 读取文件内容
- ✅ `BasicTypeGeneratorTool` - 生成基础类型定义
- ✅ `BasicAPIGeneratorTool` - 生成基础 API 代码
- ✅ `FileWriterTool` - 写入文件

**Week 2：文件操作增强（P1）**
- ✅ `FileSearchTool` - 搜索项目文件
- ✅ `DirectoryListTool` - 列出目录
- ✅ `FileExistsTool` - 检查文件存在

**验收标准**：
- ✅ 自然语言描述需求，Agent 自动生成代码
- ✅ Agent 能自主查找接口文档文件

**示例场景**：
```
用户："解析 docs/swagger.json，生成用户登录接口的代码"
Agent：自动完成解析 → 生成类型 → 生成代码 → 写入文件
```

---

### 阶段二：规范感知

**目标**：生成的代码自动适配项目现有代码风格

**Week 3：项目扫描核心（P0）**
- ✅ `ProjectScannerTool` ⭐ - 扫描项目代码规范
  - 识别 HTTP 库（axios/fetch/自定义）
  - 识别错误处理模式（try-catch/promise）
  - 识别类型定义风格（interface/type）
  - 识别命名规范（I-prefix/suffix-pattern）
  - 提取真实代码示例

**Week 4：智能生成器（P0）**
- ✅ `SmartTypeGeneratorTool` ⭐ - 替代基础版，支持规范感知
- ✅ `SmartAPIGeneratorTool` ⭐ - 替代基础版，支持规范感知

**核心特性**：
```typescript
生成策略（优先级）：
1. 有 projectAnalysis → 使用项目规范 ⭐
2. 有 customTemplate → 使用自定义模板
3. 否则 → 使用内置最佳实践
```

**验收标准**：
- ✅ 不同项目生成不同风格的代码
- ✅ 生成的代码与项目现有代码风格一致

**示例场景**：
```
场景 1：项目使用 fetch
用户："生成 API 代码"
Agent：扫描 → 发现项目用 fetch → 生成 fetch 风格代码 ✅

场景 2：新项目无明显规范
用户："生成 API 代码"
Agent：扫描 → 无明显规范 → 使用内置最佳实践（axios）✅
```

---

### 阶段三：智能更新

**目标**：支持接口更新场景，智能合并代码

**Week 5：代码对比工具（P0）**
- ✅ `DiffTool` ⭐ - 精确对比代码差异
  - 基于 Myers Diff 算法或 LCS
  - 逐行精确对比
  - 输出结构化差异报告
  - **工具化实现，非 AI**（更精确、快速、便宜）

**Week 6：智能合并（P0-P1）**
- ✅ `CodeMergerTool` ⭐ - 智能合并代码变更
  - 保留用户自定义的业务逻辑
  - 更新接口相关的部分
  - 检测并标记冲突
- ✅ `ConflictResolverTool` - 处理合并冲突

**合并策略**：
```typescript
合并规则：
1. 完全新增的函数 → 直接添加
2. 接口定义变化 → 更新
3. 用户自定义的业务逻辑 → 保留 ⭐
4. 两者都修改的部分 → 标记为冲突
```

**验收标准**：
- ✅ 精确对比新旧代码差异
- ✅ 更新时保留用户自定义部分
- ✅ 自动处理冲突并生成报告

**示例场景**：
```
用户："接口文档更新了，同步更新代码"
Agent：
1. 解析新文档
2. 读取旧代码
3. 生成新代码
4. Diff 对比（工具化）
5. 智能合并：
   - 保留用户添加的 console.log ✅
   - 保留用户修改的错误处理 ✅
   - 更新接口参数定义 ✅
   - 添加新增的接口函数 ✅
```

---

### 阶段四：生态完善

**目标**：添加 AI 增强、测试、文档等周边功能

**Week 7：AI 增强功能（P1）**
- ✅ `CodeOptimizerTool` - AI 优化代码
- ✅ `CodeReviewerTool` - AI 代码审查
- ✅ `CommentGeneratorTool` - AI 生成注释

**Week 8：测试与文档（P1-P2）**
- ✅ `TestGeneratorTool` - 生成单元测试
- ✅ `DocGeneratorTool` - 生成 API 文档
- ✅ `MockGeneratorTool` - 生成 Mock 数据

**验收标准**：
- ✅ 生成高质量、带注释的代码
- ✅ 自动生成测试用例和文档
- ✅ 完整的代码生成生态

---

## 🎬 典型使用场景

### 场景 1：首次生成（从零开始）

```
用户："根据 swagger.json 生成用户模块的 API 代码"

Agent 执行流程：
💭 "需要找到接口文档"
🔧 file_search → 找到 docs/swagger.json
💭 "解析文档"
🔧 swagger_parser → 获取 5 个接口
💭 "看看项目有没有代码规范"
🔧 project_scanner → 发现项目使用 axios + interface
💭 "按项目规范生成"
🔧 smart_api_generator → 生成符合项目风格的代码
🔧 file_writer → 写入文件
✅ 完成！
```

### 场景 2：接口更新

```
用户："接口文档更新了，同步更新代码"

Agent 执行流程：
💭 "解析新文档"
🔧 swagger_parser → 获取最新接口
💭 "读取旧代码"
🔧 file_reader → 读取现有代码
💭 "生成新代码"
🔧 smart_api_generator → 生成新版本代码
💭 "对比差异"
🔧 diff_tool → 发现新增 2 个接口，修改 1 个参数
💭 "智能合并"
🔧 code_merger → 保留用户自定义部分，更新接口定义
🔧 file_writer → 写入更新后的代码
✅ 完成！保留了你的自定义逻辑
```

### 场景 3：自适应不同项目

```
项目 A（使用 fetch）：
用户："生成 API 代码"
→ Agent 扫描 → 检测到 fetch → 生成 fetch 风格代码

项目 B（使用 axios）：
用户："生成 API 代码"
→ Agent 扫描 → 检测到 axios → 生成 axios 风格代码

新项目 C（无规范）：
用户："生成 API 代码"
→ Agent 扫描 → 无明显规范 → 使用内置最佳实践
```

---

## 🔑 关键优势

### 相比传统工具（如 Pont）

| 特性 | Pont | 本方案 |
|------|------|--------|
| 代码生成 | ✅ 模板化 | ✅ 智能化 + 规范感知 |
| 风格适配 | ❌ 固定模板 | ✅ 自动扫描项目规范 ⭐ |
| 代码更新 | ⚠️ 覆盖式 | ✅ 精确 Diff + 智能合并 ⭐ |
| 自定义模板 | ✅ 支持 | ✅ 支持 + 自动检测 |
| AI 优化 | ❌ 无 | ✅ AI 优化和审查 |
| 冲突处理 | ❌ 无 | ✅ 智能冲突解决 |
| 自然语言控制 | ❌ 命令行 | ✅ 对话式操作 ⭐ |

### 核心创新

1. **规范优先** ⭐ - 自动扫描并适配项目代码风格
2. **工具化 Diff** ⭐ - 使用算法而非 AI，更精确可靠
3. **智能合并** ⭐ - 保留用户自定义，只更新接口相关部分
4. **Agent 驱动** ⭐ - 自主决策，灵活应对各种场景

---

## 🛠️ 技术选型

### 核心依赖
- `openai` - LLM 调用
- `zod` - 数据验证
- `glob` - 文件搜索
- `axios` - HTTP 请求

### 可选依赖
- `eslint` / `prettier` - 代码检查和格式化
- `handlebars` - 模板引擎
- `diff-match-patch` - Diff 算法库（可选，也可自己实现）

---

## 📊 实现优先级

### P0 - 必须实现（MVP）
- `SwaggerParserTool`
- `FileReaderTool` / `FileWriterTool` / `FileSearchTool`
- `BasicTypeGeneratorTool` / `BasicAPIGeneratorTool`
- `ProjectScannerTool` ⭐
- `SmartTypeGeneratorTool` / `SmartAPIGeneratorTool` ⭐
- `DiffTool` ⭐
- `CodeMergerTool` ⭐

### P1 - 重要增强
- `ConflictResolverTool`
- `CodeOptimizerTool`
- `TestGeneratorTool`
- `TemplateDetectorTool`

### P2 - 锦上添花
- `DocGeneratorTool`
- `MockGeneratorTool`
- `CommentGeneratorTool`
- `GitOperationTool`

---
