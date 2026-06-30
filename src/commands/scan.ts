import { Command } from "commander";
import { scanRepository } from "../core/scanner.js";
import { renderMarkdownSummary } from "../render/markdown.js";
import { renderScanSummary } from "../render/text.js";

export function scanCommand(): Command {
  return new Command("scan")
    .description("Inspect a repository for AI-agent readiness / 检查仓库的 AI 代理就绪度")
    .argument("[path]", "repository path / 仓库路径", ".")
    .option("--json", "print JSON / 输出 JSON")
    .option("--markdown", "print GitHub-flavored Markdown / 输出 Markdown")
    .option("--fail-under <score>", "exit with code 1 below this score / 低于该分数时返回失败")
    .action(async (targetPath: string, options: { json?: boolean; markdown?: boolean; failUnder?: string }) => {
      if (options.json && options.markdown) {
        throw new Error("Use either --json or --markdown, not both. / --json 和 --markdown 不能同时使用。");
      }

      const scan = await scanRepository(targetPath);
      const failUnder = parseOptionalScore(options.failUnder);

      if (options.json) {
        console.log(JSON.stringify(scan, null, 2));
      } else if (options.markdown) {
        console.log(renderMarkdownSummary(scan, { minScore: failUnder ?? 70 }));
      } else {
        console.log(renderScanSummary(scan));
      }

      if (failUnder !== undefined && scan.score.overall < failUnder) {
        console.error(`Score ${scan.score.overall} is below ${failUnder}. / 分数 ${scan.score.overall} 低于 ${failUnder}。`);
        process.exitCode = 1;
      }
    });
}

function parseOptionalScore(value?: string): number | undefined {
  if (value === undefined) return undefined;
  const score = Number.parseInt(value, 10);
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error(`--fail-under must be an integer from 0 to 100, received "${value}"`);
  }
  return score;
}
