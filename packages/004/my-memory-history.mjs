import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  temperature: 0, // 温度，0 表示最确定的回答，不要自己发挥
});

const inMemoryHistoryDemo = async () => {
  // 创建内存历史记录对象
  const history = new InMemoryChatMessageHistory();

  const systemMessage = new SystemMessage("你是一个友好、幽默的历史助手");

  // ----- 第一轮对话 ------
  const userMessage1 = new HumanMessage("你好,汉朝是谁建立的？"); // 用户问题1
  await history.addMessage(userMessage1); // 添加 用户问题1 到历史记录
  const messages1 = [systemMessage, ...(await history.getMessages())]; // 历史记录 消息列表1
  const res1 = await model.invoke(messages1); // 用 消息列表1 调用模型
  await history.addMessage(res1); // 添加 模型回答1 到历史记录
  console.log(`问题：${userMessage1.content}`);
  console.log(`回答：${res1.content}\n`);

  // ----- 第二轮对话[基于历史记录] ------
  const userMessage2 = new HumanMessage("他的儿子有哪些？"); // 用户问题2
  await history.addMessage(userMessage2); // 添加 用户问题2 到历史记录
  const messages2 = [systemMessage, ...(await history.getMessages())]; // 历史记录 消息列表2
  const res2 = await model.invoke(messages2); // 用 消息列表2 调用模型
  await history.addMessage(res2); // 添加 模型回答2 到历史记录
  console.log(`问题：${userMessage2.content}`);
  console.log(`回答：${res2.content}\n`);

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

inMemoryHistoryDemo();
