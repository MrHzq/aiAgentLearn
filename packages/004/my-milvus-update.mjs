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
    const updateId = "4";
    const updatedContent = {
      id: updateId,
      content:
        "阴天，有点提不起劲。工作任务有点多，忙得晕头转向，晚上只想早点躺平休息，不想说话。感觉浑身不得劲，有点生病了？",
      date: "2025-10-04",
      mood: "unwell",
      tags: ["阴天", "忙碌", "疲惫", "休息", "生病"],
    };

    const vector = await getEmbedding(updatedContent.content);
    const updateData = {
      ...updatedContent,
      vector,
    };
    const updateResult = await client.upsert({
      collection_name: COLLECTION_NAME,
      data: [updateData],
    });
    console.log(updateResult);
    console.log(`Updated diary entry: ${updateId}`);
    console.log(` New content: ${updatedContent.content}`);
    console.log(` New mood: ${updatedContent.mood}`);
    console.log(` New tags: ${updatedContent.tags.join(", ")}\n`);
    console.log("✔️ diary updated successfully");
  } catch (error) {
    console.error(error);
  }
};

main();
