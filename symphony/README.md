# Symphony

A TypeScript implementation of the [Symphony specification](https://github.com/openai/symphony/blob/main/SPEC.md) — a long-running orchestration service that continuously reads work from a Linear issue tracker, creates isolated per-issue workspaces, and runs Codex coding-agent sessions for each issue.

## Requirements

- Node.js ≥ 20
- A Linear workspace with a project slug
- A `LINEAR_API_KEY` environment variable (or literal value in `WORKFLOW.md`)
- The `codex` CLI installed and authenticated ([docs](https://developers.openai.com/codex/app-server))

## Quick Start

```bash
# 1. Install dependencies
cd symphony
npm install

# 2. Build
npm run build

# 3. Configure (edit WORKFLOW.md at repo root or point --workflow to your file)
export LINEAR_API_KEY=lin_api_xxx
export LINEAR_PROJECT_SLUG=your-project

# 4. Run
node dist/index.js
# or with optional HTTP dashboard:
node dist/index.js --port 8080
```

## WORKFLOW.md

The `WORKFLOW.md` file at the repository root is the **single source of truth** for all Symphony runtime behaviour: tracker connection, polling cadence, concurrency limits, workspace hooks, agent settings, and the per-issue prompt template.

Modify `WORKFLOW.md` to customise how Symphony handles your Linear issues. Changes to the file are detected automatically and applied to future ticks without restart.

See the bundled [`../WORKFLOW.md`](../WORKFLOW.md) for a fully-annotated example.

## CLI Reference

```
symphony [options]

Options:
  --workflow, -w <path>       Path to WORKFLOW.md (default: ./WORKFLOW.md)
  --port, -p <port>           Start HTTP dashboard/API server on this port
  --log-level, -l <level>     Log level: debug|info|warn|error (default: info)
  --help, -h                  Show this help

Environment variables:
  LINEAR_API_KEY              Linear API token
  LINEAR_PROJECT_SLUG         Linear project slug (used in WORKFLOW.md as $VAR)
  SYMPHONY_WORKSPACE_ROOT     Workspace directory (used in WORKFLOW.md as $VAR)
  SYMPHONY_LOG_LEVEL          Minimum log level
```

## HTTP API

When `--port` is provided (or `server.port` is set in `WORKFLOW.md`), Symphony serves an optional observability interface:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Human-readable HTML dashboard |
| `GET` | `/api/v1/state` | JSON snapshot of runtime state |
| `GET` | `/api/v1/<identifier>` | Per-issue debug details |
| `POST` | `/api/v1/refresh` | Trigger an immediate poll cycle |

## Architecture

```
symphony/src/
├── types.ts          — Domain model (Issue, Workspace, RunAttempt, etc.)
├── logger.ts         — Structured key=value logging to stderr
├── workflow-loader.ts— WORKFLOW.md parser (YAML front matter + prompt body)
├── config.ts         — Typed config layer (defaults, $VAR resolution, validation)
├── linear-client.ts  — Linear GraphQL adapter (fetch candidates, reconcile, cleanup)
├── workspace.ts      — Per-issue workspace lifecycle + shell hooks
├── prompt-builder.ts — Liquid template rendering for per-issue prompts
├── agent-runner.ts   — Codex app-server JSON-RPC protocol over stdio
├── orchestrator.ts   — Poll loop, concurrency, retries, reconciliation
├── http-server.ts    — Optional HTTP dashboard + /api/v1/* endpoints
└── index.ts          — CLI entry point
```

## Trust and Safety

Symphony is designed for **trusted environments**.

- Auto-approves command execution and file-change approvals by default.
- Workspace paths are validated to stay inside the configured workspace root.
- Workspace directory names are sanitised to `[A-Za-z0-9._-]` only.
- API tokens are resolved from environment variables and never logged.
- Hook scripts are arbitrary shell from `WORKFLOW.md` — treat `WORKFLOW.md` as trusted configuration.

For less-trusted environments, configure stricter `codex.approval_policy` and `codex.thread_sandbox` values, or add OS-level sandboxing outside Symphony.

## Development

```bash
npm run build       # Compile TypeScript to dist/
npm run build:watch # Watch mode
npm run typecheck   # Type-check without emitting
```
