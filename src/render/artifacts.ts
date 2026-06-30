import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateFiles } from "../core/generator.js";
import type { Finding, GeneratedFile, ScanResult } from "../types.js";
import { renderMarkdownSummary } from "./markdown.js";

export interface ScanArtifactResult {
  outputDir: string;
  written: string[];
}

export async function writeScanArtifacts(scan: ScanResult, outputDir = ".agent-ready"): Promise<ScanArtifactResult> {
  const targetDir = path.isAbsolute(outputDir) ? outputDir : path.join(scan.root, outputDir);
  await mkdir(targetDir, { recursive: true });

  const artifacts: GeneratedFile[] = [
    {
      path: "scan.json",
      description: "Raw machine-readable scan result / 原始机器可读扫描结果",
      content: `${JSON.stringify(scan, null, 2)}\n`
    },
    {
      path: "report.md",
      description: "Shareable readiness summary / 可分享就绪度摘要",
      content: renderMarkdownSummary(scan)
    },
    {
      path: "before-after.md",
      description: "Before and after comparison / 使用前后对比",
      content: renderBeforeAfter(scan)
    },
    {
      path: "action-plan.md",
      description: "Prioritized fix plan / 优先级修复计划",
      content: renderActionPlan(scan)
    }
  ];

  const written: string[] = [];
  for (const artifact of artifacts) {
    const filePath = path.join(targetDir, artifact.path);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, artifact.content, "utf8");
    written.push(filePath);
  }

  return { outputDir: targetDir, written };
}

export function renderBeforeAfter(scan: ScanResult): string {
  const stack = scan.stack.length ? scan.stack.join(", ") : "Unknown / 未识别";
  const generated = generateFiles(scan);
  const generatedRows = generated
    .map((file) => `| \`${file.path}\` | ${file.description} |`)
    .join("\n");

  return `# Before / After Agent Ready Kit

Repository / 仓库: ${renderRepository(scan)}

Files scanned / 扫描文件: ${scan.fileCount}
Stack / 技术栈: ${stack}
Score / 分数: ${scan.score.overall}/100

## Before / 使用前

Without Agent Ready Kit, an AI coding agent usually has to infer:

- Where the project starts, how it is installed, and which commands are safe to run.
- 哪些目录重要、如何安装、应该运行哪些验证命令。
- Which missing docs, tests, CI, repo map, or safety signals create risk in a large repository.
- 大仓库里缺少哪些文档、测试、CI、仓库地图或安全信号。
- What should be fixed first before asking an agent to make broad changes.
- 在让代理做大改动前，哪些问题应该先处理。

## After This Scan / 本次扫描后

| Output | What it gives you |
| --- | --- |
| \`scan.json\` | Full machine-readable signal, score, finding, and LLM data. |
| \`report.md\` | GitHub-friendly score summary for README, PR comments, or issues. |
| \`action-plan.md\` | Prioritized fixes grouped by severity and area. |
| \`before-after.md\` | This before/after explanation for users and maintainers. |

## After \`agent-ready init --write\` / 写入后

| Artifact | Change |
| --- | --- |
${generatedRows}

## Practical Difference / 实际区别

| Area | Before | After |
| --- | --- | --- |
| Onboarding / 上手 | New agents read scattered files and guess the workflow. | Agents start from \`AGENTS.md\` and the generated report. |
| Large repo scan / 大仓库扫描 | Problems are hidden across thousands of files. | Score, findings, and fix order are exported as stable files. |
| Review / 评审 | Hard to explain why a repo is or is not agent-ready. | \`report.md\` and \`before-after.md\` explain the delta clearly. |
| Safety / 安全 | Risky commands and possible secrets rely on memory. | Guard rules and findings are explicit and repeatable. |
`;
}

export function renderActionPlan(scan: ScanResult): string {
  const findings = scan.findings.length ? scan.findings : [];
  const grouped = [
    ["P0 / Must fix", findings.filter((finding) => finding.severity === "fail")],
    ["P1 / Should fix", findings.filter((finding) => finding.severity === "warn")],
    ["P2 / Improve", findings.filter((finding) => finding.severity === "info")]
  ] as const;

  return `# Agent Ready Action Plan / 代理就绪行动计划

Repository / 仓库: ${renderRepository(scan)}
Generated / 生成时间: ${scan.generatedAt}

## Summary / 摘要

- Score / 分数: ${scan.score.overall}/100
- Files scanned / 扫描文件: ${scan.fileCount}
- Stack / 技术栈: ${scan.stack.length ? scan.stack.join(", ") : "unknown / 未识别"}
- Top risk count / 主要风险数: ${scan.findings.length}

## Priority Fixes / 优先修复

${grouped.map(([title, items]) => renderFindingGroup(title, items)).join("\n\n")}

## Recommended Commands / 推荐命令

\`\`\`bash
npx @chent6767/agent-ready-kit . --out .agent-ready
npx @chent6767/agent-ready-kit init . --write
npx @chent6767/agent-ready-kit report . --open
\`\`\`

## Shareable Pitch / 可直接发布的一句话

Agent Ready Kit scans a repository, scores whether AI coding agents can safely work inside it, then generates the missing onboarding, guardrails, task cards, and reports.

Agent Ready Kit 会扫描仓库，判断它是否适合 AI 编码代理安全接手，然后生成缺失的上手说明、守护规则、任务卡和报告。
`;
}

function renderFindingGroup(title: string, findings: Finding[]): string {
  if (findings.length === 0) {
    return `### ${title}\n\nNo items / 暂无`;
  }

  return `### ${title}

${findings.map(renderFinding).join("\n\n")}`;
}

function renderFinding(finding: Finding): string {
  return `- **${finding.title} / ${finding.titleZh}** (${finding.category})
  - Problem / 问题: ${finding.message}
  - Fix / 修复: ${finding.fix}
  - 修复建议: ${finding.fixZh}`;
}

function renderRepository(scan: ScanResult): string {
  return scan.target?.sourceUrl ? scan.target.sourceUrl : `\`${scan.root}\``;
}
