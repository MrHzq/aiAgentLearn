import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  temperature: 0, // 温度，0 表示最确定的回答，不要自己发挥
});

const chatPrompt = ChatPromptTemplate.fromMessages([
  // 人设模块
  [
    "system",
    `你是一名资深工程团队负责人，写作风格：{tone}。你擅长把枯燥的技术细节写得既专业又有温度。\n`,
  ],
  // 背景模块
  [
    "human",
    `
    公司：{company_name}
    部门：{team_name}
    直接汇报对象：{manager_name}
    本周时间范围：{week_range}
    本周部门核心目标：{team_goal}\n
    `,
  ],
  // 任务模块
  [
    "human",
    `
    以下是本周团队的开发活动（Git / Jira 汇总）：
    {dev_activities}

    请你从这些原始数据中提炼出：
    1. 本周整体成就亮点
    2. 潜在风险和技术债
    3. 下周重点计划建议\n
    `,
  ],
  // 格式模块
  [
    "human",
    `
    请用 Markdown 输出周报，结构包含：
    1. 本周概览（2-3 句话的 Summary）
    2. 详细拆分（按模块或项目分段）
    3. 关键指标表格，表头为：模块 | 亮点 | 风险 | 下周计划

    注意：
    - 尽量引用一些具体数据（如提交次数、完成的任务编号）
    - 语气专业，但可以偶尔带一点轻松的口吻，符合 {company_values}。
    `,
  ],
]);

const chatMessages = await chatPrompt.formatMessages({
  company_name: "星航科技",
  company_values: "「极致、开放、靠谱」的价值观",
  tone: "偏正式但不僵硬",
  team_name: "AI 平台组",
  manager_name: "王总",
  week_range: "2025-02-03 ~ 2025-02-09",
  team_goal: "完成智能周报 Agent 的 MVP 版本，并打通 Git / Jira 数据源。",
  dev_activities:
    "- Git: 58 次提交，3 个主要分支合并\n" +
    "- Jira: 完成 12 个 Story，关闭 7 个 Bug\n" +
    "- 关键任务：完成智能周报 Pipeline 设计、实现 Prompt 拆分、接入 ExampleSelector",
});

console.log("ChatPromptTemplate 生成的消息:");
console.log(chatMessages);

const stream = await model.stream(chatMessages);

console.log("\n=== AI 回答:");
for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
