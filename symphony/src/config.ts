/**
 * Symphony — Config Layer (section 6).
 *
 * Provides typed getters for all workflow config values, applying defaults and
 * resolving `$VAR` / `~` in path/key fields.
 *
 * The raw config is a plain object from YAML front matter.
 * This module only reads it — never writes.
 */

import * as os from 'os';
import * as path from 'path';
import type {
  ServiceConfig,
  TrackerConfig,
  PollingConfig,
  WorkspaceConfig,
  HooksConfig,
  AgentConfig,
  CodexConfig,
  ServerConfig,
  WorkflowDefinition,
  ValidationError,
} from './types.js';

// ---------------------------------------------------------------------------
// Default values (section 6.4)
// ---------------------------------------------------------------------------

const DEFAULTS = {
  TRACKER_ENDPOINT_LINEAR: 'https://api.linear.app/graphql',
  TRACKER_ACTIVE_STATES: ['Todo', 'In Progress'],
  TRACKER_TERMINAL_STATES: ['Closed', 'Cancelled', 'Canceled', 'Duplicate', 'Done'],
  POLL_INTERVAL_MS: 30_000,
  WORKSPACE_ROOT: path.join(os.tmpdir(), 'symphony_workspaces'),
  HOOKS_TIMEOUT_MS: 60_000,
  AGENT_MAX_CONCURRENT: 10,
  AGENT_MAX_TURNS: 20,
  AGENT_MAX_RETRY_BACKOFF_MS: 300_000,
  CODEX_COMMAND: 'codex app-server',
  CODEX_TURN_TIMEOUT_MS: 3_600_000,
  CODEX_READ_TIMEOUT_MS: 5_000,
  CODEX_STALL_TIMEOUT_MS: 300_000,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve `$VAR_NAME` and `~` in a path or key string. */
export function resolveValue(value: string): string {
  if (value.startsWith('$')) {
    const varName = value.slice(1);
    return process.env[varName] ?? '';
  }
  if (value.startsWith('~')) {
    return value.replace(/^~/, os.homedir());
  }
  // If the value contains path separators expand absolute/relative paths
  return value;
}

/** Expand a path value: handle `~` and `$VAR`, then normalise. */
function expandPath(value: string): string {
  const resolved = resolveValue(value);
  // Only normalise strings that look like a path (contain separators or ~)
  if (resolved.includes('/') || resolved.includes('\\') || resolved.startsWith('~')) {
    return path.resolve(resolved);
  }
  // Bare name without separators — preserve as-is (relative allowed per spec)
  return resolved;
}

/** Coerce to positive integer; return null on failure. */
function toPositiveInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Coerce to non-negative integer; return null on failure. */
function toNonNegativeInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : NaN;
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** Coerce to integer (any); return null on failure. */
function toInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : NaN;
  return Number.isInteger(n) ? n : null;
}

/** Parse state list — accepts array of strings OR comma-separated string. */
function parseStateList(v: unknown, defaults: readonly string[]): string[] {
  if (Array.isArray(v)) {
    return v.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof v === 'string') {
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [...defaults];
}

function getString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === 'string' ? v : null;
}

