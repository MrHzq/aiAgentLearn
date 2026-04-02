import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import {
  readFileTool,
  writeFileTool,
  executeCommandTool,
  listDirectoryTool,
} from "./all-tool.mjs";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  temperature: 0, // 温度，0 表示最确定的回答，不要自己发挥
});

const tools = [
  readFileTool,
  writeFileTool,
  executeCommandTool,
  listDirectoryTool,
];

// 将工具绑定到模型上
const modelWithTools = model.bindTools(tools);

// Agent 执行函数
const runAgentWithTools = async (query, maxIterations = 30) => {
  const messages = [
    new SystemMessage(`
    你是一个代码助手，可以使用工具读取文件、写入文件、执行命令和列出目录。

    当前工作目录: ${process.cwd()}

    工作流程：
        1. 用户要求读取文件时，立即调用 readFileTool 工具
        2. 等待工具返回文件内容
        3. 基于文件内容进行分析和解释
        4. 用户要求写入文件时，立即调用 writeFileTool 工具
        5. 等待工具返回写入结果
        6. 用户要求执行命令时，立即调用 executeCommandTool 工具
        7. 等待工具返回命令执行结果
        8. 用户要求列出目录时，立即调用 listDirectoryTool 工具
        9. 等待工具返回目录列表
        10. 重复以上流程，直到用户要求结束
        
    可用工具：
        - readFileTool: 读取文件内容（使用此工具来读取文件内容）
        - writeFileTool: 写入文件内容（使用此工具来写入文件内容）
        - executeCommandTool: 执行命令（使用此工具来执行命令）
        - listDirectoryTool: 列出目录（使用此工具来列出目录）  

    重要规则 - executeCommandTool:
        - workingDirectory 参数会自动切换到指定目录
        - 当使用 workingDirectory 时，绝对不要在 command 中使用 cd
        - 错误示例: { command: "cd react-todo-app && pnpm install", workingDirectory: "react-todo-app" }
        这是错误的！因为 workingDirectory 已经在 react-todo-app 目录了，再 cd react-todo-app 会找不到目录
        - 正确示例: { command: "pnpm install", workingDirectory: "react-todo-app" }
        这样就对了!workingDirectory 已经切换到 react-todo-app,直接执行命令即可
        `),
    new HumanMessage(query),
  ];

  for (let i = 0; i < maxIterations; i++) {
    console.log(`⏳ 正在等待 AI 思考...`);

    const response = await modelWithTools.invoke(messages);
    messages.push(response); // 把 ai 返回的消息也放入 messages 数组，也就是对话记录

    if (!response.tool_calls || response.tool_calls.length === 0) {
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

const case1 = `
创建一个 vue3-todo-app 项目
1. 创建项目：echo -e 'n\nn' | npm create vite@latest vue3-todo-app -- --template vue
2. 修改 src/App.vue，实现完整功能的 TodoList：
 - 添加、删除、编辑、标记完成
 - 分类筛选（全部/进行中/已完成）
 - 统计信息显示
 - localStorage 数据持久化
3. 添加复杂样式：
 - 渐变背景（蓝到紫）
 - 卡片阴影、圆角
 - 悬停效果
4. 添加动画：
 - 添加/删除时的过渡动画
 - 使用 CSS transitions
5. 列出目录确认

注意：使用 pnpm，功能要完整，样式要美观，要有动画效果

之后在 vue3-todo-app 项目中：
1. 使用 pnpm install 安装依赖
2. 使用 pnpm run dev 启动服务器

`;

try {
  await runAgentWithTools(case1);
} catch (error) {
  console.error(`\n❌ 错误: ${error.message}\n`);
}
