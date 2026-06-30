import pc from "picocolors";
import type { ScanResult } from "../types.js";

export function renderScanSummary(scan: ScanResult): string {
  const stack = scan.stack.length ? scan.stack.join(", ") : "unknown / 未识别";
  const lines = [
    `${pc.bold("Agent readiness / 代理就绪度")}: ${scoreColor(scan.score.overall)} ${scan.score.overall}/100`,
    ...(scan.target?.sourceUrl ? [`${pc.bold("Target / 目标")}: ${scan.target.sourceUrl}`] : []),
    `${pc.bold("Root / 根目录")}: ${scan.root}`,
    `${pc.bold("Stack / 技术栈")}: ${stack}`,
    `${pc.bold("Package manager / 包管理器")}: ${scan.packageManager ?? "not detected / 未检测到"}`,
    `${pc.bold("Files scanned / 扫描文件")}: ${scan.fileCount}`,
    "",
    pc.bold("Score breakdown / 评分明细"),
    `  docs / 文档: ${scan.score.docs}`,
    `  tests / 测试: ${scan.score.tests}`,
    `  scripts / 脚本: ${scan.score.scripts}`,
    `  ci / 持续集成: ${scan.score.ci}`,
    `  repo map / 仓库地图: ${scan.score.repoMap}`,
    `  safety / 安全: ${scan.score.safety}`,
    `  onboarding / 上手体验: ${scan.score.onboarding}`,
    "",
    pc.bold("Top findings / 主要发现")
  ];

  if (scan.findings.length === 0) {
    lines.push("  No findings / 暂无发现");
  } else {
    for (const finding of scan.findings.slice(0, 8)) {
      lines.push(`  ${badge(finding.severity)} ${finding.title} / ${finding.titleZh}`);
      lines.push(`    ${finding.fix}`);
      lines.push(`    ${finding.fixZh}`);
    }
  }

  if (scan.llm) {
    lines.push("", pc.bold("LLM recommendations / 大模型增强建议"));
    if (scan.llm.codeContext) {
      lines.push(`  Source / 来源: sampled code (${scan.llm.codeContext.filesSent} files, ${scan.llm.codeContext.charsSent} chars)`);
    } else {
      lines.push("  Source / 来源: scan summary only");
    }
    lines.push(`  ${scan.llm.summary}`);
    lines.push(`  ${scan.llm.summaryZh}`);
    for (const fix of scan.llm.priorityFixesZh.length ? scan.llm.priorityFixesZh : scan.llm.priorityFixes) {
      lines.push(`  - ${fix}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function scoreColor(score: number): string {
  if (score >= 85) return pc.green("excellent");
  if (score >= 70) return pc.cyan("good");
  if (score >= 50) return pc.yellow("needs work");
  return pc.red("not ready");
}

function badge(severity: string): string {
  if (severity === "fail") return pc.red("FAIL");
  if (severity === "warn") return pc.yellow("WARN");
  return pc.cyan("INFO");
}
