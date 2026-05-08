import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "@langchain/core/output_parsers";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  temperature: 0, // 温度，0 表示最确定的回答，不要自己发挥
});

const parser = StructuredOutputParser.fromNamesAndDescriptions({
  name: "姓名",
  birth_year: "出生年份",
  nationality: "国籍",
  major_achievements: "主要成就，用逗号分隔的字符串",
  famous_theory: "著名理论",
}); // 创建 JSON 输出解析器实例

const question = `请介绍一下爱因斯坦的信息。
${parser.getFormatInstructions()}`;

console.log(
  "%c [ question ]",
  "font-size:13px; background:#90fe01; color:#d4ff45;",
  question,
);

const response = await model.invoke(question);
console.log(response.content);

// 解析 JSON
const jsonResult = await parser.parse(response.content);
console.log("\n📋 解析后的 JSON 对象:");
console.log(jsonResult);
