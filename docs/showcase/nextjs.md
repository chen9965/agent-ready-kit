# vercel/next.js Showcase / 扫描示例

- Repository / 仓库: `https://github.com/vercel/next.js.git`
- Commit / 提交: `f84c69476a24`
- Scan command / 扫描命令: `node dist/cli.js scan next.js --markdown`
- Generated / 生成时间: 2026-06-30

## Agent Ready Score / AI 代理就绪度

- **Score / 分数:** 85/100
- **Status / 状态:** PASS (minimum / 最低要求: 70)
- **Stack / 技术栈:** Next.js, Node.js, React, Rust, TypeScript
- **Files scanned / 扫描文件:** 29538

## Score Breakdown / 评分明细

| Area | Score |
| --- | ---: |
| Docs / 文档 | 90 |
| Tests / 测试 | 90 |
| Scripts / 脚本 | 92 |
| CI / 持续集成 | 92 |
| Repo map / 仓库地图 | 90 |
| Safety / 安全 | 45 |
| Onboarding / 上手体验 | 94 |

## Detected Signals / 检测信号

| Signal | Present |
| --- | --- |
| README | yes |
| License | yes |
| Tests | yes |
| Package scripts | yes |
| CI workflow | yes |
| Agent instructions | yes |
| Repo map | yes |
| Environment example | no |
| Git ignore | yes |

## Top Findings / 主要发现

| Severity | Finding | Fix |
| --- | --- | --- |
| FAIL | Review possible secrets / 检查疑似密钥 | Move secrets to environment variables and keep only safe examples in source control. / 把密钥迁移到环境变量，源码中只保留安全示例。 |
| INFO | Split very large files / 拆分超大文件 | Extract cohesive modules or add local orientation comments before high-risk sections. / 提取内聚模块，或在高风险区域前添加简短定位注释。 |

## Takeaway / 解读

Next.js is a strong example of an agent-ready repository shape: it has docs, tests, scripts, CI, agent instructions, and repo-map evidence. The remaining findings are conservative safety and maintainability review prompts.

Next.js 是一个比较强的 Agent-ready 仓库样本：文档、测试、脚本、CI、Agent 说明和仓库地图信号都比较明确。剩余发现主要是保守的安全复核和可维护性提醒。
