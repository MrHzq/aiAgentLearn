import "dotenv/config";

import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";

const addOne = RunnableLambda.from((a) => a + 1);
const multiplyTwo = RunnableLambda.from((a) => a * 2);

const chain = RunnableSequence.from([addOne, multiplyTwo, addOne]);

const result = await chain.invoke(1);
console.log("result", result);
