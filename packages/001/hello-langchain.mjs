import "dotenv/config"; // 加载环境变量
import { ChatOpenAI } from "@langchain/openai"; // 引入 OpenAI 模型

// 初始化 OpenAI 模型
const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
});

// 调用模型
const res = await model.invoke("介绍下自己");
console.log(res.content);
