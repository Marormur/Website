---
# Symphony WORKFLOW.md — Portfolio Website project
# See https://github.com/openai/symphony/blob/main/SPEC.md for full schema docs.

tracker:
  kind: linear
  # API key — set LINEAR_API_KEY in your environment or replace $LINEAR_API_KEY
  # with a literal token (not recommended in version-controlled files).
  api_key: $LINEAR_API_KEY
  # Your Linear project's slug ID (visible in the project URL).
  project_slug: $LINEAR_PROJECT_SLUG
  active_states:
    - Todo
    - In Progress
  terminal_states:
    - Done
    - Cancelled
    - Canceled
    - Duplicate
    - Closed

polling:
  interval_ms: 30000

workspace:
  # Override with SYMPHONY_WORKSPACE_ROOT environment variable if desired.
  root: $SYMPHONY_WORKSPACE_ROOT

hooks:
  # Clone the repository into each fresh workspace.
  # For private repos, use SSH: git@github.com:Marormur/Website.git
  # or set a GITHUB_TOKEN and use: https://x-access-token:$GITHUB_TOKEN@github.com/Marormur/Website.git
  after_create: |
    git clone https://github.com/Marormur/Website.git .
    npm ci

  # Make sure dependencies are up-to-date and the workspace is on a fresh branch.
  before_run: |
    git fetch --all --prune
    git checkout main
    git pull --ff-only origin main
    npm ci

  # Run tests after the agent finishes to capture quality signal.
  after_run: |
    npm run typecheck || true

  timeout_ms: 120000

agent:
  max_concurrent_agents: 3
  max_turns: 20
  max_retry_backoff_ms: 300000
  # Optional: limit concurrency for specific states
  # max_concurrent_agents_by_state:
  #   in progress: 2

codex:
  command: codex app-server
  # See `codex app-server generate-json-schema` for valid values.
  approval_policy: auto-edit
  turn_timeout_ms: 3600000
  stall_timeout_ms: 300000

# Optional HTTP dashboard (uncomment to enable)
# server:
#   port: 8080
---

You are working on an issue from the **Marormur/Website** repository — a personal
portfolio website built as a macOS-style desktop environment with TypeScript,
Tailwind CSS, and Playwright end-to-end tests.

## Issue Details

- **Identifier**: {{ issue.identifier }}
- **Title**: {{ issue.title }}
- **State**: {{ issue.state }}{% if issue.priority %} (priority {{ issue.priority }}){% endif %}
{% if issue.description %}
## Description

{{ issue.description }}
{% endif %}
{% if issue.labels.size > 0 %}
## Labels

{{ issue.labels | join: ", " }}
{% endif %}
{% if issue.blocked_by.size > 0 %}
## Blocked By

{% for blocker in issue.blocked_by %}- {{ blocker.identifier }}: {{ blocker.state }}
{% endfor %}
{% endif %}
{% if attempt %}
## Retry Context

This is attempt **{{ attempt }}**.  If a previous attempt left partial work
(uncommitted changes, a work-in-progress branch, etc.) please review that
context and continue from where it left off.
{% endif %}

## Repository Context

- **Language**: TypeScript 5.9+ (strict mode)
- **CSS**: Tailwind CSS 3.4 (utility-first)
- **Tests**: Playwright E2E tests in `tests/e2e/`, Vitest unit tests in `tests/unit/`
- **Build**: `npm run build:ts` (TypeScript → `js/`), `npm run build:css` (Tailwind → `dist/`)
- **Dev server**: `npm run dev` (http://127.0.0.1:5173)
- **Lint**: `npm run lint`
- **Typecheck**: `npm run typecheck`
- **Source**: all TypeScript in `src/ts/`, all CSS in `src/css/`
- **IMPORTANT**: Never edit files in `js/` or `dist/` directly — they are build outputs.

## Your Task

Please implement the work described in the issue above.  Follow these steps:

1. Read and understand the full issue description.
2. Explore the relevant source files to understand the existing patterns.
3. Make the necessary code changes in `src/ts/` and/or `src/css/`.
4. Run `npm run typecheck` to verify TypeScript correctness.
5. Run `npm run lint` to verify code style.
6. Run `npm run test:e2e:quick` to check existing tests still pass.
7. If you add a new feature, add at least one E2E smoke test in `tests/e2e/`.
8. Commit your changes with a descriptive commit message.
9. Open a pull request targeting the `main` branch.
10. Update the Linear issue with a comment linking to the PR.

## Coding Conventions

- Use `API.i18n.translate('key', 'fallback')` for internationalised text.
- Use `API.theme.setPreference(...)` for theming.
- Register new ActionBus actions via `window.ActionBus.register(...)`.
- New windows/apps: follow the `BaseWindowInstance` pattern in `src/ts/apps/`.
- All event listener references must be stored and cleaned up on destroy.
- Run `npm run typecheck` before committing — minimum 77% type coverage required.
