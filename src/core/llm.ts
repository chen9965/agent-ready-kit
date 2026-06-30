import type { LlmInsight, ScanResult } from "../types.js";
import { buildRepositoryCodeContext, type RepositoryCodeContext } from "./code-context.js";

export interface LlmOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  includeCodeContext?: boolean;
  codeMaxFiles?: number;
  codeMaxChars?: number;
}

export interface LlmEnhanceResult {
  scan: ScanResult;
  status: "ok" | "skipped" | "error";
  message?: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

const defaultBaseUrl = "https://openrouter.ai/api/v1";
const defaultTimeoutMs = 20_000;

export function loadLlmOptions(overrides: LlmOptions = {}): LlmOptions {
  return {
    apiKey: overrides.apiKey ?? process.env.AGENT_READY_LLM_API_KEY,
    baseUrl: overrides.baseUrl ?? process.env.AGENT_READY_LLM_BASE_URL ?? defaultBaseUrl,
    model: overrides.model ?? process.env.AGENT_READY_LLM_MODEL,
    timeoutMs: overrides.timeoutMs ?? defaultTimeoutMs,
    includeCodeContext: overrides.includeCodeContext,
    codeMaxFiles: overrides.codeMaxFiles,
    codeMaxChars: overrides.codeMaxChars
  };
}

export async function enhanceScanWithLlm(scan: ScanResult, options: LlmOptions = {}): Promise<LlmEnhanceResult> {
  const config = loadLlmOptions(options);
  if (!config.apiKey) {
    return {
      scan,
      status: "skipped",
      message: "LLM skipped: set AGENT_READY_LLM_API_KEY to enable model-enhanced recommendations."
    };
  }
  if (!config.model) {
    return {
      scan,
      status: "skipped",
      message: "LLM skipped: set AGENT_READY_LLM_MODEL to the provider model name."
    };
  }

  const baseUrl = normalizeBaseUrl(config.baseUrl ?? defaultBaseUrl);
  const codeContext = config.includeCodeContext
    ? await buildRepositoryCodeContext(scan.root, {
        maxFiles: config.codeMaxFiles,
        maxChars: config.codeMaxChars
      })
    : undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? defaultTimeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
        "http-referer": "https://github.com/chen9965/agent-ready-kit",
        "x-title": "agent-ready-kit"
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You turn repository readiness scan results into concise bilingual recommendations. If sampled code context is supplied, use it only as partial evidence and say so implicitly through cautious recommendations. Do not claim you reviewed the entire source tree. Return JSON only."
          },
          {
            role: "user",
            content: JSON.stringify(buildPromptPayload(scan, codeContext))
          }
        ]
      }),
      signal: controller.signal
    });

    const body = (await response.json()) as ChatCompletionResponse;
    if (!response.ok) {
      return {
        scan,
        status: "error",
        message: body.error?.message ?? `LLM request failed with HTTP ${response.status}.`
      };
    }

    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      return { scan, status: "error", message: "LLM response did not include message content." };
    }

    const insight = parseInsight(content, baseUrl, config.model, codeContext);
    return { scan: { ...scan, llm: insight }, status: "ok" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { scan, status: "error", message: `LLM request failed: ${message}` };
  } finally {
    clearTimeout(timeout);
  }
}

function buildPromptPayload(scan: ScanResult, codeContext?: RepositoryCodeContext): Record<string, unknown> {
  return {
    task:
      "Return JSON with keys summary, summaryZh, priorityFixes, priorityFixesZh, suggestedIssueTitles. Keep each array to 3 items. If codeContext is present, infer missing onboarding details from sampled files and suggest concrete AGENTS.md/repo-map content.",
    score: scan.score,
    stack: scan.stack,
    packageManager: scan.packageManager,
    fileCount: scan.fileCount,
    signals: scan.signals.map((signal) => ({
      name: signal.name,
      nameZh: signal.nameZh,
      present: signal.present,
      evidenceCount: signal.evidence.length
    })),
    findings: scan.findings.slice(0, 10).map((finding) => ({
      id: finding.id,
      severity: finding.severity,
      category: finding.category,
      title: finding.title,
      titleZh: finding.titleZh,
      fix: finding.fix,
      fixZh: finding.fixZh
    })),
    codeContext: codeContext
      ? {
          mode: codeContext.mode,
          filesSent: codeContext.filesSent,
          charsSent: codeContext.charsSent,
          fileTree: codeContext.fileTree,
          entrypointCandidates: codeContext.entrypointCandidates,
          testCandidates: codeContext.testCandidates,
          files: codeContext.files
        }
      : undefined
  };
}

function parseInsight(content: string, baseUrl: string, model: string, codeContext?: RepositoryCodeContext): LlmInsight {
  const parsed = JSON.parse(stripJsonFence(content)) as Partial<LlmInsight>;
  return {
    provider: { baseUrl, model },
    sourceMode: codeContext ? "sampled-code" : "scan-summary",
    codeContext: codeContext
      ? {
          filesSent: codeContext.filesSent,
          charsSent: codeContext.charsSent,
          maxFiles: codeContext.maxFiles,
          maxChars: codeContext.maxChars
        }
      : undefined,
    summary: cleanText(parsed.summary, "Model-enhanced recommendations are available."),
    summaryZh: cleanText(parsed.summaryZh, "已生成大模型增强建议。"),
    priorityFixes: cleanList(parsed.priorityFixes),
    priorityFixesZh: cleanList(parsed.priorityFixesZh),
    suggestedIssueTitles: cleanList(parsed.suggestedIssueTitles)
  };
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function stripJsonFence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function cleanText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 3);
}
