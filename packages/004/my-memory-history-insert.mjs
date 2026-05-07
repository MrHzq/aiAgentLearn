import "dotenv/config";
import { FileSystemChatMessageHistory } from "@langchain/community/stores/message/file_system";
import path from "path";
import { OpenAIEmbeddings } from "@langchain/openai";
import {
  MilvusClient,
  DataType,
  MetricType,
  IndexType,
} from "@zilliz/milvus2-sdk-node";

// 指定存储文件的路径
const filePath = path.join(process.cwd(), "chat_history.json");
const sessionId = "user_session_001";

// 创建文件系统历史记录对象
const history = new FileSystemChatMessageHistory({
  filePath,
  sessionId,
});

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

const COLLECTION_NAME = "chat_history";
// 创建集合
const createCollection = async () => {
  try {
    // 检查集合是否存在
    const hasCollection = await client.hasCollection({
      collection_name: COLLECTION_NAME,
    });

    if (hasCollection.value) {
      console.log(`collection ${COLLECTION_NAME} already exists`);
      return false;
    }

    // 创建集合
    await client.createCollection({
      collection_name: COLLECTION_NAME,
      // 字段定义
      fields: [
        {
          name: "id",
          data_type: DataType.VarChar,
          max_length: 100,
          is_primary_key: true,
        },
        { name: "timestamp", data_type: DataType.VarChar, max_length: 500 }, // 时间戳
        { name: "round", data_type: DataType.Int64 }, // 轮次
        { name: "content", data_type: DataType.VarChar, max_length: 10000 }, // 内容
        { name: "vector", data_type: DataType.FloatVector, dim: VECTOR_DIM }, // 嵌入向量
      ],
    });

    // 创建索引
    await client.createIndex({
      collection_name: COLLECTION_NAME, // 集合名称
      field_name: "vector", // 索引字段
      index_type: IndexType.IVF_FLAT, // 索引类型
      metric_type: MetricType.COSINE, // 余弦相似度
      params: { nlist: 1024 }, // 索引参数
    });

    console.log("✔️ create collection e_book successfully");
    return true;
  } catch (error) {
    console.error("create collection e_book failed:", error);
    throw error;
  }
};

// 插入数据
const insertData = async (messages) => {
  try {
    const messagesData = await Promise.all(
      messages.map(async (message, index) => {
        return {
          id: `conv_00${index + 1}`,
          timestamp: new Date().toISOString(),
          round: index + 1,
          content: message.content,
          vector: await getEmbedding(message.content),
        };
      }),
    );

    const insertResult = await client.insert({
      collection_name: COLLECTION_NAME,
      data: messagesData,
    });
    const insert_cnt = Number(insertResult.insert_cnt) || 0;
    console.log(`insert ${insert_cnt} messages successfully`);
    return insert_cnt;
  } catch (error) {
    console.error("插入数据失败:", error);
    throw error;
  }
};

const main = async () => {
  console.log("connecting to milvus...");
  await client.connectPromise;
  console.log("✔️ connected successfully");

  await createCollection();

  await insertData(await history.getMessages());
};

main();
