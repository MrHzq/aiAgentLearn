import { FileSystemChatMessageHistory } from "@langchain/community/stores/message/file_system";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import {
  AIMessage,
  HumanMessage,
  trimMessages,
} from "@langchain/core/messages";
import path from "path";
import { getEncoding } from "js-tiktoken";

// 指定存储文件的路径
const filePath = path.join(process.cwd(), "chat_history.json");
const sessionId = "user_session_001";

// 创建文件系统历史记录对象
const history = new FileSystemChatMessageHistory({
  filePath,
  sessionId,
});

// 消息数量截断
const messageCountTruncation = async (messages) => {
  console.log("开始消息数量截断");
  const maxMessageCount = 4;

  const history = new InMemoryChatMessageHistory();

  for (const message of messages) {
    if (message.type === "human") {
      await history.addMessage(new HumanMessage(message.content));
    } else {
      await history.addMessage(new AIMessage(message.content));
    }
  }

  const allMessages = await history.getMessages();

  const newMessages = allMessages.slice(-maxMessageCount);

  console.log(`保留消息数量: ${newMessages.length}`);
  newMessages.forEach((msg, index) => {
    const type = msg.type;
    const prefix = type === "human" ? "用户" : "助手";
    console.log(
      ` ${index + 1}. [${prefix}]: ${msg.content.substring(0, 50)}...`,
    );
  });
  console.log("完成消息数量截断\n");
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

// token数量截断
const tokenCountTruncation = async (messages) => {
  console.log("开始token数量截断");
  const maxTokenCount = 3000; // 最大token数量

  const history = new InMemoryChatMessageHistory();

  for (const message of messages) {
    if (message.type === "human") {
      await history.addMessage(new HumanMessage(message.content));
    } else {
      await history.addMessage(new AIMessage(message.content));
    }
  }

  const allMessages = await history.getMessages();

  const enc = getEncoding("cl100k_base"); // 使用cl100k_base编码器

  const newMessages = await trimMessages(allMessages, {
    maxTokens: maxTokenCount,
    tokenCounter: async (msgs) => countTokens(msgs, enc),
    strategy: "last", // 保留最近的消息
  });

  const newTokenCount = countTokens(newMessages, enc);

  console.log(`保留消息数量: ${newMessages.length}`);
  console.log(`保留token数量: ${newTokenCount}`);
  newMessages.forEach((msg, index) => {
    const type = msg.type;
    const prefix = type === "human" ? "用户" : "助手";
    const tokenCount = countTokens([msg], enc);
    console.log(
      ` ${index + 1}. [${prefix}]: ${msg.content.substring(0, 50)}... ${tokenCount} 个token`,
    );
  });
  console.log("完成token数量截断\n");
};

const main = async () => {
  await messageCountTruncation(await history.getMessages());
  await tokenCountTruncation(await history.getMessages());
};

main();
