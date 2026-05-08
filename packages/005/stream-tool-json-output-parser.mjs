import "dotenv/config"; // 加载环境变量
import { ChatOpenAI } from "@langchain/openai"; // 引入 OpenAI 模型
import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";
import { z } from "zod";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  temperature: 0, // 温度，0 表示最确定的回答，不要自己发挥
});

const jsonSchema = z.object({
  name: z.string().describe("科学家的全名"),
  birth_year: z.number().describe("出生年份"),
  death_year: z.number().optional().describe("去世年份，如果还在世则不填"),
  nationality: z.string().describe("国籍"),
  fields: z.array(z.string()).describe("研究领域列表"),
  awards: z
    .array(
      z.object({
        name: z.string().describe("奖项名称"),
        year: z.number().describe("获奖年份"),
        reason: z.string().optional().describe("获奖原因"),
      }),
    )
    .describe("获得的重要奖项列表"),
  major_achievements: z.array(z.string()).describe("主要成就列表"),
  famous_theories: z
    .array(
      z.object({
        name: z.string().describe("理论名称"),
        year: z.number().optional().describe("提出年份"),
        description: z.string().describe("理论简要描述"),
      }),
    )
    .describe("著名理论列表"),
  education: z
    .object({
      university: z.string().describe("主要毕业院校"),
      degree: z.string().describe("学位"),
      graduation_year: z.number().optional().describe("毕业年份"),
    })
    .optional()
    .describe("教育背景"),
  biography: z.string().describe("简短传记，100字以内"),
});

// 绑定工具到模型
const modelWithTools = model.bindTools([
  {
    name: "extract_scientist_info",
    description: "提取和结构化详细信息",
    schema: jsonSchema,
  },
]);

const parser = new JsonOutputToolsParser();
const chain = modelWithTools.pipe(parser); // 将模型和工具解析器连接起来

const question = `请介绍一下爱因斯坦的信息。`;
const stream = await chain.stream(question); // 流式输出

let fullContent = "";
let chunkCount = 0;

for await (const chunk of stream) {
  chunkCount++;

  if (chunk.length > 0) {
    const content = chunk[0].args;

    fullContent = content;

    console.log(content);
  }
}

console.log(`\n\n✅ 共接收 ${chunkCount} 个数据块\n`);

console.log("\n最终结果:\n");
console.log(fullContent);
