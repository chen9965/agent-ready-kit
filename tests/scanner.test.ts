import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildRepositoryCodeContext } from "../src/core/code-context.js";
import { loadConfig } from "../src/core/config.js";
import { generateFiles } from "../src/core/generator.js";
import { loadLlmOptions } from "../src/core/llm.js";
import { scanRepository } from "../src/core/scanner.js";
import { parseGitHubRepository } from "../src/core/target.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("scanRepository", () => {
  it("detects a React Vite fixture and produces bilingual findings", async () => {
    const result = await scanRepository(path.join(repoRoot, "examples/react-vite"));

    expect(result.stack).toEqual(expect.arrayContaining(["Node.js", "React", "TypeScript", "Vite"]));
    expect(result.signals.some((signal) => signal.name === "Tests" && signal.present)).toBe(true);
    expect(result.findings.every((finding) => finding.title && finding.titleZh)).toBe(true);
    expect(result.score.overall).toBeGreaterThan(40);
  });

  it("detects missing agent instructions and generates AGENTS.md", async () => {
    const result = await scanRepository(path.join(repoRoot, "examples/python-service"));
    const files = generateFiles(result);

    expect(result.findings.some((finding) => finding.id === "missing-agents-md")).toBe(true);
    expect(files.some((file) => file.path === "AGENTS.md" && file.content.includes("项目上下文"))).toBe(true);
    expect(files.some((file) => file.path === ".agent-ready/guards.json")).toBe(true);
  });

  it("detects common license filenames", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "agent-ready-license-"));
    await writeFile(path.join(dir, "README.md"), "# Fixture\n", "utf8");
    await writeFile(path.join(dir, "LICENSE.txt"), "MIT\n", "utf8");

    const result = await scanRepository(dir);
    const license = result.signals.find((signal) => signal.name === "License");

    expect(license?.present).toBe(true);
    expect(license?.evidence).toContain("LICENSE.txt");
  });
});

describe("buildRepositoryCodeContext", () => {
  it("samples useful code files while skipping secret-like files", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "agent-ready-code-context-"));
    await writeFile(path.join(dir, "package.json"), JSON.stringify({ scripts: { test: "vitest" } }), "utf8");
    await writeFile(path.join(dir, "index.ts"), "export function run() { return 'ok'; }\n", "utf8");
    await writeFile(path.join(dir, ".env"), "TOKEN=super-secret-value\n", "utf8");

    const context = await buildRepositoryCodeContext(dir, { maxFiles: 4, maxChars: 4000 });

    expect(context.filesSent).toBeGreaterThan(0);
    expect(context.files.some((file) => file.path === "package.json")).toBe(true);
    expect(context.files.some((file) => file.path === ".env")).toBe(false);
  });
});

describe("loadConfig", () => {
  it("merges user config with defaults", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "agent-ready-kit-"));
    await writeFile(
      path.join(dir, "agent-ready.config.json"),
      JSON.stringify({ ignore: ["fixtures/**"], riskLevel: "high", outputDir: "artifacts" }),
      "utf8"
    );

    const config = await loadConfig(dir);

    expect(config.ignore).toContain("fixtures/**");
    expect(config.agentTargets).toContain("Codex");
    expect(config.riskLevel).toBe("high");
    expect(config.outputDir).toBe("artifacts");
  });
});

describe("loadLlmOptions", () => {
  it("uses a free OpenRouter model by default", () => {
    const options = withCleanLlmEnv(() => loadLlmOptions({ apiKey: "test-key" }));

    expect(options.baseUrl).toBe("https://openrouter.ai/api/v1");
    expect(options.model).toBe("openrouter/free");
    expect(options.managedUrl).toBe("https://agent-ready-kit-llm.agent-ready-kit.workers.dev/v1/recommend");
  });

  it("supports provider presets for simpler setup", () => {
    const options = withCleanLlmEnv(() => loadLlmOptions({ apiKey: "test-key", provider: "siliconflow" }));

    expect(options.baseUrl).toBe("https://api.siliconflow.cn/v1");
    expect(options.model).toBe("Qwen/Qwen3-8B");
  });

  it("supports the Agnes provider preset", () => {
    const options = withCleanLlmEnv(() => loadLlmOptions({ apiKey: "test-key", provider: "agnes" }));

    expect(options.baseUrl).toBe("https://apihub.agnes-ai.com/v1");
    expect(options.model).toBe("agnes-2.0-flash");
  });

  it("allows the managed endpoint to be overridden or disabled", () => {
    const overridden = withCleanLlmEnv(() => loadLlmOptions({ managedUrl: "https://example.com/v1/recommend/" }));
    expect(overridden.managedUrl).toBe("https://example.com/v1/recommend");

    const disabled = withCleanLlmEnv(() => loadLlmOptions({ managedUrl: "off" }));
    expect(disabled.managedUrl).toBeUndefined();
  });

  it("preserves code-context options", () => {
    const options = withCleanLlmEnv(() =>
      loadLlmOptions({
        apiKey: "test-key",
        model: "test-model",
        includeCodeContext: true,
        codeMaxFiles: 5,
        codeMaxChars: 6000
      })
    );

    expect(options.includeCodeContext).toBe(true);
    expect(options.codeMaxFiles).toBe(5);
    expect(options.codeMaxChars).toBe(6000);
  });

  it("allows LLM request timeouts to be configured from the environment", () => {
    const options = withCleanLlmEnv(() => {
      process.env.AGENT_READY_LLM_TIMEOUT_MS = "30000";
      process.env.AGENT_READY_LLM_MANAGED_TIMEOUT_MS = "25000";
      return loadLlmOptions();
    });

    expect(options.timeoutMs).toBe(30000);
    expect(options.managedTimeoutMs).toBe(25000);
  });
});

function withCleanLlmEnv<T>(run: () => T): T {
  const keys = [
    "AGENT_READY_LLM_API_KEY",
    "AGENT_READY_LLM_MANAGED",
    "AGENT_READY_LLM_MANAGED_URL",
    "AGENT_READY_LLM_PROVIDER",
    "AGENT_READY_LLM_BASE_URL",
    "AGENT_READY_LLM_MODEL",
    "AGENT_READY_LLM_TIMEOUT_MS",
    "AGENT_READY_LLM_MANAGED_TIMEOUT_MS"
  ];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  try {
    return run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe("parseGitHubRepository", () => {
  it("accepts GitHub URLs and owner/repo shorthand", () => {
    expect(parseGitHubRepository("https://github.com/chen9965/agent-ready-kit")).toEqual({
      owner: "chen9965",
      repo: "agent-ready-kit"
    });
    expect(parseGitHubRepository("github.com/chen9965/agent-ready-kit.git")).toEqual({
      owner: "chen9965",
      repo: "agent-ready-kit"
    });
    expect(parseGitHubRepository("chen9965/agent-ready-kit")).toEqual({
      owner: "chen9965",
      repo: "agent-ready-kit"
    });
  });
});
