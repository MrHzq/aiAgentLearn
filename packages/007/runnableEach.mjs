import "dotenv/config";

import {
  RunnableLambda,
  RunnableEach,
  RunnableSequence,
} from "@langchain/core/runnables";

const toUpperCase = RunnableLambda.from((input) => input.toUpperCase());
const addGreeting = RunnableLambda.from((input) => `你好，${input}！`);

const chain = RunnableSequence.from([toUpperCase, addGreeting]);

const chainEach = new RunnableEach({ bound: chain });

const input = ["alice", "bob", "carol"];
const result = await chainEach.invoke(input);
console.log("✅ RunnableEach - 数组元素处理:");
console.log("输入:", input);
console.log("输出:", result);
