import "dotenv/config";
import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const cheerioLoader = new CheerioWebBaseLoader(
  "https://juejin.cn/post/7621878684524740671", // 掘金上的某篇文章
  {
    selector: ".main-area p", // 取出 .main-area 下所有 p 标签的内容
  },
);

const documents = await cheerioLoader.load();
console.log(documents);

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 400, // 每个 chunk 的最大字符数
  chunkOverlap: 50, // 前后 chunk 重叠字符数
  separators: ["。", "，"], // 分隔符
});

const splitDocuments = await textSplitter.splitDocuments(documents);

console.log(splitDocuments);
console.log(splitDocuments.length);
