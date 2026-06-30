import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { AgentReadyConfig } from "../types.js";

const configSchema = z
  .object({
    ignore: z.array(z.string()).default([]),
    agentTargets: z.array(z.string()).default(["Codex", "Claude Code", "Cursor"]),
    riskLevel: z.enum(["low", "medium", "high"]).default("medium"),
    outputDir: z.string().default(".agent-ready")
  })
  .partial()
  .default({});

export const defaultConfig: AgentReadyConfig = {
  ignore: [],
  agentTargets: ["Codex", "Claude Code", "Cursor"],
  riskLevel: "medium",
  outputDir: ".agent-ready"
};

export async function loadConfig(root: string): Promise<AgentReadyConfig> {
  const configPath = path.join(root, "agent-ready.config.json");
  if (!existsSync(configPath)) {
    return defaultConfig;
  }

  const raw = await readFile(configPath, "utf8");
  const parsed = configSchema.parse(JSON.parse(raw));

  return {
    ...defaultConfig,
    ...parsed,
    ignore: [...defaultConfig.ignore, ...(parsed.ignore ?? [])],
    agentTargets: parsed.agentTargets ?? defaultConfig.agentTargets,
    riskLevel: parsed.riskLevel ?? defaultConfig.riskLevel,
    outputDir: parsed.outputDir ?? defaultConfig.outputDir
  };
}
