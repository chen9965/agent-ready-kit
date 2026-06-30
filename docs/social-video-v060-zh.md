# agent-ready-kit v0.6 中文视频发布包

这份文档对应 v0.6 发布视频，用来发布到小红书、抖音、B 站、知乎视频和朋友圈。视频文件由本地脚本生成，放在 `.agent-ready/video/`，不提交到仓库。

## 视频主线

一句话：

`agent-ready-kit` 把一个仓库变成更适合 AI 编码代理接手的工作空间。

更明确的解释：

它不是再包一层聊天模型，而是先扫描仓库本身有没有讲清楚 Agent 工作需要的信息：安装命令、测试命令、CI、目录结构、安全边界、`AGENTS.md` 和上手流程。扫描后会输出 Agent Ready Score，并生成报告、任务卡、guard rules、前后对比和行动计划。

v0.6 的新增重点：

- 默认优先请求维护者托管的 Agnes/Cloudflare 大模型代理，普通用户不需要先申请模型 key。
- 托管代理不可用时，CLI 会快速回退到本地确定性扫描，并提示高级用户自带 OpenAI-compatible key。
- 可以直接输入本地路径、`owner/repo` 或 GitHub URL。
- `--out .agent-ready` 会生成 `scan.json`、`report.md`、`before-after.md` 和 `action-plan.md`，适合展示大仓库使用前后的差别。
- 真实模型 key 只放在服务端，不写进 npm 包，也不写进 GitHub。
- LLM 只读取有限采样和摘要，并跳过明显像密钥的路径和内容。

## 90 秒口播脚本

开场：

仓库别再让 AI Agent 盲猜。`agent-ready-kit` 一条命令，把 repo 变成可被 Codex、Claude Code、Cursor 接手的工作空间。

托管大模型：

默认托管 Agnes，用户不用先申请 key。CLI 会优先请求维护者托管的大模型代理；代理不可用时，才提示用户自带 OpenAI-compatible key。

输入方式：

本地路径、`owner/repo`、GitHub URL 都能扫。输入仓库链接后，它会自动浅克隆到临时目录，再完成扫描。

评分：

它会给仓库一个 Agent Ready Score。分数来自文档、测试、脚本、CI、仓库地图、安全边界和上手流程这些可解释信号。

输出：

输出不是空文档，而是一套 Agent 工作材料：`AGENTS.md`、任务卡、`guards.json`、`report.md`、`before-after.md` 和 `action-plan.md`。

安全：

维护者的模型密钥不会写进 npm 包。真实密钥只放在服务端，不会写进 npm 和 GitHub。源码也只做有限采样，并跳过疑似密钥内容。

CI：

它还可以放进 GitHub Actions，输出双语 summary，分数低于 `min-score` 时让 PR 直接失败。

结尾：

现在运行 `npx @chent6767/agent-ready-kit .`，就可以给你的仓库打分。觉得这个方向有用，欢迎 Star 和反馈。

## 平台标题

小红书 / 抖音：

- 仓库交给 AI 改代码前，先跑一次这个评分
- 别让 Codex/Claude Code 靠猜：我做了个 Agent Ready Score
- 一条命令，让你的仓库更适合 AI 编码代理

B 站：

- 我做了一个开源 CLI：给仓库生成 AI Agent 就绪度评分
- 为什么同一个 AI Agent 在不同仓库表现差很多？
- 90 秒看懂 agent-ready-kit：仓库给 AI Agent 的上岗说明书

知乎：

- AI 编码代理时代，仓库也需要一份上岗说明书
- 为什么我做了 agent-ready-kit：让仓库先学会配合 Agent
- Codex、Claude Code、Cursor 进仓库前，最好先知道这些规则

## 平台简介

短版：

我做了一个开源工具 `agent-ready-kit`：扫描仓库是否适合 AI 编码代理接手，输出 Agent Ready Score，并生成 `AGENTS.md`、任务卡、guard rules、报告、前后对比和行动计划。v0.6 默认走托管 Agnes 大模型代理，普通用户不用先申请 key，也可以直接扫 GitHub URL。

带命令版：

```bash
npx @chent6767/agent-ready-kit .
npx @chent6767/agent-ready-kit https://github.com/owner/repo --out .agent-ready
npx @chent6767/agent-ready-kit init . --write
```

GitHub：

https://github.com/chen9965/agent-ready-kit

## 封面文案

- 仓库别再让 AI Agent 盲猜
- 一条命令打分：Agent Ready Score
- 自动生成 AGENTS.md / 任务卡 / CI 门禁
- 默认接入托管大模型，普通用户不用先申请 key

## 置顶评论

试用命令：

```bash
npx @chent6767/agent-ready-kit .
npx @chent6767/agent-ready-kit . --out .agent-ready
```

它会扫描 README、脚本、测试、CI、仓库地图、安全边界和 `AGENTS.md`，输出 Agent Ready Score，并生成 Agent 可以直接使用的工作材料。

项目地址：

https://github.com/chen9965/agent-ready-kit

## 常见回复

问：这和 README 生成器有什么区别？

答：它先评分仓库是否适合 AI 编码代理接手，再生成 Agent 需要的材料。重点不是写一篇好看的 README，而是把安装、测试、边界、CI、任务和 guard rules 变成可执行的协作信号。

问：会不会上传整个仓库源码？

答：不会上传整个仓库。默认 LLM 路径只做有限采样和摘要，并跳过明显像密钥的路径和内容。也可以用 `--llm-summary` 只发摘要，或用 `--no-llm` 完全关闭 LLM。

问：为什么默认接大模型？

答：纯静态扫描能识别 README、脚本、CI 和目录结构，但很难理解“这个项目的入口在哪里、哪些文件最该先看、README 没写清什么”。v0.6 默认接入托管大模型，是为了把静态信号转成更像真实 reviewer 的建议。

问：我的 key 会不会被打包到 npm？

答：不会。公开 npm 包里没有维护者模型 key。真实 key 必须放在服务端代理，例如 Cloudflare Worker secret。

问：国内能不能用？

答：npm 能访问时直接运行 `npx @chent6767/agent-ready-kit .`。如果托管代理访问失败，CLI 会回退到本地扫描；高级用户也可以自带 OpenAI-compatible key。

## 音乐署名

视频 BGM 使用 `Carefree` by Kevin MacLeod (incompetech.com)，许可为 Creative Commons: By Attribution 4.0 License。

https://creativecommons.org/licenses/by/4.0/
