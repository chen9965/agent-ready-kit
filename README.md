# agent-ready-kit

[![agent-ready](https://img.shields.io/badge/agent--ready-bilingual-brightgreen.svg)](README.md)
[![CI](https://github.com/chen9965/agent-ready-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/chen9965/agent-ready-kit/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.18-blue.svg)](package.json)

Make any repository AI-agent-ready in 60 seconds. Score it, document it, and keep CI honest.

60 秒让任意仓库适配 AI 编码代理：评分、生成说明、进入 CI 守护。

![agent-ready-kit terminal demo](docs/demo.svg)

## Why / 为什么

AI coding agents are much better when a repository tells them where to look, what to run, what not to touch, and how to verify their work.

当仓库明确告诉 AI 编码代理应该看哪里、运行什么、不要碰什么、如何验证时，代理效果会明显更稳定。

`agent-ready-kit` scans a repo and generates practical guardrails: `AGENTS.md`, task cards, a readiness report, and machine-readable guard rules.

`agent-ready-kit` 会扫描仓库并生成实用守护栏：`AGENTS.md`、任务卡、就绪度报告和机器可读规则。

It is designed for Codex, Claude Code, Cursor, Copilot coding agent workflows, and any team that wants agents to stop guessing.

它面向 Codex、Claude Code、Cursor、Copilot 编码代理工作流，也适合希望减少代理误判的团队。

## 10-second quickstart / 10 秒快速开始

```bash
npx github:chen9965/agent-ready-kit scan .
npx github:chen9965/agent-ready-kit init . --write
npx github:chen9965/agent-ready-kit report . --open
```

No API key. No model account. Static analysis only.

无需 API key，无需模型账号，只做静态分析。

After npm publication, the shorter `npx agent-ready-kit scan .` form will work too.

发布到 npm 后，也可以使用更短的 `npx agent-ready-kit scan .` 形式。

## GitHub Action / GitHub Actions 用法

Add an agent-readiness gate to pull requests:

在 PR 上加一个 AI 代理就绪度门禁：

```yaml
name: Agent Ready

on:
  pull_request:

jobs:
  score:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: chen9965/agent-ready-kit@main
        with:
          min-score: 70
```

The action writes a bilingual Markdown report to the GitHub Actions step summary and fails when the score is below `min-score`.

Action 会在 GitHub Actions Step Summary 中写入双语 Markdown 报告；分数低于 `min-score` 时失败。

## Commands / 命令

| Command | What it does | 中文说明 |
| --- | --- | --- |
| `agent-ready scan [path]` | Scores docs, tests, scripts, CI, repo map, safety, and onboarding. | 为文档、测试、脚本、CI、仓库地图、安全和上手体验评分。 |
| `agent-ready scan [path] --markdown --fail-under 70` | Prints a Markdown report and returns failure below a score. | 输出 Markdown 报告，低于指定分数时返回失败。 |
| `agent-ready init [path] --write` | Generates `AGENTS.md`, `.agent-ready/tasks/*.md`, `.agent-ready/guards.json`, and `.agent-ready/report.md`. | 生成代理说明、任务卡、守护规则和 Markdown 报告。 |
| `agent-ready report [path] --open` | Writes a clean local HTML report. | 生成并打开本地 HTML 报告。 |

## Before and after / 使用前后

Before:

- Agents guess setup commands.
- Reviewers repeat the same safety comments.
- New contributors cannot tell which checks matter.

使用前：

- 代理只能猜安装和验证命令。
- Review 里反复出现同样的安全提醒。
- 新贡献者不知道哪些检查最重要。

After:

- `AGENTS.md` gives stack-specific commands and working rules.
- `.agent-ready/tasks/` turns weak spots into concrete work items.
- `.agent-ready/guards.json` gives automation a stable policy shape.
- GitHub Actions can block low-readiness changes before they become team friction.

使用后：

- `AGENTS.md` 给出面向技术栈的命令和工作规则。
- `.agent-ready/tasks/` 把薄弱点变成具体任务。
- `.agent-ready/guards.json` 给自动化系统一个稳定策略格式。
- GitHub Actions 可以在低就绪度变成团队成本前先拦住。

## Example output / 输出示例

```text
Agent readiness / 代理就绪度: good 78/100
Stack / 技术栈: Node.js, React, TypeScript, Vite

Top findings / 主要发现
WARN Add CI / 添加 CI
  Add a workflow that runs install, typecheck/lint, and tests on pull requests.
  添加工作流，在 PR 上运行安装、类型检查或 lint、测试。
```

## Comparison / 对比

| Tool type | Focus | agent-ready-kit difference | 区别 |
| --- | --- | --- | --- |
| Linter | Code style and errors | Scores repo readiness for AI agents, not just code syntax. | 面向代理协作就绪度，而不只是语法风格。 |
| Docs generator | Human documentation | Generates agent instructions, task cards, and guard rules together. | 同时生成代理说明、任务卡和守护规则。 |
| AI wrapper | Calls a model | Runs locally with no API key. | 本地运行，无需 API key。 |

## Config / 配置

Create `agent-ready.config.json`:

创建 `agent-ready.config.json`：

```json
{
  "ignore": ["fixtures/**"],
  "agentTargets": ["Codex", "Claude Code", "Cursor"],
  "riskLevel": "medium",
  "outputDir": ".agent-ready"
}
```

## Development / 开发

```bash
npm install
npm run build
npm test
npm run smoke
```

## Roadmap / 路线图

- PR comment mode for richer review feedback.
- PR 评论模式，让审查反馈更直接。
- More stack detectors: Go, Rust, Java, .NET, Lua.
- 更多技术栈检测：Go、Rust、Java、.NET、Lua。
- JSON schema export for `guards.json`.
- 导出 `guards.json` 的 JSON Schema。
- VS Code task integration.
- VS Code task 集成。

## License / 许可证

MIT
