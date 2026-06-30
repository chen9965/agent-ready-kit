import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ScanResult } from "../types.js";

export async function writeHtmlReport(scan: ScanResult, outputDir = ".agent-ready"): Promise<string> {
  const targetDir = path.join(scan.root, outputDir);
  await mkdir(targetDir, { recursive: true });
  const filePath = path.join(targetDir, "report.html");
  await writeFile(filePath, renderHtml(scan), "utf8");
  return filePath;
}

export function renderHtml(scan: ScanResult): string {
  const findings = scan.findings
    .map(
      (finding) => `<article class="finding ${finding.severity}">
        <div class="meta">${escapeHtml(finding.severity.toUpperCase())} · ${escapeHtml(finding.category)}</div>
        <h2>${escapeHtml(finding.title)} <span>${escapeHtml(finding.titleZh)}</span></h2>
        <p>${escapeHtml(finding.message)}</p>
        <p>${escapeHtml(finding.messageZh)}</p>
        <strong>Fix / 修复</strong>
        <p>${escapeHtml(finding.fix)}</p>
        <p>${escapeHtml(finding.fixZh)}</p>
      </article>`
    )
    .join("\n");

  const signals = scan.signals
    .map((signal) => `<li><b>${signal.present ? "yes" : "no"}</b> ${escapeHtml(signal.name)} / ${escapeHtml(signal.nameZh)}</li>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Agent Readiness Report</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f7f4ef; color: #18181b; }
    body { margin: 0; }
    main { max-width: 1040px; margin: 0 auto; padding: 40px 22px 64px; }
    header { border-bottom: 1px solid #d8d1c7; padding-bottom: 24px; margin-bottom: 24px; }
    h1 { font-size: 38px; line-height: 1.05; margin: 0 0 10px; letter-spacing: 0; }
    h2 { font-size: 20px; margin: 0 0 10px; letter-spacing: 0; }
    h2 span { color: #5f6368; font-weight: 600; }
    p { color: #33363f; line-height: 1.55; }
    .score { display: inline-flex; align-items: baseline; gap: 8px; font-size: 54px; font-weight: 800; color: #14532d; }
    .score span { font-size: 18px; color: #52525b; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin: 22px 0; }
    .metric, .finding { background: #fffdf9; border: 1px solid #ded6ca; border-radius: 8px; padding: 16px; }
    .metric b { display: block; font-size: 24px; margin-top: 4px; }
    ul { background: #fffdf9; border: 1px solid #ded6ca; border-radius: 8px; padding: 18px 18px 18px 38px; }
    .finding { margin: 12px 0; }
    .finding.fail { border-left: 5px solid #dc2626; }
    .finding.warn { border-left: 5px solid #ca8a04; }
    .finding.info { border-left: 5px solid #0891b2; }
    .meta { color: #71717a; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    code { background: #eee7dd; padding: 2px 5px; border-radius: 5px; }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="score">${scan.score.overall}<span>/100</span></div>
      <h1>Agent Readiness Report / 代理就绪度报告</h1>
      <p><code>${escapeHtml(scan.root)}</code></p>
      <p>Generated / 生成时间: ${escapeHtml(scan.generatedAt)}</p>
    </header>
    <section class="grid">
      ${metric("Docs / 文档", scan.score.docs)}
      ${metric("Tests / 测试", scan.score.tests)}
      ${metric("Scripts / 脚本", scan.score.scripts)}
      ${metric("CI / 持续集成", scan.score.ci)}
      ${metric("Repo map / 仓库地图", scan.score.repoMap)}
      ${metric("Safety / 安全", scan.score.safety)}
      ${metric("Onboarding / 上手体验", scan.score.onboarding)}
    </section>
    <h2>Signals / 信号</h2>
    <ul>${signals}</ul>
    <h2>Findings / 发现</h2>
    ${findings || "<p>No findings / 暂无发现</p>"}
    ${scan.llm ? renderLlm(scan) : ""}
  </main>
</body>
</html>`;
}

function metric(label: string, value: number): string {
  return `<div class="metric">${escapeHtml(label)}<b>${value}</b></div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderLlm(scan: ScanResult): string {
  const llm = scan.llm;
  if (!llm) return "";

  const fixes = (llm.priorityFixesZh.length ? llm.priorityFixesZh : llm.priorityFixes)
    .map((fix) => `<li>${escapeHtml(fix)}</li>`)
    .join("");
  const issues = llm.suggestedIssueTitles.map((title) => `<li>${escapeHtml(title)}</li>`).join("");

  return `<section class="finding info">
    <div class="meta">LLM · ${escapeHtml(llm.provider.model)}</div>
    <h2>LLM Recommendations <span>大模型增强建议</span></h2>
    <p>${escapeHtml(llm.summary)}</p>
    <p>${escapeHtml(llm.summaryZh)}</p>
    ${fixes ? `<strong>Priority Fixes / 优先修复</strong><ul>${fixes}</ul>` : ""}
    ${issues ? `<strong>Suggested Issues / 建议 Issue</strong><ul>${issues}</ul>` : ""}
  </section>`;
}
