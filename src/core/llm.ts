import net from "node:net";
import type { LlmInsight, ScanResult } from "../types.js";
import { buildRepositoryCodeContext, type RepositoryCodeContext } from "./code-context.js";

export interface LlmOptions {
  apiKey?: string;
  managedUrl?: string;
  useManaged?: boolean;
  provider?: string;
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

interface ManagedLlmResponse extends Partial<LlmInsight> {
  error?: {
    message?: string;
  };
}

const defaultBaseUrl = "https://openrouter.ai/api/v1";
const defaultModel = "openrouter/free";
const defaultManagedUrl = "https://agent-ready-kit-llm.agent-ready-kit.workers.dev/v1/recommend";
const defaultTimeoutMs = 20_000;
const managedTimeoutMs = 4_000;

export function loadLlmOptions(overrides: LlmOptions = {}): LlmOptions {
  const provider = overrides.provider ?? process.env.AGENT_READY_LLM_PROVIDER;
  const providerDefaults = resolveProviderDefaults(provider, overrides.baseUrl ?? process.env.AGENT_READY_LLM_BASE_URL);
  const managedUrl = overrides.managedUrl ?? process.env.AGENT_READY_LLM_MANAGED_URL ?? defaultManagedUrl;

  return {
    apiKey: overrides.apiKey ?? process.env.AGENT_READY_LLM_API_KEY,
    managedUrl: normalizeOptionalUrl(managedUrl),
    useManaged: overrides.useManaged ?? !isDisabled(process.env.AGENT_READY_LLM_MANAGED),
    provider,
    baseUrl: overrides.baseUrl ?? process.env.AGENT_READY_LLM_BASE_URL ?? providerDefaults.baseUrl,
    model: overrides.model ?? process.env.AGENT_READY_LLM_MODEL ?? providerDefaults.model,
    timeoutMs: overrides.timeoutMs ?? defaultTimeoutMs,
    includeCodeContext: overrides.includeCodeContext,
    codeMaxFiles: overrides.codeMaxFiles,
    codeMaxChars: overrides.codeMaxChars
  };
}

export async function enhanceScanWithLlm(scan: ScanResult, options: LlmOptions = {}): Promise<LlmEnhanceResult> {
  const config = loadLlmOptions(options);
  const codeContext = config.includeCodeContext
    ? await buildRepositoryCodeContext(scan.root, {
        maxFiles: config.codeMaxFiles,
        maxChars: config.codeMaxChars
      })
    : undefined;

  if (config.useManaged !== false && config.managedUrl && !config.apiKey) {
    const managed = await enhanceScanWithManagedProxy(scan, config, codeContext);
    if (managed.status === "ok") return managed;
    return {
      scan,
      status: "skipped",
      message: `${managed.message ?? "Managed LLM is unavailable."} Set AGENT_READY_LLM_API_KEY to use your own OpenAI-compatible key, or use --no-llm for local-only scan. / 托管大模型不可用时，可设置 AGENT_READY_LLM_API_KEY 使用自己的 key，或用 --no-llm 只做本地扫描。`
    };
  }

  if (!config.apiKey) {
    return {
      scan,
      status: "skipped",
      message:
        "LLM skipped: managed endpoint is disabled and AGENT_READY_LLM_API_KEY is not set. / 已跳过大模型：托管端点已禁用且未设置 AGENT_READY_LLM_API_KEY。"
    };
  }

  const baseUrl = normalizeBaseUrl(config.baseUrl ?? defaultBaseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? defaultTimeoutMs);

  try {
    const response = await requestChatCompletion(baseUrl, config, scan, codeContext, controller, true);
    let body = await readChatCompletionResponse(response);
    if (!response.ok && shouldRetryWithoutJsonMode(body.error?.message)) {
      const retry = await requestChatCompletion(baseUrl, config, scan, codeContext, controller, false);
      body = await readChatCompletionResponse(retry);
      if (!retry.ok) {
        return {
          scan,
          status: "error",
          message: body.error?.message ?? `LLM request failed with HTTP ${retry.status}.`
        };
      }
    } else if (!response.ok) {
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

    const insight = parseInsight(content, baseUrl, config.model ?? defaultModel, codeContext);
    return { scan: { ...scan, llm: insight }, status: "ok" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { scan, status: "error", message: `LLM request failed: ${message}` };
  } finally {
    clearTimeout(timeout);
  }
}

async function enhanceScanWithManagedProxy(
  scan: ScanResult,
  config: LlmOptions,
  codeContext: RepositoryCodeContext | undefined
): Promise<LlmEnhanceResult> {
  const managedUrl = config.managedUrl ? normalizeBaseUrl(config.managedUrl) : undefined;
  if (!managedUrl) return { scan, status: "skipped", message: "Managed LLM endpoint is not configured." };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(config.timeoutMs ?? defaultTimeoutMs, managedTimeoutMs));

  try {
    await probeHttpsEndpoint(managedUrl, 1_200);
    const response = await withHardTimeout(
      fetch(managedUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "agent-ready-kit"
        },
        body: JSON.stringify({
          promptPayload: buildPromptPayload(scan, codeContext),
          sourceMode: codeContext ? "sampled-code" : "scan-summary",
          codeContext: codeContext
            ? {
                filesSent: codeContext.filesSent,
                charsSent: codeContext.charsSent,
                maxFiles: codeContext.maxFiles,
                maxChars: codeContext.maxChars
              }
            : undefined
        }),
        signal: controller.signal
      }),
      Math.min(config.timeoutMs ?? defaultTimeoutMs, managedTimeoutMs),
      controller
    );
    const body = (await response.json().catch(() => ({}))) as ManagedLlmResponse;
    if (!response.ok) {
      return {
        scan,
        status: "error",
        message: body.error?.message ?? `Managed LLM request failed with HTTP ${response.status}.`
      };
    }

    const insight = normalizeManagedInsight(body, managedUrl, codeContext);
    return { scan: { ...scan, llm: insight }, status: "ok" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { scan, status: "error", message: `Managed LLM request failed: ${message}.` };
  } finally {
    clearTimeout(timeout);
  }
}

function probeHttpsEndpoint(value: string, timeoutMs: number): Promise<void> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return Promise.resolve();
  }
  if (url.protocol !== "https:") return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const socket = net.connect({
      host: url.hostname,
      port: url.port ? Number.parseInt(url.port, 10) : 443
    });

    const finish = (error?: Error) => {
      socket.removeAllListeners();
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };

    socket.setTimeout(timeoutMs, () => finish(new Error(`managed endpoint is not reachable within ${timeoutMs}ms`)));
    socket.once("connect", () => finish());
    socket.once("error", (error) => finish(error instanceof Error ? error : new Error(String(error))));
  });
}

