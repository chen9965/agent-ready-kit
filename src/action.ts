import { appendFile } from "node:fs/promises";
import path from "node:path";
import { scanRepository } from "./core/scanner.js";
import { renderMarkdownSummary } from "./render/markdown.js";

async function main(): Promise<void> {
  const inputPath = readInput("INPUT_PATH", ".");
  const minScore = parseScore(readInput("INPUT_MIN_SCORE", "70"));
  const writeSummary = parseBoolean(readInput("INPUT_WRITE_SUMMARY", "true"));
  const targetPath = path.resolve(process.cwd(), inputPath);

  const scan = await scanRepository(targetPath);
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

async function writeOutput(name: string, value: string): Promise<void> {
  if (!process.env.GITHUB_OUTPUT) return;
  await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, "utf8");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`agent-ready action failed: ${message}`);
  process.exitCode = 1;
});