function getObj(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = obj[key];
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

// ---------------------------------------------------------------------------
// Typed config builder
// ---------------------------------------------------------------------------

/**
 * Build a fully-typed `ServiceConfig` from a raw workflow definition.
 * Resolves env vars, applies defaults, and normalises all values.
 */
export function buildConfig(wf: WorkflowDefinition): ServiceConfig {
  const raw = wf.config;

  // --- tracker ---
  const trackerRaw = getObj(raw, 'tracker');
  const trackerKind = getString(trackerRaw, 'kind') ?? '';
  const trackerEndpointRaw = getString(trackerRaw, 'endpoint');
  const trackerEndpoint =
    trackerEndpointRaw ??
    (trackerKind === 'linear' ? DEFAULTS.TRACKER_ENDPOINT_LINEAR : '');
  const apiKeyRaw = getString(trackerRaw, 'api_key') ?? '';
  const apiKey = resolveValue(apiKeyRaw);
  const projectSlug = getString(trackerRaw, 'project_slug') ?? '';
  const activeStates = parseStateList(trackerRaw['active_states'], DEFAULTS.TRACKER_ACTIVE_STATES);
  const terminalStates = parseStateList(
    trackerRaw['terminal_states'],
    DEFAULTS.TRACKER_TERMINAL_STATES,
  );

  const tracker: TrackerConfig = {
    kind: trackerKind,
    endpoint: trackerEndpoint,
    api_key: apiKey,
    project_slug: projectSlug,
    active_states: activeStates,
    terminal_states: terminalStates,
  };

  // --- polling ---
  const pollingRaw = getObj(raw, 'polling');
  const intervalMs = toNonNegativeInt(pollingRaw['interval_ms']) ?? DEFAULTS.POLL_INTERVAL_MS;
  const polling: PollingConfig = { interval_ms: intervalMs };

  // --- workspace ---
  const workspaceRaw = getObj(raw, 'workspace');
  const workspaceRootRaw = getString(workspaceRaw, 'root');
  const workspaceRoot = workspaceRootRaw
    ? expandPath(resolveValue(workspaceRootRaw))
    : DEFAULTS.WORKSPACE_ROOT;
  const workspace: WorkspaceConfig = { root: workspaceRoot };

  // --- hooks ---
  const hooksRaw = getObj(raw, 'hooks');
  const hooksTimeoutRaw = toInt(hooksRaw['timeout_ms']);
  // Non-positive or null falls back to default (spec: non-positive = invalid → default)
  const hooksTimeout =
    hooksTimeoutRaw !== null && hooksTimeoutRaw > 0
      ? hooksTimeoutRaw
      : DEFAULTS.HOOKS_TIMEOUT_MS;
  const hooks: HooksConfig = {
    after_create: getString(hooksRaw, 'after_create'),
    before_run: getString(hooksRaw, 'before_run'),
    after_run: getString(hooksRaw, 'after_run'),
    before_remove: getString(hooksRaw, 'before_remove'),
    timeout_ms: hooksTimeout,
  };

  // --- agent ---
  const agentRaw = getObj(raw, 'agent');
  const maxConcurrent = toPositiveInt(agentRaw['max_concurrent_agents']) ?? DEFAULTS.AGENT_MAX_CONCURRENT;
  const maxTurns = toPositiveInt(agentRaw['max_turns']) ?? DEFAULTS.AGENT_MAX_TURNS;
  const maxRetryBackoff =
    toPositiveInt(agentRaw['max_retry_backoff_ms']) ?? DEFAULTS.AGENT_MAX_RETRY_BACKOFF_MS;

  // Per-state concurrency map: normalise state keys, ignore non-positive values
  const perStateRaw = getObj(agentRaw, 'max_concurrent_agents_by_state');
  const perState: Record<string, number> = {};
  for (const [k, v] of Object.entries(perStateRaw)) {
    const n = toPositiveInt(v);
    if (n !== null) {
      perState[k.trim().toLowerCase()] = n;
    }
  }

  const agent: AgentConfig = {
    max_concurrent_agents: maxConcurrent,
    max_turns: maxTurns,
    max_retry_backoff_ms: maxRetryBackoff,
    max_concurrent_agents_by_state: perState,
  };

  // --- codex ---
  const codexRaw = getObj(raw, 'codex');
  const codexCommand = getString(codexRaw, 'command') ?? DEFAULTS.CODEX_COMMAND;
  const turnTimeout = toPositiveInt(codexRaw['turn_timeout_ms']) ?? DEFAULTS.CODEX_TURN_TIMEOUT_MS;
  const readTimeout = toPositiveInt(codexRaw['read_timeout_ms']) ?? DEFAULTS.CODEX_READ_TIMEOUT_MS;
  const stallTimeoutRaw = toInt(codexRaw['stall_timeout_ms']);
  // stall_timeout_ms <= 0 disables stall detection (spec 8.5 part A)
  const stallTimeout = stallTimeoutRaw ?? DEFAULTS.CODEX_STALL_TIMEOUT_MS;
  const codex: CodexConfig = {
    command: codexCommand,
    approval_policy: getString(codexRaw, 'approval_policy'),
    thread_sandbox: getString(codexRaw, 'thread_sandbox'),
    turn_sandbox_policy: getString(codexRaw, 'turn_sandbox_policy'),
    turn_timeout_ms: turnTimeout,
    read_timeout_ms: readTimeout,
    stall_timeout_ms: stallTimeout,
  };

  // --- server (optional extension) ---
  const serverRaw = getObj(raw, 'server');
  const serverPort = toNonNegativeInt(serverRaw['port']);
  const server: ServerConfig = { port: serverPort };

  return { tracker, polling, workspace, hooks, agent, codex, server };
}

// ---------------------------------------------------------------------------
// Dispatch preflight validation (section 6.3)
// ---------------------------------------------------------------------------

/** Validate configuration before attempting dispatch. Returns null if valid. */
export function validateConfig(config: ServiceConfig): ValidationError | null {
  if (!config.tracker.kind) {
    return { code: 'unsupported_tracker_kind', message: 'tracker.kind is missing or empty' };
  }
  if (config.tracker.kind !== 'linear') {
    return {
      code: 'unsupported_tracker_kind',
      message: `Unsupported tracker kind: "${config.tracker.kind}". Only "linear" is supported.`,
    };
  }
  if (!config.tracker.api_key) {
    return { code: 'missing_tracker_api_key', message: 'tracker.api_key is missing or empty after $VAR resolution' };
  }
  if (!config.tracker.project_slug) {
    return { code: 'missing_tracker_project_slug', message: 'tracker.project_slug is required for tracker.kind=linear' };
  }
  if (!config.codex.command.trim()) {
    return { code: 'missing_codex_command', message: 'codex.command is empty' };
  }
  return null;
}

/** Normalise a state name for comparison: trim + lowercase (spec 4.2). */
export function normaliseState(state: string): string {
  return state.trim().toLowerCase();
}

/** Check if a state is in the configured active states. */
export function isActiveState(state: string, config: ServiceConfig): boolean {
  const norm = normaliseState(state);
  return config.tracker.active_states.some((s) => normaliseState(s) === norm);
}

/** Check if a state is in the configured terminal states. */
export function isTerminalState(state: string, config: ServiceConfig): boolean {
  const norm = normaliseState(state);
  return config.tracker.terminal_states.some((s) => normaliseState(s) === norm);
}
