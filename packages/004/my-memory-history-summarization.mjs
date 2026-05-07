import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { FileSystemChatMessageHistory } from "@langchain/community/stores/message/file_system";
import path from "path";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  getBufferString,
} from "@langchain/core/messages";
import { getEncoding } from "js-tiktoken";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  temperature: 0, // 温度，0 表示最确定的回答，不要自己发挥
});

// 指定存储文件的路径
const filePath = path.join(process.cwd(), "chat_history.json");
const sessionId = "user_session_001";

// 创建文件系统历史记录对象
const history = new FileSystemChatMessageHistory({
  filePath,
  sessionId,
});

// 基于消息历史记录生成消息摘要
const summarizeHistory = async (messages) => {
  if (messages.length === 0) return "";

  const conversationText = getBufferString(messages);

  const summaryPrompt = `
    请总结以下对话的核心内容，保留重要信息：
    ${conversationText}
    总结:
    `;

  const summary = await model.invoke([new SystemMessage(summaryPrompt)]);
  return summary.content;
};

// 消息摘要-根据消息数量触发总结
const summarizationByCount = async (messages) => {
  const maxMessageCount = 4; // 超过最大消息数量就触发总结

  const history = new InMemoryChatMessageHistory();

  for (const message of messages) {
    if (message.type === "human") {
      await history.addMessage(new HumanMessage(message.content));
    } else {
      await history.addMessage(new AIMessage(message.content));
    }
  }

  const allMessages = await history.getMessages();
  console.log(`\n summarizationByCount 原始消息数量: ${allMessages.length}`);

  if (allMessages.length >= maxMessageCount) {
    console.log(`超过 ${maxMessageCount} 条消息，触发总结...`);

    const keepMessageCount = 2; // 保留 n 条消息

    const summaryMessages = allMessages.slice(0, -keepMessageCount);
    console.log(`要总结的消息数量: ${summaryMessages.length}`);
    summaryMessages.forEach((msg, index) => {
      const type = msg.type;
      const prefix = type === "human" ? "用户" : "助手";
      console.log(
        ` ${index + 1}. [${prefix}]: ${msg.content.substring(0, 50)}...`,
      );
    });

    const summary = await summarizeHistory(summaryMessages);
    console.log(`\n 总结结果: ${summary} \n`);

    const newMessages = allMessages.slice(-keepMessageCount);
    console.log(`要保留的消息数量: ${newMessages.length}`);
    newMessages.forEach((msg, index) => {
      const type = msg.type;
      const prefix = type === "human" ? "用户" : "助手";
      console.log(
        ` ${index + 1}. [${prefix}]: ${msg.content.substring(0, 50)}...`,
      );
    });

    await history.clear(); // 清空历史记录

    await history.addMessages(newMessages);
  }
};

const countTokens = (messages, encoder) => {
  let total = 0;
  for (const msg of messages) {
    const content =
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content);
    total += encoder.encode(content).length;
  }
  return total;
};

// 消息摘要-根据 token 数量触发总结
const summarizationByToken = async (messages) => {
  const maxTokenCount = 5000; //  超过最大token数量就触发总结

  const history = new InMemoryChatMessageHistory();

  for (const message of messages) {
    if (message.type === "human") {
      await history.addMessage(new HumanMessage(message.content));
    } else {
      await history.addMessage(new AIMessage(message.content));
    }
  }

  const allMessages = await history.getMessages();
  console.log(`\n summarizationByToken 原始消息数量: ${allMessages.length}`);

  const enc = getEncoding("cl100k_base"); // 使用cl100k_base编码器

  const allMessagesTokenCount = countTokens(allMessages, enc);
  console.log(`总token数量: ${allMessagesTokenCount}`);

  if (allMessagesTokenCount >= maxTokenCount) {
    console.log(`超过 ${maxTokenCount} 个token，触发总结...`);
    const keepTokenCount = Math.floor(allMessagesTokenCount * 0.6); // 保留 n 个token，60%
    console.log(`保留token数量: ${keepTokenCount}`);

    const newMessages = [];
    let newMessagesTokenCount = 0;

    for (let i = allMessages.length - 1; i >= 0; i--) {
      const msg = allMessages[i];
      const msgTokenCount = countTokens([msg], enc);
      if (newMessagesTokenCount + msgTokenCount <= keepTokenCount) {
        newMessagesTokenCount += msgTokenCount;
        newMessages.unshift(msg);
      } else break;
    }

    const summaryMessages = allMessages.slice(0, -newMessages.length);
    const summaryMessagesTokenCount = countTokens(summaryMessages, enc);
    console.log(`要总结的消息数量: ${summaryMessages.length}`);
    console.log(`要总结的token数量: ${summaryMessagesTokenCount}`);
    summaryMessages.forEach((msg, index) => {
      const type = msg.type;
      const prefix = type === "human" ? "用户" : "助手";
      console.log(
        ` ${index + 1}. [${prefix}]: ${msg.content.substring(0, 50)}...`,
      );
    });

    const summary = await summarizeHistory(summaryMessages);
    console.log(`\n 总结结果: ${summary} \n`);

    console.log(`要保留的消息数量: ${newMessages.length}`);
    newMessages.forEach((msg, index) => {
      const type = msg.type;
      const prefix = type === "human" ? "用户" : "助手";
      console.log(
        ` ${index + 1}. [${prefix}]: ${msg.content.substring(0, 50)}...`,
      );
    });

    await history.clear(); // 清空历史记录

    await history.addMessages(newMessages);
  }
};

const main = async () => {
  await summarizationByCount(await history.getMessages());
  await summarizationByToken(await history.getMessages());
};

main();
