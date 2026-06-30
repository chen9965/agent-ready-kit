import type { ScanResult } from "../types.js";

export interface MarkdownSummaryOptions {
  minScore?: number;
}

export function renderMarkdownSummary(scan: ScanResult, options: MarkdownSummaryOptions = {}): string {
  const minScore = options.minScore ?? 70;
  const status = scan.score.overall >= minScore ? "PASS" : "FAIL";
  const stack = scan.stack.length ? scan.stack.join(", ") : "unknown / 未识别";
  const findings = scan.findings.slice(0, 8);

  return `# Agent Ready Score / AI 代理就绪度

- **Score / 分数:** ${scan.score.overall}/100
- **Status / 状态:** ${status} (minimum / 最低要求: ${minScore})
- **Stack / 技术栈:** ${stack}
- **Files scanned / 扫描文件:** ${scan.fileCount}

## Score Breakdown / 评分明细

| Area | Score |
| --- | ---: |
| Docs / 文档 | ${scan.score.docs} |
| Tests / 测试 | ${scan.score.tests} |
| Scripts / 脚本 | ${scan.score.scripts} |
| CI / 持续集成 | ${scan.score.ci} |
| Repo map / 仓库地图 | ${scan.score.repoMap} |
| Safety / 安全 | ${scan.score.safety} |
| Onboarding / 上手体验 | ${scan.score.onboarding} |

## Top Findings / 主要发现

${findings.length ? renderFindings(findings) : "No findings / 暂无发现"}
${scan.llm ? renderLlm(scan) : ""}
`;
}

function renderFindings(findings: ScanResult["findings"]): string {
  const rows = findings.map(
    (finding) =>
      `| ${escapeCell(finding.severity.toUpperCase())} | ${escapeCell(finding.title)} / ${escapeCell(finding.titleZh)} | ${escapeCell(finding.fix)} / ${escapeCell(finding.fixZh)} |`
  );

  return ["| Severity | Finding | Fix |", "| --- | --- | --- |", ...rows].join("\n");
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function renderLlm(scan: ScanResult): string {
  const llm = scan.llm;
  if (!llm) return "";

  const fixes = llm.priorityFixesZh.length
    ? llm.priorityFixesZh.map((fix) => `- ${fix}`).join("\n")
    : llm.priorityFixes.map((fix) => `- ${fix}`).join("\n");
  const issues = llm.suggestedIssueTitles.map((title) => `- ${title}`).join("\n");

  return `

## LLM Recommendations / 大模型增强建议

${llm.summary}

${llm.summaryZh}

${fixes ? `### Priority Fixes / 优先修复\n\n${fixes}` : ""}

${issues ? `### Suggested Issues / 建议 Issue\n\n${issues}` : ""}

Model / 模型: \`${llm.provider.model}\`
`;
}
