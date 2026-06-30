# agent-ready-kit 国内发布文案

目标：先拿到第一批真实试用者和 Star，再把反馈转成 README、Issue、Roadmap 和下一版功能。

当前真实状态：

- GitHub 仓库：https://github.com/chen9965/agent-ready-kit
- 可用方式：`npx @chent6767/agent-ready-kit .`
- 生成展示产物：`npx @chent6767/agent-ready-kit . --out .agent-ready`
- 直接扫 GitHub 仓库：`npx @chent6767/agent-ready-kit https://github.com/owner/repo --out .agent-ready`
- GitHub 源码方式：`npx github:chen9965/agent-ready-kit .`
- 核心卖点：它不是 AI 套壳，而是给仓库做一次“AI 编码代理上岗体检”。CLI 默认优先走维护者托管的大模型代理，普通用户不需要先申请模型 key；托管代理不可用时，再提示高级用户自带 key 或切到本地扫描。

视频配乐署名：

`Carefree` by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0 License. https://creativecommons.org/licenses/by/4.0/

## 核心定位

一句话：

我做了一个小工具，帮仓库把 AI 编码代理最需要的规则讲清楚：怎么安装、怎么测试、哪些目录别碰、改完怎么验证。

它会给仓库打一个 AI Agent 就绪度分数，并生成 `AGENTS.md`、任务卡、guard rules、报告和 CI 门禁。现在 `--out` 会生成 `scan.json`、`report.md`、`before-after.md` 和 `action-plan.md`，适合大仓库展示“使用前后到底差在哪”。它默认会尝试托管大模型代理，读取有限采样代码片段，推断入口、测试和上手说明。

更短版本：

让仓库先学会和 AI 编码代理协作。

最短解释：

给 Codex、Claude Code、Cursor、Copilot coding agent 用的仓库体检和上岗说明书生成器。

英文副标题：

Make a repository easier for AI coding agents to understand, edit, and verify.

## GitHub About / 仓库描述

短描述：

Local CLI and GitHub Action that scores repo readiness for AI coding agents and generates AGENTS.md, task cards, guard rules, and reports.

中文解释：

本地 CLI + GitHub Action，检查仓库是否适合 AI 编码代理接手，并生成 `AGENTS.md`、任务卡、guard rules 和报告。

Topics 建议：

`ai-agents`, `coding-agents`, `agents-md`, `codex`, `claude-code`, `cursor`, `copilot`, `developer-tools`, `github-action`, `repo-audit`

## GitHub README 首屏短文案

打开仓库前 10 秒要让人明白：

- 这不是又一个模型调用工具。
- 它扫描的是仓库给 Agent 的协作信号。
- 它输出的是 Agent 能直接使用的说明、任务和门禁。
- 默认优先走维护者托管的大模型代理；用户不需要先注册模型平台，也可用 `--no-llm`、`--no-managed-llm` 或 `--llm-summary` 控制隐私。

可复制版本：

`agent-ready-kit` helps repositories work better with AI coding agents. It scans setup commands, tests, CI, repo maps, safety boundaries, and `AGENTS.md`, then returns an Agent Ready Score and can generate the missing agent-facing files. It first tries a maintainer-hosted managed LLM proxy, so most users do not need to apply for a model key.

中文版本：

`agent-ready-kit` 帮仓库更好地配合 AI 编码代理。它会扫描安装命令、测试、CI、仓库地图、安全边界和 `AGENTS.md`，然后给出 Agent Ready Score，并生成缺失的 Agent 可读文件。它会优先尝试维护者托管的大模型代理，所以大多数用户不需要自己申请模型 key。

## V2EX

标题候选：

- 做了个开源小工具：给仓库生成 AI Agent 就绪度评分和 AGENTS.md
- 最近用 Codex/Claude Code/Cursor 的一点痛点，我做成了一个 CLI
- 60 秒让仓库适配 AI 编码代理：agent-ready-kit

正文：

最近用 Codex、Claude Code、Cursor 这类编码代理时，有一个感受越来越明显：模型能力不是唯一瓶颈，仓库本身有没有把上下文交代清楚也很关键。

很多仓库没有写清：

- 安装和测试命令是什么
- 哪些目录能改，哪些不要碰
- PR 里必须跑哪些检查
- 新贡献者或 Agent 应该先看哪些文件

所以我做了一个小工具：`agent-ready-kit`。

它不是让 AI 再写一遍 README，而是检查仓库有没有把 Agent 真正需要的上下文交代清楚。

它会扫描一个仓库，然后输出：

- AI Agent readiness score
- `AGENTS.md`
- `.agent-ready/report.md`
- `.agent-ready/tasks/*.md`
- `.agent-ready/guards.json`
- GitHub Action 门禁

使用方式：

```bash
npx @chent6767/agent-ready-kit .
npx @chent6767/agent-ready-kit . --out .agent-ready
npx @chent6767/agent-ready-kit init . --write
```

它默认优先走维护者托管的大模型代理；如果代理不可用，会回退到本地静态分析，并提示高级用户自带 OpenAI 兼容 key。跑大仓库时推荐加 `--out .agent-ready`，这样会直接生成前后对比和行动计划。

