import { appendFile } from "node:fs/promises";
import path from "node:path";
import { enhanceScanWithLlm, withLlmDisabledStatus, withLlmRunStatus } from "./core/llm.js";
import { scanRepository } from "./core/scanner.js";
import { renderMarkdownSummary } from "./render/markdown.js";

async function main(): Promise<void> {
  const inputPath = readInput("INPUT_PATH", ".");
  const minScore = parseScore(readInput("INPUT_MIN_SCORE", "70"));
  const writeSummary = parseBoolean(readInput("INPUT_WRITE_SUMMARY", "true"));
  const useLlm = parseBoolean(readInput("INPUT_LLM", "true"));
  const targetPath = path.resolve(process.cwd(), inputPath);

  let scan = await scanRepository(targetPath);
  if (useLlm) {
    const result = await enhanceScanWithLlm(scan, {
      managedUrl: readOptionalInput("INPUT_LLM_MANAGED_URL"),
      useManaged: parseBoolean(readInput("INPUT_MANAGED_LLM", "true")),
      includeCodeContext: !parseBoolean(readInput("INPUT_LLM_SUMMARY", "false")),
      codeMaxFiles: parseOptionalPositiveInteger(readOptionalInput("INPUT_LLM_MAX_FILES"), "llm-max-files"),
      codeMaxChars: parseOptionalPositiveInteger(readOptionalInput("INPUT_LLM_MAX_CHARS"), "llm-max-chars")
    });
    scan = withLlmRunStatus(result);
    if (result.status !== "ok" && result.message) {
      console.warn(`agent-ready LLM fallback: ${result.message}`);
    }
  } else {
    scan = withLlmDisabledStatus(scan);
  }

  const status = scan.score.overall >= minScore ? "pass" : "fail";

  await writeOutput("score", String(scan.score.overall));
  await writeOutput("status", status);
  await writeOutput("finding-count", String(scan.findings.length));

  const summary = renderMarkdownSummary(scan, { minScore });
  if (writeSummary && process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, "utf8");
  }

  console.log(`agent-ready score: ${scan.score.overall}/100`);
  console.log(`agent-ready status: ${status}`);

  if (status === "fail") {
    console.error(`Score ${scan.score.overall} is below the required minimum ${minScore}.`);
    process.exitCode = 1;
  }
}

function readInput(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function readOptionalInput(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function parseScore(value: string): number {
  const score = Number.parseInt(value, 10);
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error(`min-score must be an integer from 0 to 100, received "${value}"`);
  }
  return score;
}

function parseBoolean(value: string): boolean {
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parseOptionalPositiveInteger(value: string | undefined, label: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer, received "${value}"`);
  }
  return parsed;
}

async function writeOutput(name: string, value: string): Promise<void> {
  if (!process.env.GITHUB_OUTPUT) return;
  await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, "utf8");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`agent-ready action failed: ${message}`);
  process.exitCode = 1;
});
