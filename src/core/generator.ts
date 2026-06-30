import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GeneratedFile, GeneratedTask, GuardRule, ScanResult } from "../types.js";

export interface WriteOptions {
  force?: boolean;
}

export function generateFiles(scan: ScanResult): GeneratedFile[] {
  const tasks = generateTasks(scan);
  const guards = generateGuards(scan);
  const out = ".agent-ready";

  return [
    {
      path: "AGENTS.md",
      description: "Bilingual agent instructions / 中英文代理说明",
      content: renderAgentsMd(scan)
    },
    {
      path: `${out}/report.md`,
      description: "Bilingual readiness report / 中英文就绪度报告",
      content: renderReportMd(scan)
    },
    {
      path: `${out}/guards.json`,
      description: "Machine-readable guard rules / 机器可读守护规则",
      content: `${JSON.stringify({ generatedAt: scan.generatedAt, rules: guards }, null, 2)}\n`
    },
    ...tasks.map((task) => ({
      path: `${out}/tasks/${task.id}.md`,
      description: `${task.title} / ${task.titleZh}`,
      content: renderTask(task)
    }))
  ];
}

export async function writeGeneratedFiles(root: string, files: GeneratedFile[], options: WriteOptions = {}) {
  const written: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const absolute = path.join(root, file.path);
    if (existsSync(absolute) && !options.force) {
      skipped.push(file.path);
      continue;
    }
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, file.content, "utf8");
    written.push(file.path);
  }

  return { written, skipped };
}

function renderAgentsMd(scan: ScanResult): string {
  const stack = scan.stack.length > 0 ? scan.stack.join(", ") : "Unknown / 未识别";
  const packageManager = scan.packageManager ?? "not detected / 未检测到";
  const commandBlock = commandsFor(scan);

  return `# AGENTS.md

## Project Context / 项目上下文
- Root / 根目录: \`${scan.root}\`
- Stack / 技术栈: ${stack}
- Package manager / 包管理器: ${packageManager}
- Agent readiness / 代理就绪度: ${scan.score.overall}/100

## Working Rules / 工作规则
- Read this file and \`.agent-ready/report.md\` before changing code.
- 修改代码前先阅读本文件和 \`.agent-ready/report.md\`。
- Keep changes scoped to the requested behavior and avoid unrelated rewrites.
- 修改范围要贴合请求，避免无关重写。
- Preserve user work that is already present in the working tree.
- 保留工作区里已经存在的用户改动。
- Prefer small, verifiable changes with a clear test command.
- 优先做小而可验证的修改，并写清验证命令。

## Useful Commands / 常用命令
${commandBlock}

## Repo Map / 仓库地图
${repoMapFor(scan)}

## Safety Notes / 安全说明
${scan.findings
  .filter((finding) => finding.category === "safety")
  .map((finding) => `- ${finding.title}: ${finding.message}\n- ${finding.titleZh}：${finding.messageZh}`)
  .join("\n") || "- No immediate safety warnings detected.\n- 未检测到明显安全警告。"}
`;
}

function renderReportMd(scan: ScanResult): string {
  const findings = scan.findings
    .map(
      (finding) => `### ${finding.severity.toUpperCase()} ${finding.title} / ${finding.titleZh}
- Category / 类别: ${finding.category}
- Problem / 问题: ${finding.message}
- 问题说明: ${finding.messageZh}
- Fix / 修复: ${finding.fix}
- 修复建议: ${finding.fixZh}`
    )
    .join("\n\n");

  const signals = scan.signals
    .map((signal) => `- ${signal.present ? "yes" : "no"} ${signal.name} / ${signal.nameZh}: ${signal.evidence.join(", ") || "no evidence / 无证据"}`)
    .join("\n");

  return `# Agent Readiness Report / 代理就绪度报告

Generated / 生成时间: ${scan.generatedAt}

## Score / 评分
- Overall / 总分: ${scan.score.overall}/100
- Docs / 文档: ${scan.score.docs}/100
- Tests / 测试: ${scan.score.tests}/100
- Scripts / 脚本: ${scan.score.scripts}/100
- CI / 持续集成: ${scan.score.ci}/100
- Repo map / 仓库地图: ${scan.score.repoMap}/100
- Safety / 安全: ${scan.score.safety}/100
- Onboarding / 上手体验: ${scan.score.onboarding}/100

## Signals / 信号
${signals}

## Findings / 发现
${findings || "No findings / 暂无发现"}
`;
}

