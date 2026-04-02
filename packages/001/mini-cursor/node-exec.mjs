import { spawn } from "node:child_process";

// 要执行命令
const command =
  "echo -e 'n\nn' | npm create vite@latest my-vue3-project -- --template vue"; // 执行命令的工作目录
const cwd = process.cwd();

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
    process.exit(0);
  } else {
    if (errorMsg) {
      console.error(`错误: ${errorMsg}`);
    } else {
      console.error(`子进程退出码: ${code}`);
    }

    process.exit(code || 1);
  }
});
