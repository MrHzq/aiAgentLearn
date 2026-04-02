import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import {
  SystemMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";
import chalk from "chalk";

// 创建大模型
const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  temperature: 0, // 温度，0 表示最确定的回答，不要自己发挥
});

// 创建 MCP 客户端
const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    "my-mcp-server": {
      command: "node",
      args: [
        "/Users/hzq/code/github/aiAgentLearn/packages/002/my-mcp-server.mjs",
      ],
    },
  },
});

// 获取工具
const tools = await mcpClient.getTools();

// 将工具绑定到模型上
const modelWithTools = model.bindTools(tools);

// 列出所有资源
/** res 示例
    mcpServers: { // 其实就是 resources
        "my-mcp-server": [{
            uri: "docs://guide",
            name: "使用指南",
            desc: "MCP Server 使用文档",
            type: "text/plain",
        }]
    }
   */
const res = await mcpClient.listResources();

// 读取所有资源的使用指南内容
let resourceContent = "";
for (const [serverName, resources] of Object.entries(res)) {
  for (const resource of resources) {
    /**
       * contents 示例，其实就是读取资源定义时的内容(contents)
        [
            {
                uri: 'docs://guide',
                mimeType: 'text/plain',
                text: 'MCP Server 使用指南\n' +
                '        功能: 提供用户查询工具\n' +
                '        使用: 在 Cursor/Trae 等 MCP Client 中通过自然语言对话，会自动调用相应工具\n' +
                '        ',
                blob: undefined
            }
        ]
         */
    const contents = await mcpClient.readResource(serverName, resource.uri);

    resourceContent += contents[0].text;
  }
}

// Agent 执行函数
const runAgentWithTools = async (query, maxIterations = 30) => {
  const messages = [
    new SystemMessage(resourceContent), // 将所有资源的使用指南内容，作为系统消息，传递给大模型
    new HumanMessage(query),
  ];

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));

    const response = await modelWithTools.invoke(messages);
    messages.push(response); // 把 ai 返回的消息也放入 messages 数组，也就是对话记录

    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n✨ AI 最终回复:\n${response.content}\n`);

      // 如果 ai 没有调用工具，说明任务完成
      return response.content;
    }

    for (const toolCall of response.tool_calls) {
      const tool = tools.find((t) => t.name === toolCall.name); // 查找下工具
      if (!tool) return `错误: 找不到工具 ${toolCall.name}`;

      console.log(
        `[执行工具] ${toolCall.name}(${JSON.stringify(toolCall.args)})`,
      );

      const toolResult = await tool.invoke(toolCall.args);
      // 执行工具后，把工具返回的结果也放入 messages 数组，也就是对话记录
      messages.push(
        new ToolMessage({
          content: toolResult,
          tool_call_id: toolCall.id,
        }),
      );
    }
  }

  return messages[messages.length - 1].content;
};

const case1 = `MCP Server 的使用指南是什么`;
const case2 = `查一下用户 002 的信息`;

try {
  // 先查询使用指南
  await runAgentWithTools(case1);

  // 再查询用户信息
  await runAgentWithTools(case2);

  // 关闭 MCP 客户端
  await mcpClient.close();
} catch (error) {
  console.error(`\n❌ 错误: ${error.message}\n`);
}
