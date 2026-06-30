import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type {
  AgentReadyConfig,
  Finding,
  FindingCategory,
  ReadinessScore,
  RepoSignal,
  ScanResult,
  Severity
} from "../types.js";
import { loadConfig } from "./config.js";

const baseIgnore = [
  ".git/**",
  "node_modules/**",
  "dist/**",
  "coverage/**",
  ".next/**",
  ".turbo/**",
  ".venv/**",
  "__pycache__/**",
  ".agent-ready/**"
];

const codeExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".cs",
  ".lua"
]);

const licenseFilePattern = /(^|\/)(licen[cs]e|copying|notice)(\.(md|txt))?$/i;

export async function scanRepository(targetPath: string): Promise<ScanResult> {
  const root = path.resolve(targetPath);
  const config = await loadConfig(root);
  const ignore = [...baseIgnore, ...config.ignore];
  const files = await fg(["**/*"], {
    cwd: root,
    dot: true,
    onlyFiles: true,
    ignore,
    followSymbolicLinks: false
  });

  const stack = await detectStack(root, files);
  const packageManager = detectPackageManager(files);
  const signals = await detectSignals(root, files);
  const findings = await buildFindings(root, files, signals, stack, config);
  const score = scoreReadiness(signals, findings);

  return {
    root,
    generatedAt: new Date().toISOString(),
    stack,
    packageManager,
    signals,
    findings,
    score,
    fileCount: files.length,
    ignoredCount: ignore.length
  };
}

async function detectStack(root: string, files: string[]): Promise<string[]> {
  const stack = new Set<string>();

  if (files.includes("package.json")) {
    stack.add("Node.js");
    const pkg = await readJson(path.join(root, "package.json"));
    const deps = {
      ...(pkg?.dependencies as Record<string, unknown> | undefined),
      ...(pkg?.devDependencies as Record<string, unknown> | undefined)
    };
    if ("react" in deps) stack.add("React");
    if ("vite" in deps || files.some((file) => file.startsWith("vite.config."))) stack.add("Vite");
    if ("next" in deps) stack.add("Next.js");
    if ("typescript" in deps || files.includes("tsconfig.json")) stack.add("TypeScript");
  }

  if (files.includes("pyproject.toml") || files.includes("requirements.txt")) stack.add("Python");
  if (files.includes("go.mod")) stack.add("Go");
  if (files.includes("Cargo.toml")) stack.add("Rust");
  if (files.includes("deno.json") || files.includes("deno.jsonc")) stack.add("Deno");

  return [...stack].sort();
}

function detectPackageManager(files: string[]): string | null {
  if (files.includes("pnpm-lock.yaml")) return "pnpm";
  if (files.includes("yarn.lock")) return "yarn";
  if (files.includes("package-lock.json")) return "npm";
  if (files.includes("bun.lockb") || files.includes("bun.lock")) return "bun";
  if (files.includes("uv.lock")) return "uv";
  if (files.includes("poetry.lock")) return "poetry";
  return null;
}

async function detectSignals(root: string, files: string[]): Promise<RepoSignal[]> {
  const packageJson = await readJson(path.join(root, "package.json"));
  const scripts = packageJson?.scripts as Record<string, unknown> | undefined;
  const repoMap = await detectRepoMapEvidence(root, files);
  const licenseFiles = files.filter((file) => licenseFilePattern.test(file));

  return [
    signal("README", "README 文档", hasAny(files, /^readme\.md$/i), files.filter((file) => /^readme\.md$/i.test(file))),
    signal("License", "开源许可证", licenseFiles.length > 0, licenseFiles),
    signal("Tests", "测试文件", hasTests(files, scripts), testEvidence(files, scripts)),
    signal("Package scripts", "包脚本", Boolean(scripts && Object.keys(scripts).length > 0), scripts ? Object.keys(scripts) : []),
    signal("CI workflow", "CI 工作流", files.some((file) => file.startsWith(".github/workflows/")), files.filter((file) => file.startsWith(".github/workflows/"))),
    signal("Agent instructions", "代理说明", hasAny(files, /(^|\/)AGENTS\.md$/i), files.filter((file) => /(^|\/)AGENTS\.md$/i.test(file))),
    signal("Repo map", "仓库地图", repoMap.length > 0, repoMap),
    signal("Environment example", "环境变量示例", files.includes(".env.example"), files.filter((file) => file === ".env.example")),
    signal("Git ignore", "Git 忽略规则", files.includes(".gitignore"), files.filter((file) => file === ".gitignore"))
  ];
}