function generateTasks(scan: ScanResult): GeneratedTask[] {
  const tasks: GeneratedTask[] = [];
  const hasFinding = (id: string) => scan.findings.some((finding) => finding.id === id);

  if (hasFinding("missing-tests")) {
    tasks.push({
      id: "add-tests",
      title: "Add a fast verification path",
      titleZh: "添加快速验证路径",
      priority: "P1",
      body: "Add or document a test command that agents can run after focused changes.",
      bodyZh: "添加或记录一个测试命令，让代理在聚焦修改后可以运行验证。"
    });
  }

  if (hasFinding("missing-readme")) {
    tasks.push({
      id: "document-setup",
      title: "Document setup and scripts",
      titleZh: "记录安装和脚本",
      priority: "P0",
      body: "Create a quickstart with install, development, build, and test commands.",
      bodyZh: "创建快速开始，包含安装、开发、构建和测试命令。"
    });
  }

  if (hasFinding("missing-ci")) {
    tasks.push({
      id: "tighten-ci",
      title: "Add CI guardrails",
      titleZh: "添加 CI 守护栏",
      priority: "P1",
      body: "Run the same local verification commands on pull requests.",
      bodyZh: "在 PR 中运行与本地一致的验证命令。"
    });
  }

  if (hasFinding("large-code-files")) {
    tasks.push({
      id: "split-large-files",
      title: "Split large files",
      titleZh: "拆分超大文件",
      priority: "P2",
      body: "Break dense files into smaller modules or add orientation notes before risky sections.",
      bodyZh: "把密集文件拆成更小模块，或在高风险区域前添加定位说明。"
    });
  }

  tasks.push({
    id: "add-agent-guardrails",
    title: "Add agent guardrails",
    titleZh: "添加代理守护规则",
    priority: "P0",
    body: "Keep AGENTS.md, report.md, and guards.json current as the repository evolves.",
    bodyZh: "随着仓库演进，持续更新 AGENTS.md、report.md 和 guards.json。"
  });

  return tasks;
}

function generateGuards(scan: ScanResult): GuardRule[] {
  return [
    {
      id: "run-fast-check",
      name: "Run the fastest relevant check",
      nameZh: "运行最快的相关检查",
      check: scan.stack.includes("Node.js") ? "npm test or npm run check" : "project-specific test command",
      checkZh: scan.stack.includes("Node.js") ? "npm test 或 npm run check" : "项目对应测试命令",
      severity: "warn"
    },
    {
      id: "preserve-user-work",
      name: "Preserve unrelated worktree changes",
      nameZh: "保留无关工作区改动",
      check: "Inspect git status before broad edits.",
      checkZh: "大范围修改前先检查 git status。",
      severity: "fail"
    },
    {
      id: "document-unsafe-ops",
      name: "Document destructive operations",
      nameZh: "记录破坏性操作",
      check: "Do not run destructive commands unless explicitly requested.",
      checkZh: "除非用户明确要求，不运行破坏性命令。",
      severity: "fail"
    }
  ];
}

function renderTask(task: GeneratedTask): string {
  return `# ${task.title} / ${task.titleZh}

Priority / 优先级: ${task.priority}

## Goal / 目标
${task.body}

${task.bodyZh}

## Acceptance / 验收
- The task has a clear command or manual check.
- 任务有清晰命令或人工检查方式。
- The result is documented in README, AGENTS.md, or the readiness report.
- 结果记录在 README、AGENTS.md 或就绪度报告中。
`;
}

function commandsFor(scan: ScanResult): string {
  if (scan.stack.includes("Node.js")) {
    const pm = scan.packageManager === "pnpm" ? "pnpm" : scan.packageManager === "yarn" ? "yarn" : "npm";
    const run = pm === "npm" ? "npm run" : pm;
    return `- Install / 安装: \`${pm} install\`
- Dev / 开发: \`${run} dev\`
- Build / 构建: \`${run} build\`
- Test / 测试: \`${pm === "npm" ? "npm test" : `${pm} test`}\`
- Typecheck / 类型检查: \`${run} check\``;
  }

  if (scan.stack.includes("Python")) {
    return `- Install / 安装: \`python -m pip install -r requirements.txt\`
- Test / 测试: \`python -m pytest\`
- Run / 运行: document the project entrypoint / 记录项目入口命令`;
  }

  return `- Install / 安装: document dependency setup / 记录依赖安装
- Test / 测试: document the fastest verification command / 记录最快验证命令
- Run / 运行: document the main entrypoint / 记录主入口`;
}

function repoMapFor(scan: ScanResult): string {
  const entries = [];
  if (scan.stack.includes("Node.js")) entries.push("- `src/`: application or package source / 应用或包源码");
  if (scan.stack.includes("Python")) entries.push("- `*.py`, `src/`, or package folders: Python source / Python 源码");
  entries.push("- `tests/`: verification files when present / 存放测试文件");
  entries.push("- `.agent-ready/`: generated readiness report, task cards, and guards / 生成的就绪度报告、任务卡和守护规则");
  return entries.join("\n");
}
