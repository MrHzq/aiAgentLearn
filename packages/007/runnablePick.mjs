import "dotenv/config";

import {
  RunnableLambda,
  RunnablePick,
  RunnableSequence,
} from "@langchain/core/runnables";

const inputData = {
  name: "Alice",
  age: 30,
  city: "北京",
  country: "中国",
  email: "alice@example.com",
  phone: "+86-13400001234",
};

const chainPick = RunnableSequence.from([
  (input) => ({
    ...input,
    fullInfo: `${input.name} is ${input.age} years old, ${input.city}, ${input.country}`,
  }),
  new RunnablePick(["name", "fullInfo"]),
]);

const result = await chainPick.invoke(inputData);
console.log("result", result);
