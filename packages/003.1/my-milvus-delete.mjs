import "dotenv/config";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MilvusClient, MetricType } from "@zilliz/milvus2-sdk-node";

const VECTOR_DIM = 1024;

// 创建嵌入模型
const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDINGS_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  dimensions: VECTOR_DIM, // 向量维度
});

// 创建 Milvus 客户端
const client = new MilvusClient({
  address: "localhost:19530",
});

// 获取嵌入向量
const getEmbedding = async (text) => {
  const result = await embeddings.embedQuery(text);
  return result;
};

const COLLECTION_NAME = "ai_diary";
const main = async () => {
  try {
    console.log("connecting to milvus...");
    await client.connectPromise;
    console.log("✔️ connected successfully"); // 更新数据（Milvus 通过 upsert 实现更新）

    console.log("Updating diary entry...");
    const deleteId = "2";

    const deleteResult = await client.delete({
      collection_name: COLLECTION_NAME,
      filter: `id == "${deleteId}"`,
    });
    console.log(deleteResult);
    console.log(`Deleted diary entry: ${deleteId}`);
    console.log("✔️ diary deleted successfully");
  } catch (error) {
    console.error(error);
  }
};

main();
