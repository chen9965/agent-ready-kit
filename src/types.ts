export type Severity = "info" | "warn" | "fail";

export type FindingCategory =
  | "docs"
  | "tests"
  | "scripts"
  | "ci"
  | "repo-map"
  | "safety"
  | "onboarding";

export interface Finding {
  id: string;
  severity: Severity;
  category: FindingCategory;
  title: string;
  titleZh: string;
  message: string;
  messageZh: string;
  fix: string;
  fixZh: string;
}

export interface RepoSignal {
  name: string;
  nameZh: string;
  present: boolean;
  evidence: string[];
}

export interface ReadinessScore {
  overall: number;
  docs: number;
  tests: number;
  scripts: number;
  ci: number;
  repoMap: number;
  safety: number;
  onboarding: number;
}

export interface ScanResult {
  root: string;
  target?: ScanTargetMetadata;
  generatedAt: string;
  stack: string[];
  packageManager: string | null;
  signals: RepoSignal[];
  findings: Finding[];
  score: ReadinessScore;
  fileCount: number;
  ignoredCount: number;
  llm?: LlmInsight;
  llmStatus?: LlmRunStatus;
}

export interface ScanTargetMetadata {
  input: string;
  kind: "local" | "github-url";
  sourceUrl?: string;
  name?: string;
}

export interface LlmInsight {
  provider: {
    baseUrl: string;
    model: string;
    managed?: boolean;
  };
  sourceMode: "scan-summary" | "sampled-code";
  codeContext?: {
    filesSent: number;
    charsSent: number;
    maxFiles: number;
    maxChars: number;
  };
  summary: string;
  summaryZh: string;
  priorityFixes: string[];
  priorityFixesZh: string[];
  suggestedIssueTitles: string[];
}

export interface LlmRunStatus {
  status: "active" | "local-fallback" | "disabled";
  provider?: "managed" | "byok";
  sourceMode?: "scan-summary" | "sampled-code";
  message?: string;
}

export interface GeneratedTask {
  id: string;
  title: string;
  titleZh: string;
  priority: "P0" | "P1" | "P2";
  body: string;
  bodyZh: string;
}

export interface GuardRule {
  id: string;
  name: string;
  nameZh: string;
  check: string;
  checkZh: string;
  severity: Severity;
}

export interface AgentReadyConfig {
  ignore: string[];
  agentTargets: string[];
  riskLevel: "low" | "medium" | "high";
  outputDir: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  description: string;
}
