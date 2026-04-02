import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 模拟数据库
// @type {Object<string, Object<string, any>>}
const mockDatabase = {
  users: {
    "001": {
      id: "001",
      name: "张三",
      email: "zhangsan@example.com",
      role: "user",
    },
    "002": {
      id: "002",
      name: "李四",
      email: "lisi@example.com",
      role: "admin",
    },
    "003": {
      id: "003",
      name: "王五",
      email: "wangwu@example.com",
      role: "superAdmin",
    },
  },
};

// 创建MCP服务器
// @type {McpServer}
const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0",
});

// 注册查询用户信息工具
server.registerTool(
  "query_user",
  {
    description: "查询数据库中的用户信息, 输入用户ID, 输出用户信息",
    inputSchema: {
      userId: z.string().describe("用户ID"),
    },
  },
  async ({ userId }) => {
    const user = mockDatabase.users[userId];

    if (!user) {
      return {
        content: [
          {
            type: "text",
            text: `用户 ${userId} 不存在`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(user),
        },
      ],
    };
  },
);

// 注册使用指南资源
server.registerResource(
  "使用指南",
  "docs://guide",
  {
    description: "MCP Server 使用文档",
    mimeType: "text/plain",
  },
  async () => {
    return {
      contents: [
        {
          uri: "docs://guide",
          mimeType: "text/plain",
          text: `MCP Server 使用指南
        功能: 提供用户查询工具
        使用: 在 Cursor/Trae 等 MCP Client 中通过自然语言对话，会自动调用相应工具
        `,
        },
      ],
    };
  },
);

// 使用 stdio 传输连接方式
const transport = new StdioServerTransport();

// 连接服务器
await server.connect(transport);
