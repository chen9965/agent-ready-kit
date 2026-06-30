#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { reportCommand } from "./commands/report.js";
import { addScanOptions, runScanCommand, scanCommand, type ScanCommandOptions } from "./commands/scan.js";

const program = addScanOptions(
  new Command()
    .name("agent-ready")
    .description("Make any repository AI-agent-ready in 60 seconds. / 60 秒让仓库适配 AI 编码代理。")
    .version("0.6.0")
    .argument("[target]", "repository path, GitHub URL, or owner/repo / 仓库路径、GitHub 网址或 owner/repo", ".")
).action((target: string, _options: ScanCommandOptions, command: Command) =>
  runScanCommand(target, command.optsWithGlobals() as ScanCommandOptions)
);

program.addCommand(scanCommand());
program.addCommand(initCommand());
program.addCommand(reportCommand());

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`agent-ready failed / 执行失败: ${message}`);
  process.exitCode = 1;
});
