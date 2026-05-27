import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import mysql from "mysql2/promise";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 千问模型固定
  },
  temperature: 0, // 温度，0 表示最确定的回答，不要自己发挥
});

// 定义单个好友信息的 zod schema，匹配 friends 表结构
const friendSchema = z.object({
  name: z.string().describe("姓名"),
  gender: z.string().describe("性别（男/女）"),
  birth_date: z
    .string()
    .describe("出生日期，格式：YYYY-MM-DD，如果无法确定具体日期，根据年龄估算"),
  company: z.string().nullable().describe("公司名称，如果没有则返回 null"),
  title: z.string().nullable().describe("职位/头衔，如果没有则返回 null"),
  phone: z.string().nullable().describe("手机号，如果没有则返回 null"),
  wechat: z.string().nullable().describe("微信号，如果没有则返回 null"),
});

// 定义批量好友信息的 schema（数组）
const friendsArraySchema = z.array(friendSchema).describe("好友信息数组");

// 使用 withStructuredOutput 方法
const structuredModel = model.withStructuredOutput(friendsArraySchema);

const connectionConfig = {
  host: "localhost",
  port: "3307",
  user: "root",
  password: "1234",
  multipleStatements: true,
};

const extractAndInsert = async (text) => {
  // 创建数据库连接
  const connection = await mysql.createConnection(connectionConfig);

  // 切换到 test1 数据库
  await connection.query(`USE test1;`);

  const prompt = `请从以下文本中提取所有好友信息，文本中可能包含一个或多个人的信息。请将每个人的信息分别提取出来，返回一个数组。

${text}

要求：
1. 如果文本中包含多个人，请为每个人创建一个对象
2. 每个对象包含以下字段：
   - 姓名：提取文本中的人名
   - 性别：提取性别信息（男/女）
   - 出生日期：如果能找到具体日期最好，否则根据年龄描述估算（格式：YYYY-MM-DD）
   - 公司：提取公司名称
   - 职位：提取职位/头衔信息
   - 手机号：提取手机号码
   - 微信号：提取微信号
3. 如果某个字段在文本中找不到，请返回 null
4. 返回格式必须是一个数组，即使只有一个人也要放在数组中`;

  const results = await structuredModel.invoke(prompt);

  if (!results.length) {
    return { count: 0 };
  }

  const insertSql = `
   INSERT INTO friends (
    name,
    gender,
    birth_date,
    company,
    title,
    phone,
    wechat
   ) VALUES ?;
  `;

  const values = results.map((item) => [
    item.name,
    item.gender,
    item.birth_date,
    item.company,
    item.title,
    item.phone,
    item.wechat,
  ]);

  const [result] = await connection.query(insertSql, [values]);

  return {
    count: result.affectedRows,
  };
};

const main = async () => {
  const sampleText = `我最近认识了几个新朋友。第一个是张总，女的，看起来30出头，在腾讯做技术总监，手机13800138000，微信是zhangzong2024。第二个是李工，男，大概28岁，在阿里云做架构师，电话15900159000，微信号lee_arch。还有一个是陈经理，女，35岁左右，在美团做产品经理，手机号是18800188000，微信chenpm2024。`;
  const result = await extractAndInsert(sampleText);
  if (result.count === 0) {
    console.log("没有提取到任何好友信息");
  } else {
    console.log(`✅ 成功批量插入 ${result.count} 条数据`);
  }
};

main();
