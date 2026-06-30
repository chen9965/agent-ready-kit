import https from "node:https";
import net from "node:net";
import tls from "node:tls";
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
  managedTimeoutMs?: number;
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

interface JsonHttpResponse<T> {
  ok: boolean;
  status: number;
  body: T;
}

const defaultBaseUrl = "https://openrouter.ai/api/v1";
const defaultModel = "openrouter/free";
const defaultManagedUrl = "https://agent-ready-kit-llm.agent-ready-kit.workers.dev/v1/recommend";
const defaultTimeoutMs = 60_000;
const defaultManagedTimeoutMs = 60_000;

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
    timeoutMs: overrides.timeoutMs ?? parsePositiveInteger(process.env.AGENT_READY_LLM_TIMEOUT_MS) ?? defaultTimeoutMs,
    managedTimeoutMs:
      overrides.managedTimeoutMs ??
      parsePositiveInteger(process.env.AGENT_READY_LLM_MANAGED_TIMEOUT_MS) ??
      defaultManagedTimeoutMs,
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
    const managed = await enhanceScanWithManagedProxy(
      scan,
      config,
      codeContext,
      codeContext ? Math.min(config.managedTimeoutMs ?? defaultManagedTimeoutMs, 30_000) : undefined
    );
    if (managed.status === "ok") return managed;
    if (codeContext) {
      const summaryRetry = await enhanceScanWithManagedProxy(scan, config, undefined);
      if (summaryRetry.status === "ok") return summaryRetry;
      return {
        scan,
        status: "skipped",
        message: `${managed.message ?? "Managed LLM is unavailable."} Summary-only retry also failed: ${summaryRetry.message ?? "managed LLM unavailable"}. Set AGENT_READY_LLM_API_KEY to use your own OpenAI-compatible key, or use --no-llm only for emergency local-only scans. / 托管大模型不可用，摘要重试也失败：${summaryRetry.message ?? "托管大模型不可用"}。可设置 AGENT_READY_LLM_API_KEY 使用自己的 key；只有应急纯本地扫描才使用 --no-llm。`
      };
    }
    return {
      scan,
      status: "skipped",
      message: `${managed.message ?? "Managed LLM is unavailable."} Set AGENT_READY_LLM_API_KEY to use your own OpenAI-compatible key, or use --no-llm only for emergency local-only scans. / 托管大模型不可用时，可设置 AGENT_READY_LLM_API_KEY 使用自己的 key；只有应急纯本地扫描才使用 --no-llm。`
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

export function withLlmRunStatus(result: LlmEnhanceResult): ScanResult {
  const llm = result.scan.llm;
  if (result.status === "ok" && llm) {
    const provider = llm.provider.managed ? "managed" : "byok";
    return {
      ...result.scan,
      llmStatus: {
        status: "active",
        provider,
        sourceMode: llm.sourceMode,
        message:
          provider === "managed"
            ? "LLM-first analysis used the managed endpoint. / 已使用托管大模型进行优先分析。"
            : "LLM-first analysis used the configured OpenAI-compatible provider. / 已使用配置的大模型服务进行优先分析。"
      }
    };
  }

  return {
    ...result.scan,
    llmStatus: {
      status: "local-fallback",
      message:
        result.message ??
        "LLM-first analysis was unavailable; deterministic local scan was used as a fallback. / 大模型优先分析不可用，已退回本地确定性扫描。"
    }
  };
}

export function withLlmDisabledStatus(scan: ScanResult): ScanResult {
  return {
    ...scan,
    llmStatus: {
      status: "disabled",
      message:
        "LLM was explicitly disabled; deterministic local scan only. Use this only for privacy or outage fallback. / 已显式关闭大模型，只做本地确定性扫描；建议仅在隐私或故障兜底时使用。"
    }
  };
}

async function enhanceScanWithManagedProxy(
  scan: ScanResult,
  config: LlmOptions,
  codeContext: RepositoryCodeContext | undefined,
  timeoutOverrideMs?: number
): Promise<LlmEnhanceResult> {
  const managedUrl = config.managedUrl ? normalizeBaseUrl(config.managedUrl) : undefined;
  if (!managedUrl) return { scan, status: "skipped", message: "Managed LLM endpoint is not configured." };

  const controller = new AbortController();
  const managedRequestTimeoutMs = Math.min(
    config.timeoutMs ?? defaultTimeoutMs,
    timeoutOverrideMs ?? config.managedTimeoutMs ?? defaultManagedTimeoutMs
  );
  const timeout = setTimeout(() => controller.abort(), managedRequestTimeoutMs);
  const promptPayload = buildPromptPayload(scan, codeContext);
  const bodyPayload = {
    promptPayload,
    sourceMode: codeContext ? "sampled-code" : "scan-summary",
    codeContext: codeContext
      ? {
          filesSent: codeContext.filesSent,
          charsSent: codeContext.charsSent,
          maxFiles: codeContext.maxFiles,
          maxChars: codeContext.maxChars
        }
      : undefined
  };

  try {
    const response = await postJsonToManagedEndpoint<ManagedLlmResponse>(
      managedUrl,
      bodyPayload,
      managedRequestTimeoutMs,
      controller
    );
    const body = response.body;
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

async function postJsonToManagedEndpoint<T>(
  url: string,
  payload: Record<string, unknown>,
  timeoutMs: number,
  controller: AbortController
): Promise<JsonHttpResponse<T>> {
  const proxyUrl = getProxyUrl(url);
  if (proxyUrl) {
    return postJsonViaHttpProxy<T>(url, proxyUrl, payload, timeoutMs);
  }

  const response = await withHardTimeout(
    fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "agent-ready-kit"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    }),
    timeoutMs,
    controller
  );
  const body = (await response.json().catch(() => ({}))) as T;
  return { ok: response.ok, status: response.status, body };
}

function postJsonViaHttpProxy<T>(
  targetUrl: string,
  proxyUrl: URL,
  payload: Record<string, unknown>,
  timeoutMs: number
): Promise<JsonHttpResponse<T>> {
  const target = new URL(targetUrl);
  if (target.protocol !== "https:" || proxyUrl.protocol !== "http:") {
    throw new Error(`unsupported proxy mode for managed endpoint: ${proxyUrl.protocol}`);
  }

  return new Promise<JsonHttpResponse<T>>((resolve, reject) => {
    let settled = false;
    const body = JSON.stringify(payload);
    const finish = (error?: Error, response?: JsonHttpResponse<T>) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else if (response) resolve(response);
      else reject(new Error("managed proxy request failed"));
    };

    createHttpProxyTunnel(target, proxyUrl, timeoutMs)
      .then((socket) => {
        const request = https.request(
          {
            hostname: target.hostname,
            port: target.port ? Number.parseInt(target.port, 10) : 443,
            path: `${target.pathname}${target.search}`,
            method: "POST",
            headers: {
              "content-type": "application/json",
              "content-length": Buffer.byteLength(body),
              "user-agent": "agent-ready-kit",
              host: target.host
            },
            createConnection: () => socket
          },
          (response) => {
            const chunks: Buffer[] = [];
            response.on("data", (chunk: Buffer) => chunks.push(chunk));
            response.once("error", (error) => finish(error instanceof Error ? error : new Error(String(error))));
            response.once("end", () => {
              const text = Buffer.concat(chunks).toString("utf8");
              let parsed: T;
              try {
                parsed = text ? (JSON.parse(text) as T) : ({} as T);
              } catch {
                parsed = {} as T;
              }
              finish(undefined, {
                ok: response.statusCode ? response.statusCode >= 200 && response.statusCode < 300 : false,
                status: response.statusCode ?? 0,
                body: parsed
              });
            });
          }
        );

        request.setTimeout(timeoutMs, () => request.destroy(new Error(`timed out after ${timeoutMs}ms`)));
        request.once("error", (error) => finish(error instanceof Error ? error : new Error(String(error))));
        request.end(body);
      })
      .catch((error: unknown) => finish(error instanceof Error ? error : new Error(String(error))));
  });
}

