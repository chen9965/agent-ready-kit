import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";

export interface CodeContextOptions {
  maxFiles?: number;
  maxChars?: number;
  maxCharsPerFile?: number;
}

export interface CodeContextFile {
  path: string;
  role: string;
  language: string;
  lines: number;
  chars: number;
  excerpt: string;
}

export interface RepositoryCodeContext {
  root: string;
  mode: "sampled-code";
  maxFiles: number;
  maxChars: number;
  filesSent: number;
  charsSent: number;
  fileTree: string[];
  entrypointCandidates: string[];
  testCandidates: string[];
  files: CodeContextFile[];
}

const contextIgnore = [
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

const configFileNames = new Set([
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "go.mod",
  "Cargo.toml",
  "tsconfig.json",
  "vite.config.ts",
  "vite.config.js",
  "next.config.js",
  "next.config.mjs"
]);

export async function buildRepositoryCodeContext(root: string, options: CodeContextOptions = {}): Promise<RepositoryCodeContext> {
  const absoluteRoot = path.resolve(root);
  const maxFiles = options.maxFiles ?? 12;
  const maxChars = options.maxChars ?? 18_000;
  const maxCharsPerFile = options.maxCharsPerFile ?? 2_200;
  const files = await fg(["**/*"], {
    cwd: absoluteRoot,
    dot: true,
    onlyFiles: true,
    ignore: contextIgnore,
    followSymbolicLinks: false
  });

  const safeFiles = files.filter((file) => !isSensitivePath(file));
  const fileTree = safeFiles.slice(0, 240);
  const entrypointCandidates = safeFiles.filter(isEntrypointCandidate).slice(0, 24);
  const testCandidates = safeFiles.filter(isTestCandidate).slice(0, 24);
  const candidates = safeFiles
    .filter(isContextCandidate)
    .map((file) => ({ file, score: scoreCandidate(file) }))
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));

  const selected: CodeContextFile[] = [];
  let charsSent = 0;

  for (const candidate of candidates) {
    if (selected.length >= maxFiles || charsSent >= maxChars) break;
    const absolute = path.join(absoluteRoot, candidate.file);
    try {
      const fileStat = await stat(absolute);
      if (fileStat.size > 180_000) continue;
      const text = await readFile(absolute, "utf8");
      if (looksLikeSecret(text)) continue;
      const remaining = maxChars - charsSent;
      const excerpt = createExcerpt(text, Math.min(maxCharsPerFile, remaining));
      if (!excerpt) continue;
      selected.push({
        path: candidate.file,
        role: inferRole(candidate.file),
        language: inferLanguage(candidate.file),
        lines: text.split(/\r?\n/).length,
        chars: excerpt.length,
        excerpt
      });
      charsSent += excerpt.length;
    } catch {
      // Context collection should be best-effort and never block a scan.
    }
  }

  return {
    root: absoluteRoot,
    mode: "sampled-code",
    maxFiles,
    maxChars,
    filesSent: selected.length,
    charsSent,
    fileTree,
    entrypointCandidates,
    testCandidates,
    files: selected
  };
}

function isContextCandidate(file: string): boolean {
  const base = path.basename(file);
  const ext = path.extname(file);
  if (configFileNames.has(base)) return true;
  if (!codeExtensions.has(ext)) return false;
  if (/\.min\.[cm]?[jt]s$/i.test(base)) return false;
  if (/lock|snapshot/i.test(file)) return false;
  return true;
}

function scoreCandidate(file: string): number {
  const normalized = file.replace(/\\/g, "/");
  const base = path.basename(file);
  let score = 0;
  if (configFileNames.has(base)) score += 100;
  if (/^(src|app|lib|server|cmd|pkg)\//i.test(normalized)) score += 35;
  if (/(^|\/)(index|main|cli|server|app|router|routes|handler|action)\.[cm]?[jt]sx?$/i.test(normalized)) score += 45;
  if (/(^|\/)(__tests__|test|tests|spec)\//i.test(normalized) || /\.(test|spec)\.[cm]?[jt]sx?$/i.test(base)) score += 10;
  if (/config/i.test(base)) score += 20;
  return score;
}

function isEntrypointCandidate(file: string): boolean {
  return /(^|\/)(index|main|cli|server|app|router|routes|handler|action)\.[\w.]+$/i.test(file) || configFileNames.has(path.basename(file));
}

function isTestCandidate(file: string): boolean {
  return /(^|\/)(tests?|__tests__)\//i.test(file) || /\.(test|spec)\.[cm]?[jt]sx?$/i.test(path.basename(file)) || /test_.*\.py$/i.test(path.basename(file));
}

function inferRole(file: string): string {
  const base = path.basename(file);
  if (configFileNames.has(base)) return "config";
  if (isTestCandidate(file)) return "test";
  if (isEntrypointCandidate(file)) return "entrypoint";
  return "source";
}

function inferLanguage(file: string): string {
  const ext = path.extname(file).toLowerCase();
  const map: Record<string, string> = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript React",
    ".js": "JavaScript",
    ".jsx": "JavaScript React",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".py": "Python",
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".cs": "C#",
    ".lua": "Lua",
    ".json": "JSON",
    ".toml": "TOML",
    ".txt": "Text"
  };
  return map[ext] ?? "Text";
}

function createExcerpt(text: string, maxChars: number): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (maxChars <= 0 || !normalized) return "";
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars).trimEnd()}\n...`;
}

function isSensitivePath(file: string): boolean {
  return /(^|\/)\.env($|\.|\/)|secret|credential|private[-_]?key|id_rsa|id_dsa|\.pem$|\.p12$/i.test(file);
}

function looksLikeSecret(text: string): boolean {
  return /(api[_-]?key|secret|token|password|private[_-]?key)\s*[:=]\s*["'][^"']{16,}/i.test(text);
}
