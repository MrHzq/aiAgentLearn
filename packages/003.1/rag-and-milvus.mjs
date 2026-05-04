import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MilvusClient, MetricType } from "@zilliz/milvus2-sdk-node";

// 创建大模型
const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  temperature: 0, // 温度，0 表示最确定的回答，不要自己发挥
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

const COLLECTION_NAME = "ai_diary";

// 检索相关日记
const retrieveRelevantDiaries = async (question, k = 2) => {
  try {
    // 获取问题的嵌入向量
    const queryVector = await getEmbedding(question);

    const queryResult = await client.search({
      collection_name: COLLECTION_NAME, // 集合名称
      vector: queryVector, // 查询向量
      limit: k, // 返回结果数量
      metric_type: MetricType.COSINE, // 余弦相似度
      output_fields: ["id", "content", "date", "mood", "tags"], // 输出字段
    });

    return queryResult.results;
  } catch (error) {
    console.error("检索相关日记失败:", error);
    return [];
  }
};

const answerDiaryQuestion = async (question, k = 2) => {
  try {
    console.log("=".repeat(80));
    console.log(`问题: ${question}`);
    console.log("=".repeat(80));

    // 1. 检索相关日记
    const retrievedDiaries = await retrieveRelevantDiaries(question, k);

    if (retrievedDiaries.length === 0) {
      console.log("没有检索到相关日记");
      return "抱歉，没有检索到相关日记";
    }

    // 2. 打印检索到的相关日记
    retrievedDiaries.forEach((diary, i) => {
      console.log(`\n[日记 ${i + 1}] 相似度: ${diary.score.toFixed(4)}`);
      console.log(`日期: ${diary.date}`);
      console.log(`心情: ${diary.mood}`);
      console.log(`标签: ${diary.tags?.join(", ")}`);
      console.log(`内容: ${diary.content}`);
    });

    // 3. 构建上下文
    const context = retrievedDiaries
      .map((diary, i) => {
        return `
        [日记 ${i + 1}]
        日期: ${diary.date}
        心情: ${diary.mood}
        标签: ${diary.tags?.join(", ")}
        内容: ${diary.content}`;
      })
      .join("\n\n━━━━━\n\n");

    // 4. 构建提示词
    const prompt = `
你是一个温暖贴心的 AI 日记助手。基于用户的日记内容回答问题，用亲切自然的语言。

请根据以下日记内容回答问题：
${context}

用户问题: ${question}

回答要求：
1. 如果日记中有相关信息，请结合日记内容给出详细、温暖的回答
2. 可以总结多篇日记的内容，找出共同点或趋势
3. 如果日记中没有相关信息，请温和地告知用户
4. 用第一人称"你"来称呼日记的作者
5. 回答要有同理心，让用户感到被理解和关心

AI 助手的回答:
`;

    // 5. 调用 LLM 生成回答
    console.log("\n【AI 回答】");
    const response = await model.invoke(prompt);
    console.log(response.content);
    console.log("\n");

    return response.content;
  } catch (error) {
    console.error("回答问题时出错:", error.message);
    return "抱歉，处理您的问题时出现了错误。";
  }
};

const main = async () => {
  try {
    console.log("connecting to milvus...");
    await client.connectPromise;
    console.log("✔️ connected successfully");

    await answerDiaryQuestion("我最近做了什么让我感到快乐的事情？", 2);
  } catch (error) {
    console.error("错误:", error.message);
  }
};

main();
