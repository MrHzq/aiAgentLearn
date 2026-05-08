import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MilvusClient, MetricType } from "@zilliz/milvus2-sdk-node";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { HumanMessage } from "@langchain/core/messages";

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

const COLLECTION_NAME = "chat_history";

// 查询
const queryCollection = async (query) => {
  const queryVector = await getEmbedding(query);

  const queryResult = await client.search({
    collection_name: COLLECTION_NAME, // 集合名称
    vector: queryVector, // 查询向量
    limit: 2, // 返回结果数量
    metric_type: MetricType.COSINE, // 余弦相似度
    output_fields: ["id", "timestamp", "round", "content"],
  });

  return queryResult.results;
};

const main = async () => {
  try {
    console.log("connecting to milvus...");
    await client.connectPromise;
    console.log("✔️ connected successfully");

    const history = new InMemoryChatMessageHistory();

    const querys = [
      { input: "" },
      { input: "我周末经常做什么？" },
      { input: "我的职业是什么？" },
    ];

    for (let index = 0; index < querys.length; index++) {
      const { input } = querys[index];

      console.log(`\n第${index + 1}轮对话,用户提问: ${input}`);

      // 查询历史记录
      const queryResult = await queryCollection(input);

      let queryHistory = "";
      if (queryResult.length > 0) {
        console.log(`\n查询到${queryResult.length}条相关历史对话`);

        queryResult.forEach((item, idx) => {
          console.log(
            `\n[历史对话 ${idx + 1}] 相似度: ${item.score.toFixed(4)}`,
          );
          console.log(`轮次: ${item.round}`);
          console.log(`内容: ${item.content}`);
        });

        queryHistory = queryResult
          .map((item, index) => {
            return `[历史对话${index + 1}]. ${item.round}轮: ${item.content}`;
          })
          .join("\n\n━━━━━\n\n");
      }

      const userMessage = new HumanMessage(input);

      // prompt
      const prompt = queryHistory
        ? [
            new HumanMessage(
              `相关历史对话:\n${queryHistory} \n\n 用户提问: ${input}`,
            ),
          ]
        : [userMessage];

      const response = await model.invoke(prompt);
      console.log(`\n模型回答: ${response.content}`);

      // 保存对话记录
      history.addMessages([userMessage, response]);

      const content = `用户: ${input}\n助手: ${response.content}`;

      // 将本轮对话插入数据
      const insertResult = await client.insert({
        collection_name: COLLECTION_NAME,
        data: [
          {
            id: `conv_${Date.now()}_${index + 1}`,
            timestamp: new Date().toISOString(),
            round: index + 1,
            content,
            vector: await getEmbedding(content),
          },
        ],
      });
      console.log(`insert ${insertResult.insert_cnt} messages successfully`);
    }
  } catch (error) {
    console.error("❌ error:", error);
  }
};

main();