async function detectRepoMapEvidence(root: string, files: string[]): Promise<string[]> {
  const fileNameHits = files.filter((file) => /(^|\/)(architecture|repo-map|structure)\.md$/i.test(file));
  const sectionHits: string[] = [];
  const candidates = files.filter((file) => /(^|\/)(README|AGENTS)\.md$/i.test(file));

  for (const file of candidates) {
    try {
      const text = await readFile(path.join(root, file), "utf8");
      if (/repo map|repository map|project structure|仓库地图|项目结构/i.test(text)) {
        sectionHits.push(`${file}:section`);
      }
    } catch {
      // Keep detection best-effort.
    }
  }

  return [...new Set([...fileNameHits, ...sectionHits])];
}

async function buildFindings(
  root: string,
  files: string[],
  signals: RepoSignal[],
  stack: string[],
  config: AgentReadyConfig
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const hasSignal = (name: string) => signals.find((item) => item.name === name)?.present ?? false;
  const add = (
    id: string,
    severity: Severity,
    category: FindingCategory,
    title: string,
    titleZh: string,
    message: string,
    messageZh: string,
    fix: string,
    fixZh: string
  ) => findings.push({ id, severity, category, title, titleZh, message, messageZh, fix, fixZh });

  if (!hasSignal("README")) {
    add(
      "missing-readme",
      "fail",
      "docs",
      "Add a README",
      "添加 README",
      "Agents need a short project overview, setup path, and validation commands before making edits.",
      "代理在修改前需要简短项目介绍、安装路径和验证命令。",
      "Create README.md with quickstart, scripts, architecture notes, and release status.",
      "创建 README.md，包含快速开始、脚本、架构说明和发布状态。"
    );
  }

  if (!hasSignal("Agent instructions")) {
    add(
      "missing-agents-md",
      "fail",
      "onboarding",
      "Create AGENTS.md",
      "创建 AGENTS.md",
      `No agent instruction file was found for ${config.agentTargets.join(", ")}.`,
      `没有找到面向 ${config.agentTargets.join("、")} 的代理说明文件。`,
      "Generate AGENTS.md with repo-specific commands, style rules, and safety boundaries.",
      "生成 AGENTS.md，写清仓库命令、代码风格和安全边界。"
    );
  }

  if (!hasSignal("Tests")) {
    add(
      "missing-tests",
      "warn",
      "tests",
      "Add a test command",
      "添加测试命令",
      "Agents are safer when every change has a fast verification command.",
      "每次修改都有快速验证命令时，代理工作会更安全。",
      "Add at least one focused unit test and document the command in package scripts or project docs.",
      "至少添加一个聚焦的单元测试，并在包脚本或项目文档里写清命令。"
    );
  }

  if (!hasSignal("CI workflow")) {
    add(
      "missing-ci",
      "warn",
      "ci",
      "Add CI",
      "添加 CI",
      "A basic CI workflow catches agent-generated regressions before merge.",
      "基础 CI 可以在合并前捕获代理生成的回归。",
      "Add a workflow that runs install, typecheck/lint, and tests on pull requests.",
      "添加工作流，在 PR 上运行安装、类型检查或 lint、测试。"
    );
  }

  if (!hasSignal("Package scripts") && stack.includes("Node.js")) {
    add(
      "missing-scripts",
      "warn",
      "scripts",
      "Expose package scripts",
      "暴露包脚本",
      "package.json exists, but common automation commands are missing.",
      "存在 package.json，但缺少常用自动化命令。",
      "Add scripts such as build, test, lint, check, and dev.",
      "添加 build、test、lint、check、dev 等脚本。"
    );
  }

  if (!hasSignal("Repo map")) {
    add(
      "missing-repo-map",
      "info",
      "repo-map",
      "Add a repo map",
      "添加仓库地图",
      "Agents move faster when important directories and ownership boundaries are named.",
      "重要目录和边界被明确命名后，代理行动会更快。",
      "Add an architecture or repo-map section to README or AGENTS.md.",
      "在 README 或 AGENTS.md 中添加架构或仓库地图。"
    );
  }

  const secretHits = await findSecretLikeFiles(root, files);
  if (secretHits.length > 0) {
    add(
      "possible-secrets",
      config.riskLevel === "low" ? "warn" : "fail",
      "safety",
      "Review possible secrets",
      "检查疑似密钥",
      `Found ${secretHits.length} file(s) with names or content that may expose credentials.`,
      `发现 ${secretHits.length} 个文件的名称或内容可能暴露凭据。`,
      "Move secrets to environment variables and keep only safe examples in source control.",
      "把密钥迁移到环境变量，源码中只保留安全示例。"
    );
  }

  const largeFiles = await findLargeCodeFiles(root, files);
  if (largeFiles.length > 0) {
    add(
      "large-code-files",
      "info",
      "safety",
      "Split very large files",
      "拆分超大文件",
      `Found ${largeFiles.length} code file(s) over 600 lines; agents are more error-prone in dense files.`,
      `发现 ${largeFiles.length} 个超过 600 行的代码文件；密集文件会增加代理出错概率。`,
      "Extract cohesive modules or add local orientation comments before high-risk sections.",
      "提取内聚模块，或在高风险区域前添加简短定位注释。"
    );
  }

  return findings;
}

