import path from "node:path";
import { Command } from "commander";
import pc from "picocolors";
import { enhanceScanWithLlm, withLlmDisabledStatus, withLlmRunStatus } from "../core/llm.js";
import { scanRepository } from "../core/scanner.js";
import { resolveScanTarget, type ResolvedScanTarget } from "../core/target.js";
import { writeScanArtifacts } from "../render/artifacts.js";
import { renderMarkdownSummary } from "../render/markdown.js";
import { renderScanSummary } from "../render/text.js";
import type { ScanResult } from "../types.js";

export interface ScanCommandOptions {
  json?: boolean;
  markdown?: boolean;
  failUnder?: string;
  out?: string;
  llm?: boolean;
  managedLlm?: boolean;
  llmManagedUrl?: string;
  llmSummary?: boolean;
  llmCode?: boolean;
  llmProvider?: string;
  llmBaseUrl?: string;
  llmModel?: string;
  llmMaxFiles?: string;
  llmMaxChars?: string;
}

export function scanCommand(): Command {
  return addScanOptions(
    new Command("scan")
    .description("Inspect a repository for AI-agent readiness / 检查仓库的 AI 代理就绪度")
      .argument("[target]", "repository path, GitHub URL, or owner/repo / 仓库路径、GitHub 网址或 owner/repo", ".")
  ).action((target: string, _options: ScanCommandOptions, command: Command) =>
    runScanCommand(target, command.optsWithGlobals() as ScanCommandOptions)
  );
}

export function addScanOptions(command: Command): Command {
  return command
    .option("--json", "print JSON / 输出 JSON")
    .option("--markdown", "print GitHub-flavored Markdown / 输出 Markdown")
    .option("--fail-under <score>", "exit with code 1 below this score / 低于该分数时返回失败")
    .option("--out <dir>", "write scan artifacts to a directory / 写入扫描产物目录")
    .option("--llm", "enable model-enhanced recommendations (default) / 启用大模型增强建议（默认）")
    .option("--no-llm", "skip model-enhanced recommendations / 跳过大模型增强建议")
    .option("--no-managed-llm", "skip the maintainer-hosted LLM proxy / 跳过维护者托管的大模型代理")
    .option("--llm-managed-url <url>", "maintainer-hosted LLM proxy URL / 维护者托管的大模型代理地址")
    .option("--llm-summary", "send only scan summary, not sampled code / 只发送扫描摘要，不发送采样代码")
    .option("--llm-code", "send sampled code context to the LLM (default) / 向大模型发送采样代码上下文（默认）")
    .option("--llm-provider <name>", "provider preset: openrouter, agnes, siliconflow, gemini, groq / 服务商预设")
    .option("--llm-base-url <url>", "OpenAI-compatible API base URL / OpenAI 兼容接口地址")
    .option("--llm-model <model>", "provider model name / 服务商模型名称")
    .option("--llm-max-files <count>", "maximum sampled files for --llm-code / --llm-code 最多采样文件数")
    .option("--llm-max-chars <count>", "maximum sampled characters for --llm-code / --llm-code 最多采样字符数");
}

export async function runScanCommand(targetPath: string, options: ScanCommandOptions): Promise<void> {
  if (options.json && options.markdown) {
    throw new Error("Use either --json or --markdown, not both. / --json 和 --markdown 不能同时使用。");
  }

  const target = await resolveScanTarget(targetPath);
  try {
    if (target.metadata.kind === "github-url" && target.metadata.sourceUrl) {
      console.error(`${pc.cyan("Remote repository / 远程仓库")}: ${target.metadata.sourceUrl}`);
    }

    let scan: ScanResult = withTargetMetadata(await scanRepository(target.root), target);
    if (options.llm !== false) {
      const result = await enhanceScanWithLlm(scan, {
        managedUrl: options.llmManagedUrl,
        useManaged: options.managedLlm,
        provider: options.llmProvider,
        baseUrl: options.llmBaseUrl,
        model: options.llmModel,
        includeCodeContext: !options.llmSummary,
        codeMaxFiles: parseOptionalPositiveInt(options.llmMaxFiles, "--llm-max-files"),
        codeMaxChars: parseOptionalPositiveInt(options.llmMaxChars, "--llm-max-chars")
      });
      scan = withLlmRunStatus(result);
      if (result.status !== "ok" && result.message) {
        console.error(`${pc.yellow("LLM note / 大模型提示")}: ${result.message}`);
      }
    } else {
      scan = withLlmDisabledStatus(scan);
    }

    const failUnder = parseOptionalScore(options.failUnder);

    if (options.json) {
      console.log(JSON.stringify(scan, null, 2));
    } else if (options.markdown) {
      console.log(renderMarkdownSummary(scan, { minScore: failUnder ?? 70 }));
    } else {
      console.log(renderScanSummary(scan));
    }

    if (options.out) {
      const artifactDir = resolveArtifactOutputDir(options.out, target);
      const result = await writeScanArtifacts(scan, artifactDir);
      console.log(`${pc.green("Artifacts written / 扫描产物已生成")}: ${result.outputDir}`);
      for (const file of result.written) console.log(`- ${file}`);
    }

    if (failUnder !== undefined && scan.score.overall < failUnder) {
      console.error(`Score ${scan.score.overall} is below ${failUnder}. / 分数 ${scan.score.overall} 低于 ${failUnder}。`);
      process.exitCode = 1;
    }
  } finally {
    await target.cleanup();
  }
}

function parseOptionalScore(value?: string): number | undefined {
  if (value === undefined) return undefined;
  const score = Number.parseInt(value, 10);
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error(`--fail-under must be an integer from 0 to 100, received "${value}"`);
  }
  return score;
}

function parseOptionalPositiveInt(value: string | undefined, flag: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer, received "${value}"`);
  }
  return parsed;
}

function withTargetMetadata(scan: ScanResult, target: ResolvedScanTarget): ScanResult {
  return { ...scan, target: target.metadata };
}

function resolveArtifactOutputDir(outputDir: string, target: ResolvedScanTarget): string {
  if (path.isAbsolute(outputDir) || target.metadata.kind === "local") return outputDir;
  return path.resolve(process.cwd(), outputDir);
}