仓库地址：

https://github.com/chen9965/agent-ready-kit

如果你正在用 Codex、Claude Code、Cursor 或 Copilot coding agent，欢迎试一下。也欢迎提 issue，我想把它做成一个比较通用的 Agent 协作基础设施。

## 掘金

标题候选：

- 我做了一个开源工具：60 秒让你的仓库适配 AI 编码代理
- AI 编码代理经常改错代码？可能是仓库没有准备好
- 给仓库加一层 Agent 就绪度门禁：agent-ready-kit

开头：

现在很多人已经开始把 Codex、Claude Code、Cursor、Copilot coding agent 放进日常开发流。但真实体验里，一个问题很常见：同一个 Agent，在不同仓库里的表现差异非常大。

原因不一定是模型不行，而是仓库没有给它足够明确的工作边界。

正文结构：

1. 问题：Agent 在仓库里最容易猜错什么
2. 思路：把 README、测试命令、CI、仓库地图、安全边界变成可扫描的信号
3. 工具：`agent-ready-kit` 做什么
4. 演示：两条命令扫描和生成文件
5. CI：用 GitHub Action 卡住低分 PR
6. 邀请：欢迎 Star、Issue、试用反馈

正文短版：

我做了一个开源 CLI：`agent-ready-kit`。

它的目标不是再包一层 AI，而是先解决一个更基础的问题：让仓库本身变得适合 AI 编码代理工作。

它会检查：

- README 是否足够
- 测试和脚本是否明确
- CI 是否存在
- 是否有 `AGENTS.md`
- 是否有仓库地图
- 是否有明显安全风险

然后生成一套 Agent 能直接使用的协作资产：

- 双语就绪度评分
- 扫描 JSON、Markdown 报告、前后对比和行动计划
- `AGENTS.md`
- 任务卡
- guard rules
- Markdown/HTML 报告
- GitHub Action 门禁
- 可选 LLM 增强建议

快速试用：

```bash
npx @chent6767/agent-ready-kit .
npx @chent6767/agent-ready-kit . --out .agent-ready
npx @chent6767/agent-ready-kit init . --write
```

仓库地址：

https://github.com/chen9965/agent-ready-kit

如果你正在维护一个希望交给 AI Agent 协作的仓库，欢迎拿自己的项目跑一下。Star 和 issue 都很有帮助。

## 知乎或公众号

标题：

AI 编码代理时代，仓库也需要一份“上岗说明书”

正文：

过去我们写 README，主要是给人看的。现在 Codex、Claude Code、Cursor、Copilot coding agent 这类工具越来越常出现在开发流程里，README 的读者其实多了一个：AI 编码代理。

但很多仓库还没有准备好。

一个 Agent 进入仓库后，最需要知道的并不是“这个项目很厉害”，而是几个非常具体的问题：

- 我应该先看哪些文件？
- 本地怎么安装和运行？
- 改完之后跑什么测试？
- 哪些目录是生成物，不应该手改？
- 哪些操作有风险，需要先停下来确认？

如果这些信息没有写清楚，Agent 就只能猜。猜对时很惊艳，猜错时就会制造 review 成本。

所以我做了一个开源工具：`agent-ready-kit`。

它会给仓库做一次静态扫描，生成一个 AI Agent readiness score，并输出 `scan.json`、`before-after.md`、`action-plan.md`、`AGENTS.md`、任务卡、报告和机器可读 guard rules。它也可以作为 GitHub Action 放进 CI，在 PR 里检查仓库是否低于最低就绪度分数。

它默认优先走维护者托管的大模型代理，不要求用户先申请 API Key；如果不想上传代码，可以加 `--no-llm`、`--no-managed-llm` 或 `--llm-summary`。

试用：

```bash
npx @chent6767/agent-ready-kit .
npx @chent6767/agent-ready-kit . --out .agent-ready
npx @chent6767/agent-ready-kit init . --write
```

GitHub：

https://github.com/chen9965/agent-ready-kit

我接下来会继续做 PR comment、更多技术栈检测、规则 schema 和在线 demo。如果你也在探索 AI Agent 进入真实工程流的方式，欢迎 Star 或提 issue。

## 即刻、朋友圈、微信群

短版：

我开源了一个小工具：`agent-ready-kit`。

它可以检查一个仓库有没有讲清 AI 编码代理最需要的信息：安装命令、测试命令、CI、目录结构、安全边界和 `AGENTS.md`。

跑完以后会得到 AI Agent 就绪度分数，并生成前后对比、行动计划、`AGENTS.md`、任务卡、guard rules、报告和 GitHub Action 门禁。默认会优先尝试托管大模型代理，生成采样代码增强建议。

适合正在用 Codex、Claude Code、Cursor、Copilot coding agent 的人。普通用户不需要先申请模型 key；如果托管代理不可用，仍然可以自带免费额度、自建模型或第三方兼容接口。

```bash
npx @chent6767/agent-ready-kit .
npx @chent6767/agent-ready-kit . --out .agent-ready
```

