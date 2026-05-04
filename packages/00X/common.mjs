import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MilvusClient } from "@zilliz/milvus2-sdk-node";

// 创建大模型
export const createModel = (temperature = 0) => {
  return new ChatOpenAI({
    modelName: process.env.MODEL_NAME,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
    },
    temperature, // 温度，0 表示最确定的回答，不要自己发挥
  });
};

export const VECTOR_DIM = 1024;
// 创建嵌入模型
export const createEmbeddings = (dimensions = VECTOR_DIM) => {
  return new OpenAIEmbeddings({
    model: process.env.EMBEDDINGS_MODEL_NAME,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
    },
    dimensions, // 向量维度
  });
};

// 创建 Milvus 客户端
export const createMilvusClient = (address = "localhost:19530") => {
  return new MilvusClient({ address });
};

// 获取嵌入向量方法
export const getEmbedding = async (text, embeddings) => {
  return await embeddings.embedQuery(text);
};
