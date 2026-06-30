# agent-ready-kit

[![agent-ready](https://img.shields.io/badge/agent--ready-bilingual-brightgreen.svg)](README.md)
[![CI](https://github.com/chen9965/agent-ready-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/chen9965/agent-ready-kit/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.18-blue.svg)](package.json)

**Make a repository easier for AI coding agents to understand, edit, and verify.**

**让仓库更适合 Codex、Claude Code、Cursor、Copilot coding agent 这类 AI 编码代理接手。**

`agent-ready-kit` is a local CLI and GitHub Action. It scans a repository for the things an AI coding agent needs before changing code: setup commands, tests, CI, repo map, safety boundaries, and `AGENTS.md`.

`agent-ready-kit` 是一个本地 CLI 和 GitHub Action。它会检查一个仓库有没有把 AI 编码代理最需要的信息写清楚：怎么安装、怎么测试、CI 是否存在、目录结构是否清楚、哪些边界不能乱碰、有没有 `AGENTS.md`。

After scanning, it gives you a score and can generate the missing agent-facing files.

扫描后，它会给仓库一个就绪度分数，并且可以生成 Agent 直接能看的说明文件和任务清单。

![agent-ready-kit terminal demo](docs/demo.svg)

## Real Repository Showcase / 真实仓库示例

Want to see what the tool finds on large real repositories?

想看它跑在真实大仓库上是什么效果？

See [docs/showcase](docs/showcase/README.md) for scans of React, Next.js, TypeScript, and Node.js.

查看 [docs/showcase](docs/showcase/README.md)，里面有 React、Next.js、TypeScript 和 Node.js 的真实扫描结果。

## What Problem Does It Solve / 解决什么问题

AI coding agents often fail for boring reasons:

- They cannot find the right install or test command.
- They do not know which folders are generated, risky, or off-limits.
- They miss the project structure and edit the wrong layer.
- Reviewers have to repeat the same safety and verification comments.

AI 编码代理经常不是因为模型不够强才出错，而是因为仓库没有把工作规则讲明白：

- 安装、构建、测试命令在哪里？
- 哪些目录是生成物、高风险区域或不要手改的内容？
- 项目结构是什么，应该优先看哪些文件？
- 改完以后要跑什么检查，PR 里应该怎么守住质量？

`agent-ready-kit` turns those missing rules into a visible checklist, score, report, and generated files.

`agent-ready-kit` 会把这些“没讲清的规则”变成可见的清单、分数、报告和生成文件。

## What You Get / 跑完会得到什么

| Output | What it is for | 中文说明 |
| --- | --- | --- |
| `Agent Ready Score` | A 0-100 score across docs, tests, scripts, CI, repo map, safety, and onboarding. | 从文档、测试、脚本、CI、仓库地图、安全、上手体验给出 0-100 分。 |
| `AGENTS.md` | Repo-specific instructions for coding agents. | 给 AI 编码代理看的仓库说明书。 |
| `.agent-ready/report.md` | Bilingual readiness report with findings and fixes. | 双语就绪度报告，列出问题和修复建议。 |
| `.agent-ready/tasks/*.md` | Concrete task cards for improving weak spots. | 把薄弱项拆成可以执行的任务卡。 |
| `.agent-ready/guards.json` | Machine-readable guard rules for automation. | 机器可读的守护规则，方便接入自动化。 |
| GitHub Action gate | CI check that can fail PRs below a minimum score. | 在 PR 里设置最低就绪度门禁。 |
| Optional LLM recommendations | Model-written suggestions based on scan summary, not source upload. | 可选大模型增强建议，只发送扫描摘要，不上传源码。 |

## Quick Start / 快速开始

Scan the current repository:

扫描当前仓库：

```bash
npx @chent6767/agent-ready-kit scan .
```

Generate agent-facing files:

生成 Agent 可读文件：

```bash
npx @chent6767/agent-ready-kit init . --write
```

Open an HTML report:

打开本地 HTML 报告：

```bash
npx @chent6767/agent-ready-kit report . --open
```

GitHub source install also works:

也可以直接从 GitHub 源码运行：

```bash
npx github:chen9965/agent-ready-kit scan .
```

## Typical Workflow / 典型用法

1. Run `scan .` to see why a repository is hard for agents to work in.
2. Run `init . --write` to generate `AGENTS.md`, task cards, guard rules, and a report.
3. Commit the useful generated files.
4. Add the GitHub Action gate so future PRs do not silently lose agent readiness.

1. 先运行 `scan .`，看仓库为什么不适合 Agent 接手。
2. 再运行 `init . --write`，生成 `AGENTS.md`、任务卡、守护规则和报告。
3. 把有价值的生成文件提交到仓库。
4. 加上 GitHub Action 门禁，避免后续 PR 把 Agent 协作体验改坏。

## What It Checks / 它会检查什么

| Area | Signal examples | 中文说明 |
| --- | --- | --- |
| Docs | `README.md`, setup notes, project overview | 有没有基础文档、安装说明和项目介绍。 |
| Tests | test files, `package.json` test script, Python test files | 有没有测试文件或测试命令。 |
| Scripts | `build`, `test`, `check`, `dev`, package manager signals | 有没有明确的构建、测试、检查、开发脚本。 |
| CI | `.github/workflows/*` | PR 或主分支有没有自动验证。 |
| Repo map | repo map, architecture notes, structure sections | 有没有仓库地图或架构说明。 |
| Safety | `.gitignore`, possible secret-like files, large dense files | 有没有忽略规则、疑似密钥、高风险大文件。 |
| Onboarding | `AGENTS.md` and agent-specific rules | 有没有给 Agent 的工作说明。 |

The default scanner is deterministic and local. It reads repository shape, docs, scripts, and lightweight file evidence. It does not try to "understand" every line of code like a full reviewer.

默认扫描是确定性的本地分析。它读取仓库结构、文档、脚本和轻量文件证据，不会假装像完整 reviewer 一样理解每一行代码。

## Optional LLM Mode / 可选大模型模式

By default, no API key is needed and no repository source is uploaded.

默认不需要 API key，也不会上传仓库源码。

If you bring an OpenAI-compatible endpoint, `--llm` can turn the scan result into more natural recommendations:

如果你有 OpenAI 兼容接口，`--llm` 可以把扫描结果润色成更像 reviewer 的建议：

```bash
set AGENT_READY_LLM_API_KEY=your_key
set AGENT_READY_LLM_MODEL=provider/model-name
set AGENT_READY_LLM_BASE_URL=https://openrouter.ai/api/v1
npx @chent6767/agent-ready-kit scan . --llm --markdown
```

LLM mode sends the score, detected signals, and findings summary. It does not send source files.

大模型模式只发送评分、检测信号和发现摘要，不发送源码文件。

## GitHub Action / GitHub Actions 用法

Add an agent-readiness gate to pull requests:

给 PR 加一个 AI 代理就绪度门禁：

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

Action 会在 GitHub Actions Step Summary 里写入双语报告；分数低于 `min-score` 时失败。

## Commands / 命令

| Command | What it does | 中文说明 |
| --- | --- | --- |
| `agent-ready scan [path]` | Scores docs, tests, scripts, CI, repo map, safety, and onboarding. | 为文档、测试、脚本、CI、仓库地图、安全和上手体验评分。 |
| `agent-ready scan [path] --markdown --fail-under 70` | Prints a Markdown report and exits with code 1 below a score. | 输出 Markdown 报告，低于指定分数时返回失败。 |
| `agent-ready scan [path] --llm --markdown` | Adds optional model-enhanced recommendations through an OpenAI-compatible endpoint. | 通过 OpenAI 兼容接口添加可选大模型增强建议。 |
| `agent-ready init [path] --write` | Generates `AGENTS.md`, `.agent-ready/tasks/*.md`, `.agent-ready/guards.json`, and `.agent-ready/report.md`. | 生成代理说明、任务卡、守护规则和 Markdown 报告。 |
| `agent-ready report [path] --open` | Writes and opens a local HTML report. | 生成并打开本地 HTML 报告。 |

## Why This Is Useful / 优点在哪里

`agent-ready-kit` is useful when you want a repository to cooperate with AI tools instead of making them guess.

当你希望仓库能和 AI 工具配合，而不是让 Agent 盲猜时，这个工具就有价值。

- **Fast:** one command gives a score and concrete fixes.
- **Local by default:** no model account required, no source upload.
- **Agent-specific:** output is written for coding agents, not only human readers.
- **Actionable:** weak spots become task cards and guard rules.
- **CI-friendly:** the same score can become a pull request gate.
- **Provider-agnostic:** optional LLM mode works with OpenAI-compatible providers.

- **快：** 一条命令得到分数和修复方向。
- **默认本地：** 不需要模型账号，不上传源码。
- **面向 Agent：** 输出不是普通文档，而是给编码代理看的工作规则。
- **可执行：** 薄弱项会变成任务卡和 guard rules。
- **适合 CI：** 同一个分数可以变成 PR 门禁。
- **不绑模型：** 可选 LLM 模式兼容 OpenAI 风格接口。

## Before and After / 使用前后

Before:

- Agents guess setup commands.
- Agents miss repo boundaries and edit generated or risky files.
- Reviewers repeat the same "please run tests" and "do not touch this folder" comments.

使用前：

- Agent 只能猜安装和验证命令。
- Agent 容易错过仓库边界，改到生成物或高风险目录。
- Review 里反复出现“请跑测试”“别碰这个目录”。

After:

- `AGENTS.md` gives repo-specific commands and working rules.
- `.agent-ready/tasks/` turns missing readiness into concrete work.
- `.agent-ready/guards.json` gives automation a stable policy shape.
- GitHub Actions can block low-readiness changes before they become team friction.

使用后：

- `AGENTS.md` 给出仓库专属命令和工作规则。
- `.agent-ready/tasks/` 把缺失能力变成具体任务。
- `.agent-ready/guards.json` 给自动化系统稳定策略格式。
- GitHub Actions 可以在低就绪度变成团队成本前先拦住。

## Example Output / 输出示例

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
| Linter | Code style and syntax problems | Scores repository readiness for AI agents. | 关注 Agent 协作就绪度，而不只是代码风格。 |
| README generator | Human-facing documentation | Generates agent instructions, task cards, guard rules, reports, and CI gates together. | 同时生成代理说明、任务卡、守护规则、报告和 CI 门禁。 |
| AI wrapper | Calling a model | Works locally by default; LLM recommendations are optional. | 默认本地运行；大模型建议只是可选增强。 |
| Project template | Starting a new repo | Audits existing repositories and shows what is missing. | 可以审计已有仓库，指出还缺什么。 |

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
- More stack detectors: Go, Rust, Java, .NET, Lua.
- JSON schema export for `guards.json`.
- VS Code task integration.

- PR 评论模式，让审查反馈更直接。
- 更多技术栈检测：Go、Rust、Java、.NET、Lua。
- 导出 `guards.json` 的 JSON Schema。
- VS Code task 集成。

## License / 许可证

MIT