async function requestChatCompletion(
  baseUrl: string,
  config: LlmOptions,
  scan: ScanResult,
  codeContext: RepositoryCodeContext | undefined,
  controller: AbortController,
  jsonMode: boolean
): Promise<Response> {
  return fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
        "http-referer": "https://github.com/chen9965/agent-ready-kit",
        "x-title": "agent-ready-kit"
      },
      body: JSON.stringify({
        model: config.model ?? defaultModel,
        temperature: 0.2,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          {
            role: "system",
            content:
              "You turn repository readiness scan results into concise bilingual recommendations. If sampled code context is supplied, use it only as partial evidence and say so implicitly through cautious recommendations. Do not claim you reviewed the entire source tree. Return a valid JSON object only."
          },
          {
            role: "user",
            content: JSON.stringify(buildPromptPayload(scan, codeContext))
          }
        ]
      }),
      signal: controller.signal
    });
}

async function readChatCompletionResponse(response: Response): Promise<ChatCompletionResponse> {
  try {
    return (await response.json()) as ChatCompletionResponse;
  } catch {
    return { error: { message: `LLM response was not JSON (HTTP ${response.status}).` } };
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

function normalizeManagedInsight(body: ManagedLlmResponse, managedUrl: string, codeContext?: RepositoryCodeContext): LlmInsight {
  const provider = body.provider ?? { baseUrl: managedUrl, model: "managed" };
  return {
    provider: {
      baseUrl: cleanText(provider.baseUrl, managedUrl),
      model: cleanText(provider.model, "managed"),
      managed: true
    },
    sourceMode: codeContext ? "sampled-code" : "scan-summary",
    codeContext: codeContext
      ? {
          filesSent: codeContext.filesSent,
          charsSent: codeContext.charsSent,
          maxFiles: codeContext.maxFiles,
          maxChars: codeContext.maxChars
        }
      : undefined,
    summary: cleanText(body.summary, "Managed model recommendations are available."),
    summaryZh: cleanText(body.summaryZh, "已生成托管大模型增强建议。"),
    priorityFixes: cleanList(body.priorityFixes),
    priorityFixesZh: cleanList(body.priorityFixesZh),
    suggestedIssueTitles: cleanList(body.suggestedIssueTitles)
  };
}

function withHardTimeout<T>(promise: Promise<T>, timeoutMs: number, controller: AbortController): Promise<T> {
  let timedOut = false;
  promise.catch(() => undefined);

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new Error(`timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        if (timedOut) return;
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        if (timedOut) return;
        clearTimeout(timer);
        reject(error);
      });
  });
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeOptionalUrl(value?: string): string | undefined {
  if (!value || isDisabled(value)) return undefined;
  return value.trim().replace(/\/+$/, "");
}

function isDisabled(value?: string): boolean {
  return /^(0|false|off|none|disabled)$/i.test(value?.trim() ?? "");
}

function resolveProviderDefaults(provider?: string, baseUrl?: string): Required<Pick<LlmOptions, "baseUrl" | "model">> {
  const normalizedProvider = provider?.toLowerCase().trim();
  const normalizedBaseUrl = baseUrl?.toLowerCase();
  if (normalizedProvider === "siliconflow" || normalizedBaseUrl?.includes("siliconflow")) {
    return { baseUrl: "https://api.siliconflow.cn/v1", model: "Qwen/Qwen3-8B" };
  }
  if (normalizedProvider === "agnes" || normalizedBaseUrl?.includes("agnes-ai.com")) {
    return { baseUrl: "https://apihub.agnes-ai.com/v1", model: "agnes-2.0-flash" };
  }
  if (normalizedProvider === "gemini" || normalizedBaseUrl?.includes("generativelanguage.googleapis.com")) {
    return { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-3.5-flash" };
  }
  if (normalizedProvider === "groq" || normalizedBaseUrl?.includes("api.groq.com")) {
    return { baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" };
  }
  return { baseUrl: defaultBaseUrl, model: defaultModel };
}

function shouldRetryWithoutJsonMode(message?: string): boolean {
  if (!message) return false;
  return /response_format|json_object|structured output|unsupported/i.test(message);
}

function stripJsonFence(value: string): string {
  const trimmed = value.trim();
  const withoutFence = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    : trimmed;
  if (withoutFence.startsWith("{")) return withoutFence;
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) return withoutFence.slice(firstBrace, lastBrace + 1);
  return withoutFence;
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
