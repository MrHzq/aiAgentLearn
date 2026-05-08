import "dotenv/config"; // 加载环境变量
import { ChatOpenAI } from "@langchain/openai"; // 引入 OpenAI 模型

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  temperature: 0, // 温度，0 表示最确定的回答，不要自己发挥
});

const question = `请介绍一下爱因斯坦的信息。`;

const stream = await model.stream(question);

let fullContent = "";
let chunkCount = 0;

for await (const chunk of stream) {
  chunkCount++;

  const content = chunk.content;

  fullContent += content;

  process.stdout.write(content); // 实时显示流式文本
}
