import { tool } from "@langchain/core/tools";
import fs from "node:fs/promises";
import path from "node:path";
import z from "zod";
import { spawn } from "node:child_process";

// 工具：读取文件工具，直接复制之前的那个
const readFileTool = tool(
  async ({ filePath }) => {
    const content = await fs.readFile(filePath, "utf-8");
    console.log(
      ` [工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`,
    );
    return `文件内容:\n${content}`;
  },
  {
    name: "read_file",
    description:
      "用此工具来读取文件内容。当用户要求读取文件、查看代码、分析文件内容时，调用此工具。输入文件路径（可以是相对路径或绝对路径）",
    schema: z.object({
      filePath: z.string().describe("要读取的文件路径"),
    }),
  },
);

// 工具：写入文件工具
const writeFileTool = tool(
  async ({ filePath, content }) => {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, "utf-8");
      console.log(
        ` [工具调用] write_file("${filePath}") - 成功写入 ${content.length} 字节`,
      );
      return `文件写入成功: ${filePath}`;
    } catch (error) {
      console.log(
        ` [工具调用] write_file("${filePath}") - 错误: ${error.message}`,
      );
      return `文件写入失败: ${error.message}`;
    }
  },
  {
    name: "write_file",
    description: "向指定路径写入文件内容，自动创建目录",
    schema: z.object({
      filePath: z.string().describe("文件路径"),
      content: z.string().describe("要写入的文件内容"),
    }),
  },
);

// 工具：执行命令工具
const executeCommandTool = tool(
  async ({ command, workingDirectory }) => {
    console.log(` [工具调用] execute_command("${command}")`);
    return new Promise((resolve) => {
      // 复制之前的 node_exec 进行改造

      // 执行命令的工作目录
      const cwd = workingDirectory || process.cwd();

      // 解析命令，分成命令和参数
      const [cmd, ...args] = command.split(" ");

      // 执行命令
      const child = spawn(cmd, args, {
        cwd, // 执行命令的工作目录
        stdio: "inherit", // 继承父进程的 stdio，方便查看命令输出
        shell: true, // 启用 shell 功能，方便执行复杂命令
      });

      // 子进程错误信息
      let errorMsg = "";

      // 监听子进程错误事件
      child.on("error", (error) => {
        errorMsg = error.message;
      });

      // 监听子进程关闭事件
      child.on("close", (code) => {
        if (code === 0) {
          console.log(` [工具调用] execute_command("${command}") - 成功执行`);
          const cwdInfo = workingDirectory
            ? `\n\n重要提示：命令在目录 "${workingDirectory}" 中执行成功。如果需要在这个项目目录中继续执行命令，请使用 workingDirectory: "${workingDirectory}" 参数，不要使用 cd 命令。`
            : "";
          resolve(`命令执行成功: ${command}${cwdInfo}`);
        } else {
          resolve(`命令执行失败，退出码: ${code}，错误: ${errorMsg}`);
        }
      });
    });
  },
  {
    name: "execute_command",
    description: "执行系统命令，支持指定工作目录，实时显示输出",
    schema: z.object({
      command: z.string().describe("要执行的命令"),
      workingDirectory: z.string().optional().describe("工作目录(推荐指定)"),
    }),
  },
);

// 工具：列出目录工具
const listDirectoryTool = tool(
  async ({ directoryPath }) => {
    try {
      const files = await fs.readdir(directoryPath);
      console.log(
        ` [工具调用] list_directory("${directoryPath}") - 找到 ${files.length} 个`,
      );
      return `目录内容: \n${files.map((f) => `- ${f}`).join("\n")}`;
    } catch (error) {
      console.log(
        ` [工具调用] list_directory("${directoryPath}") - 错误: ${error.message}`,
      );
      return `列出目录失败: ${error.message}`;
    }
  },
  {
    name: "list_directory",
    description: "列出指定目录下的所有文件和文件夹",
    schema: z.object({
      directoryPath: z.string().describe("目录路径"),
    }),
  },
);

export { readFileTool, writeFileTool, executeCommandTool, listDirectoryTool };