function createHttpProxyTunnel(target: URL, proxyUrl: URL, timeoutMs: number): Promise<tls.TLSSocket> {
  return new Promise<tls.TLSSocket>((resolve, reject) => {
    let settled = false;
    let headerBuffer = "";
    const targetPort = target.port ? Number.parseInt(target.port, 10) : 443;
    const proxyPort = proxyUrl.port ? Number.parseInt(proxyUrl.port, 10) : 80;
    const socket = net.connect({ host: proxyUrl.hostname, port: proxyPort });

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(error);
    };

    socket.setTimeout(timeoutMs, () => fail(new Error(`proxy tunnel timed out after ${timeoutMs}ms`)));
    socket.once("error", (error) => fail(error instanceof Error ? error : new Error(String(error))));
    socket.once("connect", () => {
      const authHeader = proxyUrl.username
        ? `Proxy-Authorization: Basic ${Buffer.from(`${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password)}`).toString("base64")}\r\n`
        : "";
      socket.write(
        `CONNECT ${target.hostname}:${targetPort} HTTP/1.1\r\n` +
          `Host: ${target.hostname}:${targetPort}\r\n` +
          authHeader +
          "Proxy-Connection: Keep-Alive\r\n\r\n"
      );
    });

    socket.on("data", (chunk: Buffer) => {
      headerBuffer += chunk.toString("latin1");
      if (!headerBuffer.includes("\r\n\r\n")) return;

      const statusLine = headerBuffer.split("\r\n", 1)[0] ?? "";
      if (!/^HTTP\/\d(?:\.\d)? 200\b/.test(statusLine)) {
        fail(new Error(`proxy tunnel failed: ${statusLine || "empty response"}`));
        return;
      }

      socket.removeAllListeners("data");
      socket.removeAllListeners("timeout");
      const secureSocket = tls.connect({ socket, servername: target.hostname });
      secureSocket.setTimeout(timeoutMs, () => secureSocket.destroy(new Error(`timed out after ${timeoutMs}ms`)));
      secureSocket.once("secureConnect", () => {
        if (settled) return;
        settled = true;
        resolve(secureSocket);
      });
      secureSocket.once("error", (error) => {
        if (settled) return;
        settled = true;
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });
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

function parsePositiveInteger(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function getProxyUrl(targetUrl: string): URL | undefined {
  let target: URL;
  try {
    target = new URL(targetUrl);
  } catch {
    return undefined;
  }

  const host = target.hostname.toLowerCase();
  if (isNoProxyHost(host)) return undefined;

  const proxyValue =
    target.protocol === "https:"
      ? process.env.HTTPS_PROXY ??
        process.env.https_proxy ??
        process.env.HTTP_PROXY ??
        process.env.http_proxy ??
        process.env.ALL_PROXY ??
        process.env.all_proxy
      : process.env.HTTP_PROXY ?? process.env.http_proxy ?? process.env.ALL_PROXY ?? process.env.all_proxy;

  if (!proxyValue || isDisabled(proxyValue)) return undefined;

  try {
    return new URL(proxyValue);
  } catch {
    return undefined;
  }
}

function isNoProxyHost(host: string): boolean {
  const noProxy = process.env.NO_PROXY ?? process.env.no_proxy;
  if (!noProxy) return false;
  return noProxy
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .some((entry) => {
      if (entry === "*") return true;
      const normalized = entry.startsWith(".") ? entry.slice(1) : entry;
      return host === normalized || host.endsWith(`.${normalized}`);
    });
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
