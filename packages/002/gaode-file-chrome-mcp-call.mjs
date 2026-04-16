import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import chalk from "chalk";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  temperature: 0, // 温度，0 表示最确定的回答，不要自己发挥
});

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    "amap-maps-streamableHTTP": {
      url: "https://mcp.amap.com/mcp?key=" + process.env.AMAP_MAPS_API_KEY,
    },
    filesystem: {
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        ...(process.env.ALLOWED_PATHS.split(",") || ""),
      ],
    },
    "chrome-devtools": {
      command: "npx",
      args: ["-y", "chrome-devtools-mcp@latest"],
    },
  },
});

const tools = await mcpClient.getTools();

const modelWithTools = model.bindTools(tools);

const runAgentWithTools = async (query, maxIterations = 30) => {
  const messages = [new HumanMessage(query)];

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));

    const response = await modelWithTools.invoke(messages);
    messages.push(response); // 把 ai 返回的消息也放入 messages 数组，也就是对话记录

    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
      return response.content;
    }

    for (const toolCall of response.tool_calls) {
      const tool = tools.find((t) => t.name === toolCall.name); // 查找下工具
      if (!tool) return `错误: 找不到工具 ${toolCall.name}`;

      console.log(
        `[执行工具] ${toolCall.name}(${JSON.stringify(toolCall.args)})`,
      );

      const toolResult = await tool.invoke(toolCall.args);

      let contentStr;
      if (typeof toolResult === "string") {
        contentStr = toolResult;
      } else if (toolResult && toolResult.text) {
        // 处理工具返回的对象内容：filesystem
        contentStr = toolResult.text;
      }

      // 执行工具后，把工具返回的结果也放入 messages 数组，也就是对话记录
      messages.push(
        new ToolMessage({
          content: contentStr,
          tool_call_id: toolCall.id,
        }),
      );
    }
  }

  return messages[messages.length - 1].content;
};

try {
  // const case1 = "广西百色站附近的酒店，以及去的路线";

  // const case2 = `路线规划生成文档保存到 ${process.env.ALLOWED_PATHS.split(",")} 的一个 md 文件`;

  const case3 = `广西市百色站附近的酒店，最近的 3 个酒店，拿到酒店图片，打开浏览器，展示每个酒店的图片，每个 tab 一个 url 展示，并且在把那个页面标题改为酒店名`;

  await runAgentWithTools(case3);

  // await mcpClient.close();
} catch (error) {
  console.error(error);
}
