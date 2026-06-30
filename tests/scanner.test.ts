import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { generateFiles } from "../src/core/generator.js";
import { scanRepository } from "../src/core/scanner.js";

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
