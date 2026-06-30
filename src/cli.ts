#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { reportCommand } from "./commands/report.js";
import { scanCommand } from "./commands/scan.js";

const program = new Command()
  .name("agent-ready")
  .description("Make any repository AI-agent-ready in 60 seconds. / 60 秒让仓库适配 AI 编码代理。")
  .version("0.2.0");

program.addCommand(scanCommand());
program.addCommand(initCommand());
program.addCommand(reportCommand());

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`agent-ready failed / 执行失败: ${message}`);
  process.exitCode = 1;
});
