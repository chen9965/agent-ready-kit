import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { scanRepository } from "../src/core/scanner.js";
import { renderActionPlan, renderBeforeAfter } from "../src/render/artifacts.js";
import { renderMarkdownSummary } from "../src/render/markdown.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("renderMarkdownSummary", () => {
  it("renders a GitHub-friendly bilingual score summary", async () => {
    const scan = await scanRepository(path.join(repoRoot, "examples/react-vite"));
    const markdown = renderMarkdownSummary(scan, { minScore: 70 });

    expect(markdown).toContain("# Agent Ready Score / AI 代理就绪度");
    expect(markdown).toContain("**Score / 分数:**");
    expect(markdown).toContain("| Docs / 文档 |");
    expect(markdown).toContain("## Top Findings / 主要发现");
  });

  it("renders before/after and action-plan artifacts for large-repo demos", async () => {
    const scan = await scanRepository(path.join(repoRoot, "examples/react-vite"));
    const beforeAfter = renderBeforeAfter(scan);
    const actionPlan = renderActionPlan(scan);

    expect(beforeAfter).toContain("# Before / After Agent Ready Kit");
    expect(beforeAfter).toContain("After This Scan / 本次扫描后");
    expect(actionPlan).toContain("# Agent Ready Action Plan / 代理就绪行动计划");
    expect(actionPlan).toContain("npx @chent6767/agent-ready-kit scan . --out .agent-ready");
  });
});
