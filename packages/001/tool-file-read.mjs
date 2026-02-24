import "dotenv/config"; // 加载环境变量
import { ChatOpenAI } from "@langchain/openai"; // 引入 OpenAI 模型
import { tool } from "@langchain/core/tools"; // 引入工具模块
import {
  SystemMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages"; // 引入消息模块

import { z } from "zod";
import fs from "node:fs/promises";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  temperature: 0, // 温度，0 表示最确定的回答，不要自己发挥
});

// 定义工具：读取文件内容
const readFileTool = tool(
  async ({ filePath }) => {
    const content = await fs.readFile(filePath, "utf-8");
    console.log(
      ` [工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`,
    );
    return `文件内容:\n${content}`;
  },
  {
    name: "read_file",
    description:
      "用此工具来读取文件内容。当用户要求读取文件、查看代码、分析文件内容时，调用此工具。输入文件路径（可以是相对路径或绝对路径）",
    schema: z.object({
      filePath: z.string().describe("要读取的文件路径"),
    }),
  },
);

const tools = [readFileTool];

// 绑定工具到模型
const modelWithTools = model.bindTools(tools);

const messages = [
  // SystemMessage 系统消息，定义助手的行为和能力
  new SystemMessage(`你是一个代码助手，可以使用工具读取文件并解释代码。
  工作流程：
    1. 用户要求读取文件时，立即调用 read_file 工具
    2. 等待工具返回文件内容
    3. 基于文件内容进行分析和解释
    
  可用工具：
    - read_file: 读取文件内容（使用此工具来读取文件内容）`),
  // HumanMessage 用户消息，用户输入的信息
  new HumanMessage("请读取 packages/001/tool-file-read.mjs 文件内容并解释代码"),
];

let response = await modelWithTools.invoke(messages);

console.log(response);

messages.push(response); // 把 ai 返回的消息也放入 messages 数组，也就是对话记录

while (response.tool_calls && response.tool_calls.length) {
  console.log(`\n[检测到 ${response.tool_calls.length} 个工具调用]`);

  const toolResults = await Promise.all(
    response.tool_calls.map(async (toolCall) => {
      const tool = tools.find((t) => t.name === toolCall.name); // 查找下工具
      if (!tool) return `错误: 找不到工具 ${toolCall.name}`;

      console.log(
        `[执行工具] ${toolCall.name}(${JSON.stringify(toolCall.args)})`,
      );
      try {
        const result = await tool.invoke(toolCall.args); // 执行工具,传入大模型解析出的参数
        return result;
      } catch (error) {
        return `错误: ${error.message}`;
      }
    }),
  );

  // 将工具结果添加到对话记录
  response.tool_calls.forEach((toolCall, index) => {
    messages.push(
      new ToolMessage({
        content: toolResults[index],
        tool_call_id: toolCall.id,
      }),
    );
  });

  // 再次调用大模型，传入最新的对话记录
  response = await modelWithTools.invoke(messages);
  messages.push(response); // 把 ai 返回的消息也放入 messages 数组，也就是对话记录
}

console.log("\n[最终回复]");
console.log(response.content);
