import "dotenv/config";
import { RunnableLambda, RouterRunnable } from "@langchain/core/runnables";

// 创建 RunnableLambda
const toUpperCase = RunnableLambda.from((text) => text.toUpperCase());
const reverseText = RunnableLambda.from((text) =>
  text.split("").reverse().join(""),
);

const chainRouter = new RouterRunnable({
  runnables: { toUpperCase, reverseText },
});

const result1 = await chainRouter.invoke({
  key: "toUpperCase",
  input: "Hello World",
});
console.log("result1", result1);

const result2 = await chainRouter.invoke({
  key: "reverseText",
  input: "Hello World",
});
console.log("result2", result2);
