# agent-ready-kit v0.6 中文视频发布包

这份文档对应 v0.6 中文短视频，用来发布到小红书、抖音、B 站、知乎视频和朋友圈。视频文件由本地脚本生成，放在 `.agent-ready/video/`，不提交到仓库。

当前视频版本：

- 结构：6 个场景，重点讲清楚“怎么帮助大模型、用了之后有什么优势、和别的工具有什么区别”。
- 配音：Microsoft Edge Neural TTS，`zh-CN-XiaoxiaoNeural`。
- 字幕：短句级字幕，每句配音独立计时，避免字幕和人声错位。
- 转场：0.45 秒稳定 crossfade，不使用抖动、glitch 或大幅滑动转场。
- 时长：约 66 秒。
- 核心信息：给大模型补仓库上下文；用了之后少猜命令、少改错层级、验证路径更清楚；默认免 API Key。

## 视频主线

一句话：

`agent-ready-kit` 是一个给大模型补仓库上下文的工具：它把命令、入口、目录边界和验证方式整理成 Agent 能直接使用的工作材料。

更明确的解释：

它不是 linter，不是 README 生成器，也不是聊天套壳。它的重点是帮助 Codex、Claude Code、Cursor 这类大模型编码代理看懂仓库：该看哪里、跑什么命令、哪些文件别碰、改完怎么验证。

## 口播脚本

开场：

`agent-ready-kit` 是帮大模型理解仓库的工具。它把仓库规则整理成 Agent 可读上下文。

使用后优势：

使用前，大模型只能猜命令和边界。使用后，它知道看哪里、跑什么、别改什么。

补齐上下文：

它会补齐安装命令、测试命令、CI，还会整理项目入口、目录边界、忽略规则和 `AGENTS.md`。

优势：

核心优势是把隐含规则交给模型。以前靠人提醒，现在直接写成文件。

对比：

它不是 linter，也不是 README 生成器。它是在给大模型准备工作上下文。

结果：

模型少猜，少改错。命令、边界和验证路径都写出来。

结尾：

一条 npx 命令开始，默认免 API Key，也支持直接扫描 GitHub URL。

## 平台标题

小红书 / 抖音：

- 给大模型补仓库上下文：让 Agent 少猜少改错
- 我做了个工具：把仓库规则整理给 AI 编码代理
- 别让 Codex/Claude Code 靠猜：先生成 Agent 工作上下文

B 站：

- 66 秒看懂 agent-ready-kit：给大模型补仓库上下文
- 我做了一个开源 CLI：让 AI 编码代理少猜少改错
- 为什么同一个 AI Agent 在不同仓库表现差很多？

知乎：

- AI 编码代理时代，仓库也需要给大模型准备上下文
- agent-ready-kit：把仓库规则整理成 Agent 可读材料
- Codex、Claude Code、Cursor 进仓库前，最好先知道这些规则

## 平台简介

短版：

我做了一个开源工具 `agent-ready-kit`：把仓库里的命令、入口、边界和验证方式整理成大模型可读上下文，生成 `AGENTS.md`、报告、任务卡、前后对比、行动计划和 guard rules。用了之后，AI 编码代理更少猜命令、更少改错文件、更容易按规则验证。默认免 API Key，也可以直接扫描 GitHub 仓库 URL。

带命令版：

```bash
npx @chent6767/agent-ready-kit .
npx @chent6767/agent-ready-kit https://github.com/owner/repo --out .agent-ready
npx @chent6767/agent-ready-kit init . --write
```

GitHub：

https://github.com/chen9965/agent-ready-kit

## 封面文案

- 给大模型补仓库上下文
- 让 Agent 少猜少改错
- 生成 AGENTS.md / 任务卡 / 验证清单
- 默认免 API Key

## 置顶评论

试用命令：

```bash
npx @chent6767/agent-ready-kit .
npx @chent6767/agent-ready-kit . --out .agent-ready
```

它会整理 README、脚本、测试、CI、仓库地图、忽略规则和 `AGENTS.md`，生成 Agent 可以直接使用的工作上下文。

项目地址：

https://github.com/chen9965/agent-ready-kit

## 常见回复

问：这和 README 生成器有什么区别？

答：README 主要给人看；`agent-ready-kit` 是给大模型准备工作上下文。它会生成 `AGENTS.md`、任务卡、报告、前后对比、行动计划和 guard rules，让 Agent 少猜命令、少改错文件。

问：这和 linter 有什么区别？

答：linter 看代码风格和语法；`agent-ready-kit` 看大模型改代码前缺不缺仓库上下文，比如安装、测试、CI、项目入口、边界和验证方式。

问：为什么要接大模型？

答：它本来就应该主要靠大模型。静态扫描负责找 README、脚本、测试、CI 和代码采样；大模型负责把这些信号整理成更适合 Agent 使用的上下文和建议。默认路径免 API Key，只有隐私或故障兜底时才用 `--no-llm`。

问：国内能不能用？

答：npm 能访问时直接运行 `npx @chent6767/agent-ready-kit .`。默认就是 LLM-first；如果托管建议不可用，优先自带 OpenAI 兼容 key，最后才回退到本地扫描。

## 音乐署名

视频 BGM 使用 `Carefree` by Kevin MacLeod (incompetech.com)，许可为 Creative Commons: By Attribution 4.0 License。

https://creativecommons.org/licenses/by/4.0/
