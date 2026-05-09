import "dotenv/config"; // 加载环境变量
import { ChatOpenAI } from "@langchain/openai"; // 引入 OpenAI 模型
import { XMLOutputParser } from "@langchain/core/output_parsers";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  temperature: 0, // 温度，0 表示最确定的回答，不要自己发挥
});

const parser = new XMLOutputParser();

const question = `请介绍一下爱因斯坦的信息。
${parser.getFormatInstructions()}`;

console.log("\n[ 提示词 question ]", question);

const response = await model.invoke(question);
console.log("\n[ 模型回答 ]", response.content);

const result = await parser.parse(response.content);
console.log("\n✅ XMLOutputParser 解析结果:\n");
console.log(result);
