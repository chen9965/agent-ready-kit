const systemPrompt =
  "You turn repository readiness scan results into concise bilingual recommendations. If sampled code context is supplied, use it only as partial evidence and say so implicitly through cautious recommendations. Do not claim you reviewed the entire source tree. Return a valid JSON object only.";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/v1/recommend") {
      return cors(json({ error: { message: "Not found" } }, 404));
    }

    const maxBodyBytes = Number.parseInt(env.MAX_BODY_BYTES || "250000", 10);
    const contentLength = Number.parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > maxBodyBytes) {
      return cors(json({ error: { message: "Request is too large" } }, 413));
    }

    const upstreamKey = env.UPSTREAM_API_KEY || env.OPENROUTER_API_KEY;
    if (!upstreamKey) {
      return cors(json({ error: { message: "Managed LLM key is not configured" } }, 503));
    }

    let input;
    try {
      input = await request.json();
    } catch {
      return cors(json({ error: { message: "Request body must be JSON" } }, 400));
    }

    if (!input || typeof input !== "object" || !input.promptPayload) {
      return cors(json({ error: { message: "Missing promptPayload" } }, 400));
    }

    const baseUrl = trimTrailingSlash(env.UPSTREAM_BASE_URL || "https://openrouter.ai/api/v1");
    const model = env.UPSTREAM_MODEL || "openrouter/free";
    const upstreamPayload = {
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(input.promptPayload) }
      ]
    };

    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${upstreamKey}`,
        "http-referer": "https://github.com/chen9965/agent-ready-kit",
        "x-title": "agent-ready-kit"
      },
      body: JSON.stringify(upstreamPayload)
    });

    const body = await safeJson(upstream);
    if (!upstream.ok) {
      return cors(json({ error: { message: body?.error?.message || `Upstream failed with HTTP ${upstream.status}` } }, 502));
    }

    const content = body?.choices?.[0]?.message?.content;
    if (!content) {
      return cors(json({ error: { message: "Upstream response did not include message content" } }, 502));
    }

    let parsed;
    try {
      parsed = JSON.parse(stripJsonFence(content));
    } catch {
      return cors(json({ error: { message: "Upstream response was not valid JSON" } }, 502));
    }

    return cors(
      json({
        provider: {
          baseUrl: "managed",
          model,
          managed: true
        },
        sourceMode: input.sourceMode || "sampled-code",
        codeContext: input.codeContext,
        summary: cleanText(parsed.summary, "Managed model recommendations are available."),
        summaryZh: cleanText(parsed.summaryZh, "已生成托管大模型增强建议。"),
        priorityFixes: cleanList(parsed.priorityFixes),
        priorityFixesZh: cleanList(parsed.priorityFixesZh),
        suggestedIssueTitles: cleanList(parsed.suggestedIssueTitles)
      })
    );
  }
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function cors(response) {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "POST, OPTIONS");
  headers.set("access-control-allow-headers", "content-type");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function stripJsonFence(value) {
  const trimmed = String(value || "").trim();
  const withoutFence = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    : trimmed;
  if (withoutFence.startsWith("{")) return withoutFence;
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) return withoutFence.slice(firstBrace, lastBrace + 1);
  return withoutFence;
}

function cleanText(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()).slice(0, 3);
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}
