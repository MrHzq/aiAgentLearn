import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";

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

// 文档数据，用 AI 生成的一个小故事，描述了小军和小明之间的友谊
const documents = [
  new Document({
    pageContent:
      "小军是五年级（3）班的学生，性格热情开朗、憨厚大方，待人真诚主动，善于结交朋友。",
    metadata: {
      chapter: 1,
      character: "小军",
      type: "性格介绍",
      mood: "热情、憨厚",
    },
  }),
  new Document({
    pageContent:
      "小明是五年级的转学生，性格内敛拘谨，不善言辞、略显害羞，内心真诚善良，乐于助人。",
    metadata: {
      chapter: 2,
      character: "小明",
      type: "性格介绍",
      mood: "内敛、真诚",
    },
  }),
  new Document({
    pageContent:
      "开学第一天，五年级（3）班的教室里闹哄哄的，转学生小明坐在靠窗位置，因陌生环境显得拘谨。这时，小军抱着课本滑倒，课本散落一地，小明主动帮忙捡拾，两人初次相识，小军介绍自己并告知座位，小明也说明自己是新转来的。数学课上，小明被一道应用题难住，小军下课主动耐心讲解，帮小明理清思路。之后，两人频繁互动，小军主动找小明说话、分享零食、借文具，小明也主动帮忙整理课桌、分享课本。体育课上，小军崴脚，小明及时搀扶、处理伤口，小军感动地称小明为好朋友，两人在夕阳下并肩聊天，成为彼此的好朋友，一起学习、玩耍、成长。",
    metadata: {
      chapter: 3,
      character: "小明、小军",
      type: "友谊故事",
      mood: "温暖、纯真",
    },
  }),
];

// 使用嵌入模拟将文档向量化后，存入到向量数据库内
const vectorStore = await MemoryVectorStore.fromDocuments(
  documents,
  embeddings,
);

// 创建检索器，k 是 2 就是返回余弦相似度最大的 2 个 Document。
const retriever = vectorStore.asRetriever({ k: 2 });

// 问题
const questions = ["小军和小明是怎么成为朋友的？"];

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
  const prompt = `你是一个讲友情故事的老师。基于以下故事片段回答问题，用温暖生动的语言。如果故事中没有提到，就说"这个故事里还没有提到这个细节"。

故事片段:
${context}

问题: ${question}

老师的回答:`;

  console.log("\n【AI 回答】");
  const response = await model.invoke(prompt);
  console.log(response.content);
  console.log("\n");
}
