import "dotenv/config";
import { OpenAIEmbeddings } from "@langchain/openai";
import {
  MilvusClient,
  DataType,
  MetricType,
  IndexType,
} from "@zilliz/milvus2-sdk-node";

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

    // 创建集合
    console.log("creating collection...");
    await client.createCollection({
      collection_name: COLLECTION_NAME, // 集合名称
      // 字段定义
      fields: [
        {
          name: "id", // 主键字段
          data_type: DataType.VarChar, // 数据类型：字符串类型
          max_length: 50, // 最大长度
          is_primary_key: true, // 是否主键字段
        },
        { name: "vector", data_type: DataType.FloatVector, dim: VECTOR_DIM },
        { name: "content", data_type: DataType.VarChar, max_length: 5000 },
        { name: "date", data_type: DataType.VarChar, max_length: 50 },
        { name: "mood", data_type: DataType.VarChar, max_length: 50 },
        {
          name: "tags", // 标签字段
          data_type: DataType.Array, // 数据类型：数组类型
          element_type: DataType.VarChar, // 元素类型
          max_capacity: 10, // 最大容量
          max_length: 50, // 最大长度
        },
      ],
    });
    console.log("✔️ collection created successfully");

    // 插入日记数据
    console.log("inserting diary...");
    // AI 生成的几条日记
    const diaryContents = [
      {
        id: "1",
        content:
          "今天天气很好，阳光暖洋洋的，上班效率特别高，完成了两个重要项目，下班还顺路买了喜欢的奶茶，一整天都很轻松。",
        date: "2025-10-01",
        mood: "happy",
        tags: ["晴天", "工作", "奶茶", "高效"],
      },
      {
        id: "2",
        content:
          "下了一整天的雨，有点闷。工作上遇到了小bug，调试了好久才解决，虽然有点累，但解决问题后还是很有成就感。",
        date: "2025-10-02",
        mood: "tired",
        tags: ["雨天", "工作", "bug", "成就感"],
      },
      {
        id: "3",
        content:
          "多云天气，不冷不热很舒服。今天没什么急事，慢悠悠处理日常工作，下班后散步回家，心情很平和。",
        date: "2025-10-03",
        mood: "calm",
        tags: ["多云", "日常", "散步", "放松"],
      },
      {
        id: "4",
        content:
          "阴天，有点提不起劲。工作任务有点多，忙得晕头转向，晚上只想早点躺平休息，不想说话。",
        date: "2025-10-04",
        mood: "sad",
        tags: ["阴天", "忙碌", "疲惫", "休息"],
      },
      {
        id: "5",
        content:
          "晴空万里，和朋友出去聚餐啦！聊了很多开心的事，完全抛开工作烦恼，今天是纯快乐模式。",
        date: "2025-10-05",
        mood: "excited",
        tags: ["晴天", "朋友", "聚餐", "快乐"],
      },
      {
        id: "6",
        content:
          "小雨淅淅沥沥，在家整理了房间，看了一部治愈的电影，没有工作打扰，安安静静的一天特别舒服。",
        date: "2025-10-06",
        mood: "warm",
        tags: ["雨天", "居家", "电影", "治愈"],
      },
      {
        id: "7",
        content:
          "天气凉爽，完成了月度总结工作，得到了领导的表扬，心里特别满足，感觉这段时间的努力都值得了。",
        date: "2025-10-07",
        mood: "proud",
        tags: ["工作", "表扬", "努力", "收获"],
      },
      {
        id: "8",
        content:
          "大风天气，有点冷。工作很顺利，早早下班回家做饭，简单的小日子，平凡又幸福。",
        date: "2025-10-08",
        mood: "satisfied",
        tags: ["大风", "做饭", "平凡", "幸福"],
      },
    ];

    const diaryData = await Promise.all(
      diaryContents.map(async (diary) => {
        return {
          ...diary,
          vector: await getEmbedding(diary.content),
        };
      }),
    );

    const insertResult = await client.insert({
      collection_name: COLLECTION_NAME,
      data: diaryData,
    });
    console.log(insertResult);
    console.log("✔️ diary inserted successfully");

    // 创建索引
    console.log("creating index...");
    await client.createIndex({
      collection_name: COLLECTION_NAME, // 集合名称
      field_name: "vector", // 索引字段
      index_type: IndexType.IVF_FLAT, // 索引类型
      metric_type: MetricType.COSINE, // 余弦相似度
      params: { nlist: 1024 }, // 索引参数
    });
    console.log("✔️ index created successfully");

    // 加载集合
    console.log("loading collection...");
    await client.loadCollection({
      collection_name: COLLECTION_NAME, // 集合名称
    });
    console.log("✔️ collection loaded successfully");
  } catch (error) {
    console.error(error);
  }
};

main();
