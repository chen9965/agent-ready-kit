# agent-ready-kit v0.6 中文视频发布包

这份文档对应 v0.6 中文短视频，用来发布到小红书、抖音、B 站、知乎视频和朋友圈。视频文件由本地脚本生成，放在 `.agent-ready/video/`，不提交到仓库。

当前视频版本：

- 结构：6 个场景，重点讲清楚“能做什么、输出什么、优势在哪里、和别的工具有什么区别”。
- 配音：Microsoft Edge Neural TTS，`zh-CN-XiaoxiaoNeural`。
- 字幕：短句级字幕，每句配音独立计时，避免字幕和人声错位。
- 转场：0.45 秒稳定 crossfade，不使用抖动、glitch 或大幅滑动转场。
- 时长：约 67 秒。
- 核心信息：扫描仓库、给 Agent Ready Score、生成 Agent 工作材料；默认免 API Key。

## 视频主线

一句话：

`agent-ready-kit` 是一个仓库体检工具：扫描仓库是否适合 AI 编码代理接手，并生成 Agent 能直接用的工作材料。

更明确的解释：

它不是 linter，不是 README 生成器，也不是聊天套壳。它先看仓库有没有把 Agent 需要的信息讲清楚：安装命令、测试命令、CI、项目入口、目录边界、忽略规则和 `AGENTS.md`。然后给出 `Agent Ready Score`，并生成报告、任务卡、前后对比、行动计划和 guard rules。

## 口播脚本

开场：

`agent-ready-kit` 是一个仓库体检工具。它判断仓库是否适合 AI 编码代理接手。

三件事：

它做三件事：扫描、评分、生成材料。输出 `AGENTS.md`、报告、任务卡和行动计划。

检查内容：

它检查安装命令、测试命令、CI，还会看项目入口、目录边界、忽略规则和 `AGENTS.md`。

优势：

优势是把模糊规则变成清单。缺什么、先改什么、怎么验证，都写出来。

对比：

它不是 linter，也不是 README 生成器。它专门看仓库能不能让 Agent 顺利工作。

使用前后：

使用前，Agent 靠猜。使用后，命令、边界和验证路径都写出来。

结尾：

一条 npx 命令开始，默认免 API Key，也支持直接扫描 GitHub URL。

## 平台标题

小红书 / 抖音：

- 给 AI 改代码前，先给仓库做一次体检
- 我做了个工具：判断仓库适不适合 AI Agent 接手
- 别让 Codex/Claude Code 靠猜：先跑 Agent Ready Score

B 站：

- 67 秒看懂 agent-ready-kit：让仓库更适合 AI 编码代理
- 我做了一个开源 CLI：扫描仓库的 AI Agent 就绪度
- 为什么同一个 AI Agent 在不同仓库表现差很多？

知乎：

- AI 编码代理时代，仓库也需要一份上岗说明书
- agent-ready-kit：给仓库做 AI Agent 就绪度体检
- Codex、Claude Code、Cursor 进仓库前，最好先知道这些规则

## 平台简介

短版：

我做了一个开源工具 `agent-ready-kit`：扫描仓库是否适合 AI 编码代理接手，输出 Agent Ready Score，并生成 `AGENTS.md`、报告、任务卡、前后对比、行动计划和 guard rules。默认免 API Key，也可以直接扫描 GitHub 仓库 URL。

带命令版：

```bash
npx @chent6767/agent-ready-kit .
npx @chent6767/agent-ready-kit https://github.com/owner/repo --out .agent-ready
npx @chent6767/agent-ready-kit init . --write
```

GitHub：

https://github.com/chen9965/agent-ready-kit

## 封面文案

- 给 AI 改代码前，先给仓库做体检
- Agent Ready Score
- 扫描、评分、生成 Agent 工作材料
- 默认免 API Key

## 置顶评论

试用命令：

```bash
npx @chent6767/agent-ready-kit .
npx @chent6767/agent-ready-kit . --out .agent-ready
```

它会扫描 README、脚本、测试、CI、仓库地图、忽略规则和 `AGENTS.md`，输出 Agent Ready Score，并生成 Agent 可以直接使用的工作材料。

项目地址：

https://github.com/chen9965/agent-ready-kit

## 常见回复

问：这和 README 生成器有什么区别？

答：README 主要给人看；`agent-ready-kit` 关注的是 AI 编码代理能不能顺利工作。它会评分，并生成 `AGENTS.md`、任务卡、报告、前后对比、行动计划和 guard rules。

问：这和 linter 有什么区别？

答：linter 看代码风格和语法；`agent-ready-kit` 看仓库协作信息是否完整，比如安装、测试、CI、项目入口、边界和验证方式。

问：为什么要接大模型？

答：静态扫描能找到 README、脚本、测试和 CI；大模型能把这些信号整理成更像 reviewer 的建议。默认路径免 API Key，也可以用 `--no-llm` 只做本地扫描。

问：国内能不能用？

答：npm 能访问时直接运行 `npx @chent6767/agent-ready-kit .`。如果默认建议不可用，CLI 仍然可以回退到本地扫描。

## 音乐署名

视频 BGM 使用 `Carefree` by Kevin MacLeod (incompetech.com)，许可为 Creative Commons: By Attribution 4.0 License。

https://creativecommons.org/licenses/by/4.0/
