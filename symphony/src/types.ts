/**
 * Symphony — core domain types.
 *
 * All types mirror the field definitions in the Symphony SPEC, sections 4.1.x.
 * Keep this file in sync with the spec; every field that the orchestrator,
 * workspace manager, agent runner or HTTP server depends on must be typed here.
 */

// ---------------------------------------------------------------------------
// 4.1.1  Issue
// ---------------------------------------------------------------------------

export interface BlockerRef {
  id: string | null;
  identifier: string | null;
  state: string | null;
}

export interface Issue {
  /** Stable tracker-internal ID — used as map keys. */
  id: string;
  /** Human-readable ticket key, e.g. ABC-123 — used for workspace naming. */
  identifier: string;
  title: string;
  description: string | null;
  /** Lower numbers = higher priority. null sorts last. */
  priority: number | null;
  /** Current tracker state name (NOT normalised — compare via normaliseState). */
  state: string;
  branch_name: string | null;
  url: string | null;
  /** Normalised to lowercase. */
  labels: string[];
  blocked_by: BlockerRef[];
  created_at: Date | null;
  updated_at: Date | null;
}

// ---------------------------------------------------------------------------
// 4.1.2  Workflow Definition
// ---------------------------------------------------------------------------

export interface WorkflowDefinition {
  /** Raw YAML front-matter root object. */
  config: Record<string, unknown>;
  /** Trimmed Markdown body (the per-issue prompt template). */
  prompt_template: string;
}

// ---------------------------------------------------------------------------
// 4.1.3  Service Config (typed view)
// ---------------------------------------------------------------------------

export interface TrackerConfig {
  kind: string;
  endpoint: string;
  api_key: string;
  project_slug: string;
  active_states: string[];
  terminal_states: string[];
}

export interface PollingConfig {
  interval_ms: number;
}

export interface WorkspaceConfig {
  root: string;
}

export interface HooksConfig {
  after_create: string | null;
  before_run: string | null;
  after_run: string | null;
  before_remove: string | null;
  /** Timeout in ms that applies to ALL hooks. Default 60 000. */
  timeout_ms: number;
}

export interface AgentConfig {
  max_concurrent_agents: number;
  max_turns: number;
  max_retry_backoff_ms: number;
  /** Normalised (lowercase) state name → positive integer concurrency limit. */
  max_concurrent_agents_by_state: Record<string, number>;
}

export interface CodexConfig {
  command: string;
  approval_policy: string | null;
  thread_sandbox: string | null;
  turn_sandbox_policy: string | null;
  turn_timeout_ms: number;
  read_timeout_ms: number;
  stall_timeout_ms: number;
}

export interface ServerConfig {
  port: number | null;
}

export interface ServiceConfig {
  tracker: TrackerConfig;
  polling: PollingConfig;
  workspace: WorkspaceConfig;
  hooks: HooksConfig;
  agent: AgentConfig;
  codex: CodexConfig;
  server: ServerConfig;
}

// ---------------------------------------------------------------------------
// 4.1.4  Workspace
// ---------------------------------------------------------------------------

export interface Workspace {
  path: string;
  workspace_key: string;
  created_now: boolean;
}

// ---------------------------------------------------------------------------
// 4.1.5  Run Attempt
// ---------------------------------------------------------------------------

export type RunStatus =
  | 'PreparingWorkspace'
  | 'BuildingPrompt'
  | 'LaunchingAgentProcess'
  | 'InitializingSession'
  | 'StreamingTurn'
  | 'Finishing'
  | 'Succeeded'
  | 'Failed'
  | 'TimedOut'
  | 'Stalled'
  | 'CanceledByReconciliation';

export interface RunAttempt {
  issue_id: string;
  issue_identifier: string;
  attempt: number | null;
  workspace_path: string;
  started_at: Date;
  status: RunStatus;
  error?: string;
}

// ---------------------------------------------------------------------------
// 4.1.6  Live Session (agent session metadata tracked in running map)
// ---------------------------------------------------------------------------

export interface LiveSession {
  session_id: string | null;
  thread_id: string | null;
  turn_id: string | null;
  codex_app_server_pid: string | null;
  last_codex_event: string | null;
  last_codex_timestamp: Date | null;
  last_codex_message: string;
  codex_input_tokens: number;
  codex_output_tokens: number;
  codex_total_tokens: number;
  last_reported_input_tokens: number;
  last_reported_output_tokens: number;
  last_reported_total_tokens: number;
  turn_count: number;
}

// ---------------------------------------------------------------------------
// 4.1.7  Retry Entry
// ---------------------------------------------------------------------------

export interface RetryEntry {
  issue_id: string;
  identifier: string;
  /** 1-based for retry queue. */
  attempt: number;
  due_at_ms: number;
  timer_handle: ReturnType<typeof setTimeout>;
  error: string | null;
}

// ---------------------------------------------------------------------------
// 4.1.8  Orchestrator Runtime State
// ---------------------------------------------------------------------------

export interface CodexTotals {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  seconds_running: number;
}

export interface RunningEntry extends LiveSession {
  worker_abort: AbortController;
  identifier: string;
  issue: Issue;
  retry_attempt: number | null;
  started_at: Date;
}

export interface OrchestratorState {
  poll_interval_ms: number;
  max_concurrent_agents: number;
  /** issue_id → RunningEntry */
  running: Map<string, RunningEntry>;
  /** Set of issue IDs reserved/running/retrying */
  claimed: Set<string>;
  /** issue_id → RetryEntry */
  retry_attempts: Map<string, RetryEntry>;
  /** Bookkeeping only — not dispatch gating */
  completed: Set<string>;
  codex_totals: CodexTotals;
  codex_rate_limits: unknown | null;
}

// ---------------------------------------------------------------------------
// Worker outcomes sent from worker to orchestrator
// ---------------------------------------------------------------------------

export type WorkerExitReason = 'normal' | 'error' | 'cancel';

export interface WorkerExitEvent {
  issue_id: string;
  reason: WorkerExitReason;
  error?: string;
  runtime_seconds: number;
  token_delta?: {
    input: number;
    output: number;
    total: number;
  };
}

export interface CodexUpdateEvent {
  issue_id: string;
  event: string;
  timestamp: Date;
  pid: string | null;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  message?: string;
  thread_id?: string;
  turn_id?: string;
  rate_limits?: unknown;
}

// ---------------------------------------------------------------------------
// Workflow validation error types (section 5.5)
// ---------------------------------------------------------------------------

export type WorkflowErrorCode =
  | 'missing_workflow_file'
  | 'workflow_parse_error'
  | 'workflow_front_matter_not_a_map'
  | 'template_parse_error'
  | 'template_render_error';

export interface WorkflowError {
  code: WorkflowErrorCode;
  message: string;
}

// ---------------------------------------------------------------------------
// Dispatch preflight validation errors (section 6.3)
// ---------------------------------------------------------------------------

export type ValidationErrorCode =
  | 'missing_workflow_file'
  | 'workflow_parse_error'
  | 'unsupported_tracker_kind'
  | 'missing_tracker_api_key'
  | 'missing_tracker_project_slug'
  | 'missing_codex_command';

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
}
