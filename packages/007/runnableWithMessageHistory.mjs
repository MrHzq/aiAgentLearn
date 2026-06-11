import "dotenv/config";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { ChatOpenAI } from "@langchain/openai";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  temperature: 0,
});

const prompt = ChatPromptTemplate.fromMessages([
  { role: "system", content: "你是一个专业的助手，你的任务是回答用户的问题。" },
  new MessagesPlaceholder("history"),
  ["human", "{question}"],
]);

// 使用 prompt.pipe 来创建一个简单的链
const simpleChain = prompt.pipe(model).pipe(new StringOutputParser());

const messageHistories = new Map();

const getMessageHistory = (sessionId) => {
  if (!messageHistories.has(sessionId)) {
    messageHistories.set(sessionId, new InMemoryChatMessageHistory());
  }
  return messageHistories.get(sessionId);
};

const chainHistory = new RunnableWithMessageHistory({
  runnable: simpleChain,
  getMessageHistory,
  inputMessagesKey: "question",
  historyMessagesKey: "history",
});

// 测试：第一次对话
console.log("--- 第一次对话（提供信息） ---");
const result1 = await chainHistory.invoke(
  {
    question: "我的名字是Alice，我来自山东，我喜欢编程、写作、金铲铲。",
  },
  {
    configurable: {
      sessionId: "user-123",
    },
  },
);
console.log("问题: 我的名字是Alice，我来自山东，我喜欢编程、写作、金铲铲。");
console.log("回答:", result1);
console.log();

// 测试：第二次对话
console.log("--- 第二次对话（询问之前的信息） ---");
const result2 = await chainHistory.invoke(
  {
    question: "我刚才说我来自哪里？",
  },
  {
    configurable: {
      sessionId: "user-123",
    },
  },
);
console.log("问题: 我刚才说我来自哪里？");
console.log("回答:", result2);
console.log();

// 测试：第三次对话
console.log("--- 第三次对话（继续询问） ---");
const result3 = await chainHistory.invoke(
  {
    question: "我的爱好是什么？",
  },
  {
    configurable: {
      sessionId: "user-123",
    },
  },
);
console.log("问题: 我的爱好是什么？");
console.log("回答:", result3);
console.log();
