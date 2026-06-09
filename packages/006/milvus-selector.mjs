import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { PromptTemplate, FewShotPromptTemplate } from "@langchain/core/prompts";
import { SemanticSimilarityExampleSelector } from "@langchain/core/example_selectors";
import { Milvus } from "@langchain/community/vectorstores/milvus";

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

// 获取嵌入向量
const getEmbedding = async (text) => {
  const result = await embeddings.embedQuery(text);
  return result;
};

const COLLECTION_NAME = "weekly_report_examples";

const vectorStore = await Milvus.fromExistingCollection(embeddings, {
  collectionName: COLLECTION_NAME,
  clientConfig: {
    address: "localhost:19530",
  },
  // 与 weekly-report-examples-writer-milvus.mjs 中创建的索引保持一致
  indexCreateOptions: {
    index_type: "IVF_FLAT",
    metric_type: "COSINE",
    params: { nlist: 1024 },
    search_params: {
      nprobe: 10,
    },
  },
});

// 示例提示词模板
const examplePrompt = PromptTemplate.fromTemplate(`
用户需求：{scenario}
周报片段示例：
{report_snippet}
---`);

// 示例选择器
const exampleSelector = new SemanticSimilarityExampleSelector({
  vectorStore,
  k: 2, // 每次只选出语义上最相近的 2 条示例
});

// 少样本提示词模板
const fewShotPrompt = new FewShotPromptTemplate({
  exampleSelector,
  examplePrompt,
  prefix: `下面是几条已经写好的【周报示例】，你可以从中学习语气、结构和信息组织方式：\n`,
  suffix:
    "\n\n现在请根据上面的示例风格，为下面这个场景写一份新的周报：\n" +
    "场景描述：{current_scenario}\n" +
    "请输出一份适合发给老板和团队同步的 Markdown 周报草稿。",
  inputVariables: ["current_scenario"],
});

// 6. 演示：给定几个不同的场景描述，让 selector 挑出语义上最接近的示例
const currentScenario1 =
  "我们本周主要是在清理历史技术债：重构老旧的订单模块、补齐核心接口的单测，" +
  "同时也完善了一些文档，方便后面新人接手。整体没有对外大范围发布的新功能。";

// 一个语义上明显不同的场景：偏「首发上线 + 对外宣传」
const currentScenario2 =
  "本周完成新一代运营看板的首批功能上线，重点打通埋点和实时数仓链路，" +
  "并面向运营和市场同学做了多场宣讲，希望更多同学开始使用新能力。";

console.log("\n===== 场景 1：技术债清理为主 =====\n");
const finalPrompt1 = await fewShotPrompt.format({
  current_scenario: currentScenario1,
});
console.log(finalPrompt1);

console.log("\n\n===== 场景 2：新功能首发 + 对外宣传 =====\n");
const finalPrompt2 = await fewShotPrompt.format({
  current_scenario: currentScenario2,
});
console.log(finalPrompt2);
