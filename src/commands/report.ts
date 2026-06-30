import { spawn } from "node:child_process";
import { Command } from "commander";
import pc from "picocolors";
import { loadConfig } from "../core/config.js";
import { scanRepository } from "../core/scanner.js";
import { writeHtmlReport } from "../render/html.js";

export function reportCommand(): Command {
  return new Command("report")
    .description("Render a local HTML readiness report / 生成本地 HTML 就绪度报告")
    .argument("[path]", "repository path / 仓库路径", ".")
    .option("--open", "open the report in the default browser / 用默认浏览器打开报告")
    .action(async (targetPath: string, options: { open?: boolean }) => {
      const scan = await scanRepository(targetPath);
      const config = await loadConfig(scan.root);
      const filePath = await writeHtmlReport(scan, config.outputDir);
      console.log(`${pc.green("Report written / 报告已生成")}: ${filePath}`);

      if (options.open) {
        openFile(filePath);
      }
    });
}

function openFile(filePath: string): void {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", filePath], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  if (process.platform === "darwin") {
    spawn("open", [filePath], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  spawn("xdg-open", [filePath], { detached: true, stdio: "ignore" }).unref();
}
