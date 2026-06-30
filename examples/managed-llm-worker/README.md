# agent-ready-kit Managed LLM Worker

This Cloudflare Worker lets `agent-ready-kit` offer zero-config LLM recommendations without putting a model API key into the public npm package.

这个 Worker 用来把维护者自己的大模型 key 放在服务端，让普通用户一条命令就能获得 LLM 建议，而不是把 key 写进公开 npm 包。

## Deploy

```bash
cd examples/managed-llm-worker
cp wrangler.toml.example wrangler.toml
npx wrangler secret put AGNES_API_KEY
npx wrangler deploy
```

Optional secrets and variables:

```bash
npx wrangler secret put UPSTREAM_API_KEY
```

By default the worker uses Agnes:

```toml
[vars]
UPSTREAM_BASE_URL = "https://apihub.agnes-ai.com/v1"
UPSTREAM_MODEL = "agnes-2.0-flash"
```

For OpenRouter:

```toml
[vars]
UPSTREAM_BASE_URL = "https://openrouter.ai/api/v1"
UPSTREAM_MODEL = "openrouter/free"
```

For SiliconFlow:

```toml
[vars]
UPSTREAM_BASE_URL = "https://api.siliconflow.cn/v1"
UPSTREAM_MODEL = "Qwen/Qwen3-8B"
```

## Wire The CLI

After deployment, either use the built-in default endpoint if you deploy to:

```text
https://agent-ready-kit-llm.chen9965.workers.dev/v1/recommend
```

or point the CLI at your URL:

```powershell
$env:AGENT_READY_LLM_MANAGED_URL="https://your-worker.example/v1/recommend"
npx @chent6767/agent-ready-kit .
```

If the managed proxy fails, users can still bring their own key:

```powershell
$env:AGENT_READY_LLM_API_KEY="their_key"
npx @chent6767/agent-ready-kit .
```

## Why Not Hardcode The Key?

Anything shipped in npm or GitHub can be extracted. A worker keeps the real key server-side, where you can rotate it, rate-limit it, and disable it without publishing a new package.