function scoreReadiness(signals: RepoSignal[], findings: Finding[]): ReadinessScore {
  const present = (name: string) => signals.find((item) => item.name === name)?.present ?? false;
  const categoryPenalty = (category: FindingCategory) =>
    findings
      .filter((finding) => finding.category === category)
      .reduce((total, finding) => total + (finding.severity === "fail" ? 35 : finding.severity === "warn" ? 20 : 8), 0);

  const score = (base: number, category: FindingCategory) => clamp(base - categoryPenalty(category));
  const docs = score(present("README") ? 90 : 45, "docs");
  const tests = score(present("Tests") ? 90 : 50, "tests");
  const scripts = score(present("Package scripts") ? 92 : 55, "scripts");
  const ci = score(present("CI workflow") ? 92 : 55, "ci");
  const repoMap = score(present("Repo map") ? 90 : 62, "repo-map");
  const safety = score(present("Git ignore") ? 88 : 70, "safety");
  const onboarding = score(present("Agent instructions") ? 94 : 45, "onboarding");
  const overall = Math.round((docs + tests + scripts + ci + repoMap + safety + onboarding) / 7);

  return { overall, docs, tests, scripts, ci, repoMap, safety, onboarding };
}

async function readJson(filePath: string): Promise<Record<string, unknown> | null> {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function signal(name: string, nameZh: string, present: boolean, evidence: string[]): RepoSignal {
  return { name, nameZh, present, evidence };
}

function hasAny(files: string[], pattern: RegExp): boolean {
  return files.some((file) => pattern.test(file));
}

function hasTests(files: string[], scripts?: Record<string, unknown>): boolean {
  return Boolean(
    scripts?.test ||
      files.some((file) => /(^|\/)(tests?|__tests__)\//i.test(file)) ||
      files.some((file) => /\.(test|spec)\.[cm]?[jt]sx?$/i.test(file)) ||
      files.some((file) => /test_.*\.py$/i.test(path.basename(file)))
  );
}

function testEvidence(files: string[], scripts?: Record<string, unknown>): string[] {
  const evidence = files.filter(
    (file) =>
      /(^|\/)(tests?|__tests__)\//i.test(file) ||
      /\.(test|spec)\.[cm]?[jt]sx?$/i.test(file) ||
      /test_.*\.py$/i.test(path.basename(file))
  );
  if (scripts?.test) evidence.unshift("package.json:scripts.test");
  return evidence;
}

async function findSecretLikeFiles(root: string, files: string[]): Promise<string[]> {
  const nameHits = files.filter((file) => /(^|\/)\.env($|\.|\/)|secret|credential|private[-_]?key/i.test(file));
  const contentHits: string[] = [];
  const inspectable = files.filter((file) => [".ts", ".js", ".py", ".json", ".yaml", ".yml", ".env"].includes(path.extname(file))).slice(0, 400);

  for (const file of inspectable) {
    try {
      const text = await readFile(path.join(root, file), "utf8");
      if (/(api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"']{12,}/i.test(text)) {
        contentHits.push(file);
      }
    } catch {
      // Ignore unreadable files; the scanner should stay best-effort.
    }
  }

  return [...new Set([...nameHits, ...contentHits])];
}

async function findLargeCodeFiles(root: string, files: string[]): Promise<string[]> {
  const largeFiles: string[] = [];
  const candidates = files.filter((file) => codeExtensions.has(path.extname(file))).slice(0, 500);

  for (const file of candidates) {
    try {
      const fileStat = await stat(path.join(root, file));
      if (fileStat.size < 20_000) continue;
      const text = await readFile(path.join(root, file), "utf8");
      const lines = text.split(/\r?\n/).length;
      if (lines > 600) largeFiles.push(file);
    } catch {
      // Ignore binary or unreadable files.
    }
  }

  return largeFiles;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
