import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { FileSystemChatMessageHistory } from "@langchain/community/stores/message/file_system";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import path from "path";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  temperature: 0, // 温度，0 表示最确定的回答，不要自己发挥
});

const inMemoryHistoryLongDemo = async () => {
  // 指定存储文件的路径
  const filePath = path.join(process.cwd(), "chat_history.json");
  const sessionId = "user_session_001";

  // 创建文件系统历史记录对象
  const history = new FileSystemChatMessageHistory({
    filePath,
    sessionId,
  });

  const systemMessage = new SystemMessage("你是一个友好、幽默的历史助手");

  // ----- 第一轮对话 ------
  const userMessage1 = new HumanMessage("你好,汉朝是谁建立的？"); // 用户问题1
  await history.addMessage(userMessage1); // 添加 用户问题1 到历史记录
  const messages1 = [systemMessage, ...(await history.getMessages())]; // 历史记录 消息列表1
  const res1 = await model.invoke(messages1); // 用 消息列表1 调用模型
  await history.addMessage(res1); // 添加 模型回答1 到历史记录
  console.log(`问题：${userMessage1.content}`);
  console.log(`回答：${res1.content}\n`);
  console.log(`✓ 对话已保存到文件: ${filePath}\n`);

  // ----- 第二轮对话[基于历史记录] ------
  const userMessage2 = new HumanMessage("他的儿子有哪些？"); // 用户问题2
  await history.addMessage(userMessage2); // 添加 用户问题2 到历史记录
  const messages2 = [systemMessage, ...(await history.getMessages())]; // 历史记录 消息列表2
  const res2 = await model.invoke(messages2); // 用 消息列表2 调用模型
  await history.addMessage(res2); // 添加 模型回答2 到历史记录
  console.log(`问题：${userMessage2.content}`);
  console.log(`回答：${res2.content}\n`);
  console.log(`✓ 对话已更新到文件: ${filePath}\n`);

  // ----- 第三轮对话[基于历史记录] ------
  const userMessage3 = new HumanMessage("他的老婆有哪些？"); // 用户问题3
  await history.addMessage(userMessage3); // 添加 用户问题3 到历史记录
  const messages3 = [systemMessage, ...(await history.getMessages())]; // 历史记录 消息列表3
  const res3 = await model.invoke(messages3); // 用 消息列表3 调用模型
  await history.addMessage(res3); // 添加 模型回答3 到历史记录
  console.log(`问题：${userMessage3.content}`);
  console.log(`回答：${res3.content}\n`);
  console.log(`✓ 对话已更新到文件: ${filePath}\n`);

  const allMessages = await history.getMessages();
  console.log(`共保存了${allMessages.length}条消息`);
  allMessages.forEach((msg, index) => {
    const type = msg.type;
    const prefix = type === "human" ? "用户" : "助手";
    console.log(
      ` ${index + 1}. [${prefix}]: ${msg.content.substring(0, 50)}...`,
    );
  });
};

inMemoryHistoryLongDemo();
