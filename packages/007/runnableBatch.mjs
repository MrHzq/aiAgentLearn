import "dotenv/config";

import { RunnableLambda, RunnableBranch } from "@langchain/core/runnables";

// 创建条件判断函数
const isPositive = RunnableLambda.from((input) => input > 0); // 判断是否为正数
const isNegative = RunnableLambda.from((input) => input < 0); // 判断是否为负数
const isEven = RunnableLambda.from((input) => input % 2 === 0); // 判断是否为偶数

// 创建分支处理函数
const handlePositive = RunnableLambda.from(
  (input) => `正数: ${input} + 10 = ${input + 10}`,
);
const handleNegative = RunnableLambda.from(
  (input) => `负数: ${input} - 10 = ${input - 10}`,
);
const handleEven = RunnableLambda.from(
  (input) => `偶数: ${input} * 2 = ${input * 2}`,
);
const handleDefault = RunnableLambda.from((input) => `默认: ${input}`);

const chainBatch = RunnableBranch.from([
  [isPositive, handlePositive],
  [isNegative, handleNegative],
  [isEven, handleEven],
  handleDefault,
]);

const case1 = [5, -3, 4, -0];

for (const item of case1) {
  const result = await chainBatch.invoke(item);
  console.log("result", result);
}
