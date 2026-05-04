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
    console.log("✔️ connected successfully");

    const query = "我想看看聚餐的日记";
    const queryVector = await getEmbedding(query);

    const queryResult = await client.search({
      collection_name: COLLECTION_NAME, // 集合名称
      vector: queryVector, // 查询向量
      limit: 2, // 返回结果数量
      metric_type: MetricType.COSINE, // 余弦相似度
      output_fields: ["id", "content", "date", "mood", "tags"], // 输出字段
    });

    console.log(
      `Found${queryResult.results.length} results:\n`,
      queryResult.results,
    );
    queryResult.results.forEach((item, index) => {
      console.log(`${index + 1}. [Score:${item.score.toFixed(4)}]`);
      console.log(`  ID:${item.id}`);
      console.log(`  Content:${item.content}`);
      console.log(`  Date:${item.date}`);
      console.log(`  Mood:${item.mood}`);
      console.log(`  Tags:${item.tags?.join(", ")}`);
    });
  } catch (error) {
    console.error(error);
  }
};

main();
