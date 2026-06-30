# facebook/react Showcase / 扫描示例

- Repository / 仓库: `https://github.com/facebook/react.git`
- Commit / 提交: `d4e44545a984`
- Scan command / 扫描命令: `node dist/cli.js scan react --markdown`
- Generated / 生成时间: 2026-06-30

## Agent Ready Score / AI 代理就绪度

- **Score / 分数:** 68/100
- **Status / 状态:** FAIL (minimum / 最低要求: 70)
- **Stack / 技术栈:** Node.js, TypeScript
- **Files scanned / 扫描文件:** 7243

## Score Breakdown / 评分明细

| Area | Score |
| --- | ---: |
| Docs / 文档 | 90 |
| Tests / 测试 | 90 |
| Scripts / 脚本 | 92 |
| CI / 持续集成 | 92 |
| Repo map / 仓库地图 | 54 |
| Safety / 安全 | 45 |
| Onboarding / 上手体验 | 10 |

## Detected Signals / 检测信号

| Signal | Present |
| --- | --- |
| README | yes |
| License | yes |
| Tests | yes |
| Package scripts | yes |
| CI workflow | yes |
| Agent instructions | no |
| Repo map | no |
| Environment example | no |
| Git ignore | yes |

## Top Findings / 主要发现

| Severity | Finding | Fix |
| --- | --- | --- |
| FAIL | Create AGENTS.md / 创建 AGENTS.md | Generate AGENTS.md with repo-specific commands, style rules, and safety boundaries. / 生成 AGENTS.md，写清仓库命令、代码风格和安全边界。 |
| INFO | Add a repo map / 添加仓库地图 | Add an architecture or repo-map section to README or AGENTS.md. / 在 README 或 AGENTS.md 中添加架构或仓库地图。 |
| FAIL | Review possible secrets / 检查疑似密钥 | Move secrets to environment variables and keep only safe examples in source control. / 把密钥迁移到环境变量，源码中只保留安全示例。 |
| INFO | Split very large files / 拆分超大文件 | Extract cohesive modules or add local orientation comments before high-risk sections. / 提取内聚模块，或在高风险区域前添加简短定位注释。 |

## Takeaway / 解读

React has strong general engineering signals, but this scan shows why an AI coding agent can still benefit from a repo-specific `AGENTS.md` and an explicit repo map.

React 的通用工程信号很强，但扫描结果也说明：即使是成熟大仓库，AI 编码代理仍然需要仓库专属 `AGENTS.md` 和明确的仓库地图。
