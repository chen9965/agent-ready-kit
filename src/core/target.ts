import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cloneTimeoutMs = 120_000;

export type ScanTargetKind = "local" | "github-url";

export interface ScanTargetMetadata {
  input: string;
  kind: ScanTargetKind;
  sourceUrl?: string;
  name?: string;
}

export interface ResolvedScanTarget {
  root: string;
  metadata: ScanTargetMetadata;
  cleanup: () => Promise<void>;
}

interface GitHubRepositoryRef {
  owner: string;
  repo: string;
}

export async function resolveScanTarget(input = "."): Promise<ResolvedScanTarget> {
  const trimmed = input.trim() || ".";
  const localPath = path.resolve(trimmed);
  if (existsSync(localPath) || !looksLikeRemoteRepository(trimmed)) {
    return {
      root: localPath,
      metadata: { input: trimmed, kind: "local", name: path.basename(localPath) || localPath },
      cleanup: async () => undefined
    };
  }

  const repository = parseGitHubRepository(trimmed);
  if (!repository) {
    throw new Error(
      `Unsupported remote target "${trimmed}". Use a local path, a GitHub repository URL, or owner/repo. / 不支持该远程目标，请使用本地路径、GitHub 仓库网址或 owner/repo。`
    );
  }

  const tempRoot = await mkdtemp(path.join(tmpdir(), "agent-ready-github-"));
  const cloneRoot = path.join(tempRoot, `${repository.owner}-${repository.repo}`);
  const sourceUrl = `https://github.com/${repository.owner}/${repository.repo}`;

  try {
    await execFileAsync("git", ["clone", "--depth", "1", `${sourceUrl}.git`, cloneRoot], {
      timeout: cloneTimeoutMs,
      maxBuffer: 1024 * 1024
    });
  } catch (error) {
    await safeRemove(tempRoot);
    throw new Error(`Failed to clone ${sourceUrl}. Make sure git is installed and the repository is reachable. ${formatExecError(error)}`);
  }

  return {
    root: cloneRoot,
    metadata: {
      input: trimmed,
      kind: "github-url",
      sourceUrl,
      name: `${repository.owner}/${repository.repo}`
    },
    cleanup: async () => safeRemove(tempRoot)
  };
}

export function parseGitHubRepository(input: string): GitHubRepositoryRef | null {
  const trimmed = input.trim();
  const ssh = /^git@github\.com:(?<owner>[A-Za-z0-9_.-]+)\/(?<repo>[A-Za-z0-9_.-]+?)(?:\.git)?$/i.exec(trimmed);
  if (ssh?.groups) return normalizeGitHubRepository(ssh.groups.owner, ssh.groups.repo);

  const shorthand = /^(?<owner>[A-Za-z0-9_.-]+)\/(?<repo>[A-Za-z0-9_.-]+?)(?:\.git)?$/i.exec(trimmed);
  if (shorthand?.groups) return normalizeGitHubRepository(shorthand.groups.owner, shorthand.groups.repo);

  const urlInput = /^github\.com[/:]/i.test(trimmed) ? `https://${trimmed.replace(/^github\.com:/i, "github.com/")}` : trimmed;
  try {
    const url = new URL(urlInput);
    if (url.hostname.replace(/^www\./i, "").toLowerCase() !== "github.com") return null;
    const [owner, rawRepo] = url.pathname.split("/").filter(Boolean);
    if (!owner || !rawRepo) return null;
    return normalizeGitHubRepository(owner, rawRepo.replace(/\.git$/i, ""));
  } catch {
    return null;
  }
}

function normalizeGitHubRepository(owner: string, repo: string): GitHubRepositoryRef | null {
  if (!isSafeGitHubPart(owner) || !isSafeGitHubPart(repo)) return null;
  return { owner, repo };
}

function isSafeGitHubPart(value: string): boolean {
  return /^[A-Za-z0-9_.-]+$/.test(value) && !value.startsWith(".") && !value.endsWith(".");
}

function looksLikeRemoteRepository(input: string): boolean {
  return (
    /^https?:\/\//i.test(input) ||
    /^git@github\.com:/i.test(input) ||
    /^github\.com[/:]/i.test(input) ||
    /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/i.test(input)
  );
}

async function safeRemove(target: string): Promise<void> {
  await rm(target, { recursive: true, force: true });
}

function formatExecError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
