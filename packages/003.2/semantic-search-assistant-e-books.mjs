import "dotenv/config";
import path from "path";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import {
  MilvusClient,
  DataType,
  IndexType,
  MetricType,
} from "@zilliz/milvus2-sdk-node";
import { EPubLoader } from "@langchain/community/document_loaders/fs/epub";
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

const COLLECTION_NAME = "e_book";
// 创建电子书集合
const createEBookCollection = async () => {
  try {
    // 检查集合是否存在
    const hasCollection = await client.hasCollection({
      collection_name: COLLECTION_NAME,
    });

    if (hasCollection) {
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
        { name: "book_id", data_type: DataType.VarChar, max_length: 100 },
        { name: "book_name", data_type: DataType.VarChar, max_length: 200 },
        { name: "chapter_num", data_type: DataType.Int32 }, // 第几章
        { name: "index", data_type: DataType.Int32 }, // 第几个分块
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

// 插入电子书文档
const insertEBookDocuments = async (documents, chapterNum, bookId) => {
  try {
    const documentsData = await Promise.all(
      documents.map(async (document, index) => {
        return {
          id: `${bookId}_${chapterNum}_${index + 1}`,
          book_id: bookId,
          book_name: BOOK_NAME,
          chapter_num: chapterNum,
          index: index + 1,
          content: document,
          vector: await getEmbedding(document),
        };
      }),
    );

    const insertResult = await client.insert({
      collection_name: COLLECTION_NAME,
      data: documentsData,
    });
    return Number(insertResult.insert_cnt) || 0;
  } catch (error) {
    console.error("插入电子书文档失败:", error);
    throw error;
  }
};

const EPUB_FILE = "./活着.epub";
// 从文件名提取书名（去掉扩展名）
const BOOK_NAME = path.parse(EPUB_FILE).name;

// 加载并处理电子书
const loadAndProcessEBooks = async (bookId) => {
  try {
    // 加载电子书
    const loader = new EPubLoader(
      path.resolve(EPUB_FILE), // 相对路径加载当前目录下的活着.epub文件
      {
        splitByChapter: true, // 是否按章节分块
      },
    );

    const documents = await loader.load();

    const chunkSize = 1000;
    // 分块大小， 每个 chunk 的最大字符数
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize, // 每个 chunk 的最大字符数
      chunkOverlap: 100, // 前后 chunk 重叠字符数
    });

    let totalInserted = 0;

    for (
      let chapterIndex = 0;
      chapterIndex < documents.length;
      chapterIndex++
    ) {
      const chapter = documents[chapterIndex];

      console.log(`----- ${chapter.metadata.chapter} 开始分块...`);

      // 提取章节内容
      const chapterContent = chapter.pageContent;

      // 分块章节内容
      const chapterDocuments = await textSplitter.splitText(chapterContent);
      console.log(
        `----- ${chapter.metadata.chapter} 分块完成，共 ${chapterDocuments.length} 个分块`,
      );

      if (chapterDocuments.length === 0) {
        console.log(`${chapter.metadata.chapter} 分块为空，跳过`);
        continue;
      }

      const insertedCount = await insertEBookDocuments(
        chapterDocuments,
        chapterIndex + 1,
        bookId,
      );
      totalInserted += insertedCount;
      console.log(`已插入 ${insertedCount} 条记录（累计: ${totalInserted}）\n`);
    }

    console.log(`\n总共插入 ${totalInserted} 条记录\n`);
    return totalInserted;
  } catch (error) {
    console.error("加载并处理电子书失败:", error);
  }
};

// 查询电子书
const queryEBookCollection = async (query) => {
  console.log(`问题: ${query}`);

  const queryVector = await getEmbedding(query);

  const queryResult = await client.search({
    collection_name: COLLECTION_NAME, // 集合名称
    vector: queryVector, // 查询向量
    limit: 5, // 返回结果数量
    metric_type: MetricType.COSINE, // 余弦相似度
    output_fields: ["id", "book_id", "chapter_num", "index", "content"],
  });

  return queryResult.results;
};

// 主函数
const main = async () => {
  console.log("connecting to milvus...");
  await client.connectPromise;
  console.log("✔️ connected successfully");

  // 创建集合
  const isCreated = await createEBookCollection();
  if (isCreated) {
    // 集合创建成功
    const bookId = 1;
    // 加载并处理电子书
    await loadAndProcessEBooks(bookId);
    console.log("✔️ load and process e_books successfully");
  } else {
    // 集合创建失败，则表明已存在集合，则直接加载集合即可
    // 如果已经加载，会报错，忽略即可
    try {
      await client.loadCollection({ collection_name: COLLECTION_NAME });
      console.log("✔️ collection loaded successfully");
    } catch (error) {
      // 如果已经加载，会报错，忽略即可
      if (!error.message.includes("already loaded")) {
        throw error;
      }
      console.log("✔️ collection already loaded");
    }
  }

  const query = "徐福贵的儿女有哪些？";
  const results = await await queryEBookCollection(query);
  if (results.length === 0) {
    console.log("没有找到相关结果");
    return "没有找到相关结果";
  }

  // 构建上下文
  const context = results
    .map((item, i) => {
      return `
      [片段 ${i + 1}]
      章节: 第 ${item.chapter_num} 章
      内容: ${item.content}`;
    })
    .join("\n\n━━━━━\n\n");

  // 构建提示词
  const prompt = `
    你是一个专业的电子书搜索助手，你的任务是根据用户的问题，从电子书中中提取相关的内容。
    电子书的名称是 ${BOOK_NAME}，用户的问题是 ${query}。
    请根据以下上下文回答用户的问题：
    ${context}
    `;

  console.log("\n【AI 回答】");
  const response = await model.invoke(prompt);
  console.log(response.content);
  console.log("\n");

  return response.content;
};

main();
