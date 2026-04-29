import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// 创建大模型
const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  temperature: 0, // 温度，0 表示最确定的回答，不要自己发挥
});

// 创建嵌入模型
const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDINGS_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
});

const cheerioLoader = new CheerioWebBaseLoader(
  "https://juejin.cn/post/7621878684524740671", // 掘金上的某篇文章
  {
    selector: ".main-area p", // 取出 .main-area 下所有 p 标签的内容
  },
);

const documents = await cheerioLoader.load();

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 800, // 每个 chunk 的最大字符数
  chunkOverlap: 50, // 前后 chunk 重叠字符数
  separators: ["。", "，"], // 分隔符
});

const splitDocuments = await textSplitter.splitDocuments(documents);

console.log(`文档分割完成，共 ${splitDocuments.length} 个分块\n`);

// 使用嵌入模拟将文档向量化后，存入到向量数据库内
const vectorStore = await MemoryVectorStore.fromDocuments(
  splitDocuments,
  embeddings,
);

// 创建检索器，k 是 2 就是返回余弦相似度最大的 2 个 Document。
const retriever = vectorStore.asRetriever({ k: 2 });

// 问题
const questions = ["作者为什么会提到这些概念？"];

for (const question of questions) {
  console.log("=".repeat(80));
  console.log(`问题：${question}`);
  console.log("=".repeat(80));

  // 传入问题，检索文档
  const retrievedDocs = await retriever.invoke(question);

  // 获取文档的相似度评分
  const scoreResults = await vectorStore.similaritySearchWithScore(question, 2);

  console.log("\n【检索到的文档以及相似度评分】");
  retrievedDocs.forEach((doc, i) => {
    // 找到与文档内容对应的相似度评分，这里需要根据文档内容匹配
    const scoreResult = scoreResults.find(([scoreDoc]) => {
      return scoreDoc.pageContent === doc.pageContent;
    });

    //取文档的相似度评分
    const score = scoreResult?.[1] || null;
    // 相似度评分，1 表示完全相似，0 表示完全不相似
    const similarity = score != null ? (1 - score).toFixed(4) : "N/A";

    console.log(`\n[文档 ${i + 1}] 相似度: ${similarity}`);
    console.log(`文档内容: ${doc.pageContent}`);
    console.log(
      `元数据：章节=${doc.metadata.chapter}，角色=${doc.metadata.character}，类型=${doc.metadata.type}，心情=${doc.metadata.mood}`,
    );
  });

  // 构建知识库上下文：将检索到的文档内容，处理为片段格式
  const context = retrievedDocs
    .map((doc, i) => `[片段${i + 1}] ${doc.pageContent}`)
    .join("\n\n━━━━━\n\n");

  // 构建提示词，其中包含知识库上下文和问题
  const prompt = `你是一个文章辅助阅读助手，根据文章内容来解答:
文章内容:${context}

问题:${question}

你的回答:`;

  console.log("\n【AI 回答】");
  const response = await model.invoke(prompt);
  console.log(response.content);
  console.log("\n");
}
