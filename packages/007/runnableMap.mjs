import "dotenv/config";

import { RunnableLambda, RunnableMap } from "@langchain/core/runnables";

import { PromptTemplate } from "@langchain/core/prompts";

const addOne = RunnableLambda.from((input) => input.num + 1);
const multiplyTwo = RunnableLambda.from((input) => input.num * 2);
const square = RunnableLambda.from((input) => input.num * input.num);

const helloPrompt = PromptTemplate.fromTemplate("你好, {name}!");
const weatherPrompt = PromptTemplate.fromTemplate("今天天气是 {weather}");

const chainMap = RunnableMap.from({
  // 数学运算
  add: addOne,
  multiply: multiplyTwo,
  square: square,

  // prompt 格式化
  hello: helloPrompt,
  weather: weatherPrompt,
});

const result = await chainMap.invoke({ name: "张三", weather: "晴", num: 1 });
console.log("result", result);