GitHub：

https://github.com/chen9965/agent-ready-kit

如果你手里有真实项目，欢迎跑一下，给我一个 issue 或 Star。

微信群更口语版：

我刚开源了个和 AI 编码代理相关的小工具，叫 `agent-ready-kit`。它不是 AI 套壳，而是帮仓库补齐给 Agent 看的说明：怎么安装、怎么测试、哪些目录别碰、改完怎么验证。

跑完会生成评分、前后对比、行动计划、`AGENTS.md`、任务卡、guard rules、报告和 CI 门禁。

现在用 Codex、Claude Code、Cursor 的人应该会有感：仓库上下文写得好不好，直接影响 Agent 会不会乱改。

可以直接跑：

```bash
npx @chent6767/agent-ready-kit .
npx @chent6767/agent-ready-kit . --out .agent-ready
```

项目地址：

https://github.com/chen9965/agent-ready-kit

欢迎试一下，觉得方向有用的话帮忙点个 Star。

## B 站或视频号口播

开场 15 秒：

现在很多人开始用 AI 编码代理写代码，但有一个问题经常被忽略：不是所有仓库都适合直接交给 Agent 改。仓库没有写清测试命令、目录边界和安全规则时，Agent 很容易靠猜。

中段：

我做了一个开源工具，叫 `agent-ready-kit`。它会扫描你的仓库，检查 README、测试脚本、CI、仓库地图、安全边界和 `AGENTS.md` 这些 Agent 协作信号。

跑完以后，它会给出一个 AI Agent 就绪度分数，并生成 `AGENTS.md`、任务卡、guard rules 和报告。对于大仓库，还可以用 `--out` 生成 `scan.json`、`before-after.md` 和 `action-plan.md`，直接看出使用前只能靠猜、使用后有哪些明确产物。默认优先走托管大模型代理；代理不可用时再让高级用户自带 key。

演示：

第一条命令扫描当前仓库：

```bash
npx @chent6767/agent-ready-kit .
npx @chent6767/agent-ready-kit . --out .agent-ready
```

如果是大仓库，可以加上：

```bash
npx @chent6767/agent-ready-kit . --out .agent-ready
```

这会生成 `scan.json`、`report.md`、`before-after.md` 和 `action-plan.md`，直接告诉你使用前 Agent 在猜什么、使用后仓库多了哪些明确材料。

第二条命令生成代理说明和任务卡：

```bash
npx @chent6767/agent-ready-kit init . --write
```

结尾：

如果你正在用 Codex、Claude Code、Cursor 或 Copilot coding agent，可以拿自己的项目试一下。项目已经开源在 GitHub，搜索 `agent-ready-kit` 或看简介里的链接。

## GitHub Issue 或 PR 外联

适合给 AI 工具链项目发 issue：

Hi, I built a small open-source tool that checks whether a repository gives AI coding agents enough context to work safely: setup commands, tests, CI, repo maps, safety boundaries, and `AGENTS.md`.

It returns an Agent Ready Score and can generate `AGENTS.md`, task cards, guard rules, reports, and a GitHub Action gate.

Repo: https://github.com/chen9965/agent-ready-kit

I think it may be useful for projects that want Codex, Claude Code, Cursor, or Copilot coding agents to work with clearer repo-specific instructions. If this direction fits your workflow, I would love feedback on what signals or generated files should be added.

中文版本：

你好，我做了一个开源小工具 `agent-ready-kit`，用来检查仓库有没有把 AI 编码代理需要的上下文讲清楚：安装命令、测试、CI、仓库地图、安全边界和 `AGENTS.md`。

它可以生成 AI Agent 就绪度评分、`AGENTS.md`、任务卡、guard rules、报告和 GitHub Action 门禁。

仓库：https://github.com/chen9965/agent-ready-kit

如果你的项目希望更好地支持 Codex、Claude Code、Cursor 或 Copilot coding agent，这个方向可能有帮助。欢迎给一些真实仓库里的需求或反馈。

## 评论区回复

有人问“和 README 生成器有什么区别”：

它不只是生成文档，而是把 README、测试、脚本、CI、仓库地图、安全边界这些信号一起评分，并输出 Agent 可以直接使用的 `AGENTS.md`、任务卡和 guard rules。

有人问“会不会上传代码”：

默认会把有限采样代码上下文发给维护者托管代理，但源码里不会包含维护者的真实 key。如果你不想上传代码，可以加 `--no-llm`；只想发摘要可以加 `--llm-summary`；只想跳过托管代理但使用自己的 key，可以加 `--no-managed-llm`。

有人问“国内能不能用”：

当前可以直接通过 npm 使用：

```bash
npx @chent6767/agent-ready-kit .
```

如果 npm 网络不稳定，也可以从 GitHub 源码运行：

```bash
npx github:chen9965/agent-ready-kit .
```

有人问“为什么需要这个”：

AI 编码代理越常进入真实工程，仓库就越需要把工作规则写清楚。否则 Agent 只能猜命令、猜边界、猜验证方式，最后成本会落到 review 上。
