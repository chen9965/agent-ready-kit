import { Command } from "commander";
import { scanRepository } from "../core/scanner.js";
import { renderScanSummary } from "../render/text.js";

export function scanCommand(): Command {
  return new Command("scan")
    .description("Inspect a repository for AI-agent readiness / 检查仓库的 AI 代理就绪度")
    .argument("[path]", "repository path / 仓库路径", ".")
    .option("--json", "print JSON / 输出 JSON")
    .action(async (targetPath: string, options: { json?: boolean }) => {
      const scan = await scanRepository(targetPath);
      if (options.json) {
        console.log(JSON.stringify(scan, null, 2));
      } else {
        console.log(renderScanSummary(scan));
      }
    });
}
