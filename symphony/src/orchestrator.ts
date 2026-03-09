/**
 * Symphony — Orchestrator (sections 7, 8, 16).
 *
 * Owns all mutable scheduling state.  Every state mutation passes through
 * this class to avoid duplicate dispatch and race conditions.
 *
 * Responsibilities:
 *  - Poll loop with configurable interval
 *  - Candidate issue selection and dispatch
 *  - Per-issue concurrency enforcement (global + per-state)
 *  - Active-run reconciliation (stall detection + tracker-state refresh)
 *  - Retry scheduling with exponential back-off
 *  - Worker lifecycle (spawn → monitor → exit handling)
 *  - Config hot-reload (applied on each tick / retry)
 */

import type {
  Issue,
  OrchestratorState,
  RunningEntry,
  RetryEntry,
  CodexTotals,
  CodexUpdateEvent,
  WorkerExitEvent,
  WorkerExitReason,
  ServiceConfig,
  WorkflowDefinition,
} from './types.js';
import { logger } from './logger.js';
import { buildConfig, isActiveState, isTerminalState, normaliseState } from './config.js';
import { LinearClient } from './linear-client.js';
import { createWorkspace, removeWorkspace, runHook } from './workspace.js';
import { buildPrompt } from './prompt-builder.js';
import { runAgentSession } from './agent-runner.js';

// ---------------------------------------------------------------------------
// Dispatch sorting (spec 8.2)
// ---------------------------------------------------------------------------

function sortForDispatch(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => {
    // 1. priority ascending (null sorts last)
    const pa = a.priority ?? Number.MAX_SAFE_INTEGER;
    const pb = b.priority ?? Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    // 2. oldest first
    const ta = a.created_at?.getTime() ?? 0;
    const tb = b.created_at?.getTime() ?? 0;
    if (ta !== tb) return ta - tb;
    // 3. lexicographic tie-breaker
    return a.identifier.localeCompare(b.identifier);
  });
}

// ---------------------------------------------------------------------------
// Concurrency helpers (spec 8.3)
// ---------------------------------------------------------------------------

function availableSlots(state: OrchestratorState): number {
  return Math.max(state.max_concurrent_agents - state.running.size, 0);
}

function perStateSlots(state: OrchestratorState, issue: Issue, config: ServiceConfig): number {
  const norm = normaliseState(issue.state);
  const perStateLimit = config.agent.max_concurrent_agents_by_state[norm];
  if (perStateLimit !== undefined) {
    // Count running issues with the same state
    let count = 0;
    for (const entry of state.running.values()) {
      if (normaliseState(entry.issue.state) === norm) count++;
    }
    return Math.max(perStateLimit - count, 0);
  }
  // Fall through to global limit
  return availableSlots(state);
}

// ---------------------------------------------------------------------------
// Blocker check (spec 8.2)
// ---------------------------------------------------------------------------

function hasActiveBlockers(issue: Issue, config: ServiceConfig): boolean {
  if (normaliseState(issue.state) !== normaliseState('Todo')) return false;
  for (const blocker of issue.blocked_by) {
    if (!blocker.state) continue;
    if (!isTerminalState(blocker.state, config)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Candidate eligibility (spec 8.2)
// ---------------------------------------------------------------------------

function isEligible(issue: Issue, state: OrchestratorState, config: ServiceConfig): boolean {
  if (!issue.id || !issue.identifier || !issue.title || !issue.state) return false;
  if (!isActiveState(issue.state, config)) return false;
  if (isTerminalState(issue.state, config)) return false;
  if (state.running.has(issue.id)) return false;
  if (state.claimed.has(issue.id)) return false;
  if (availableSlots(state) === 0) return false;
  if (perStateSlots(state, issue, config) === 0) return false;
  if (hasActiveBlockers(issue, config)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Backoff formula (spec 8.4)
// ---------------------------------------------------------------------------

const CONTINUATION_DELAY_MS = 1_000;

function retryDelayMs(attempt: number, config: ServiceConfig, isContinuation: boolean): number {
  if (isContinuation) return CONTINUATION_DELAY_MS;
  const delay = 10_000 * Math.pow(2, attempt - 1);
  return Math.min(delay, config.agent.max_retry_backoff_ms);
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export type OrchestratorObserver = (state: OrchestratorState) => void;

export class Orchestrator {
  private state: OrchestratorState;
  private config!: ServiceConfig;
  private workflow!: WorkflowDefinition;
  private tickTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly observers: OrchestratorObserver[] = [];
  private workflowFilePath: string | undefined;
  private isShuttingDown = false;

  constructor(workflow: WorkflowDefinition, workflowFilePath?: string) {
    this.workflow = workflow;
    this.config = buildConfig(workflow);
    this.workflowFilePath = workflowFilePath;

    this.state = {
      poll_interval_ms: this.config.polling.interval_ms,
      max_concurrent_agents: this.config.agent.max_concurrent_agents,
      running: new Map(),
      claimed: new Set(),
      retry_attempts: new Map(),
      completed: new Set(),
      codex_totals: { input_tokens: 0, output_tokens: 0, total_tokens: 0, seconds_running: 0 },
      codex_rate_limits: null,
    };
  }

  /** Add an observer that is notified after every state mutation. */
  addObserver(fn: OrchestratorObserver): void {
    this.observers.push(fn);
  }

  private notify(): void {
    for (const obs of this.observers) {
      try { obs(this.state); } catch { /* observer errors must not crash orchestrator */ }
    }
  }

  // ---------------------------------------------------------------------------
  // Workflow reload (section 6.2)
  // ---------------------------------------------------------------------------

  /** Called when WORKFLOW.md changes. Applies new config to future ticks. */
  reloadWorkflow(wf: WorkflowDefinition): void {
    this.workflow = wf;
    this.config = buildConfig(wf);
    this.state.poll_interval_ms = this.config.polling.interval_ms;
    this.state.max_concurrent_agents = this.config.agent.max_concurrent_agents;
    logger.info('orchestrator: workflow reloaded and config re-applied');
    this.notify();
  }

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------

  async start(): Promise<void> {
    logger.info('orchestrator: starting');
    await this.startupTerminalCleanup();
    this.scheduleTick(0);
  }

  stop(): void {
    this.isShuttingDown = true;
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
    // Cancel all running workers
    for (const [issueId, entry] of this.state.running) {
      logger.info('orchestrator: canceling running worker on shutdown', { issue_id: issueId });
      entry.worker_abort.abort();
    }
  }

  // ---------------------------------------------------------------------------
  // Startup cleanup (spec 8.6)
  // ---------------------------------------------------------------------------

  private async startupTerminalCleanup(): Promise<void> {
    logger.info('orchestrator: startup terminal workspace cleanup');
    const client = new LinearClient(this.config.tracker);
    const result = await client.fetchIssuesByStates(this.config.tracker.terminal_states);
    if ('error' in result) {
      logger.warn('orchestrator: startup cleanup failed — could not fetch terminal issues', {
        error: result.error,
      });
      return;
    }
    for (const issue of result.issues) {
      await removeWorkspace(this.config.workspace.root, issue.identifier, this.config.hooks);
    }
  }

  // ---------------------------------------------------------------------------
  // Poll tick (spec 8.1, 16.2)
  // ---------------------------------------------------------------------------

  private scheduleTick(delayMs: number): void {
    if (this.isShuttingDown) return;
    this.tickTimer = setTimeout(() => void this.onTick(), delayMs);
  }

  private async onTick(): Promise<void> {
    if (this.isShuttingDown) return;

    // 1. Reconcile active runs
    await this.reconcileRunning();

    // 2. Preflight validation
    const { validateConfig } = await import('./config.js');
    const validationErr = validateConfig(this.config);
    if (validationErr) {
      logger.error('orchestrator: config validation failed — skipping dispatch', {
        code: validationErr.code,
        message: validationErr.message,
      });
      this.notify();
      this.scheduleTick(this.state.poll_interval_ms);
      return;
    }

    // 3. Fetch candidate issues
    const client = new LinearClient(this.config.tracker);
    const candidatesResult = await client.fetchCandidateIssues();
    if ('error' in candidatesResult) {
      logger.error('orchestrator: candidate fetch failed — skipping dispatch', {
        error: candidatesResult.error,
      });
      this.notify();
      this.scheduleTick(this.state.poll_interval_ms);
      return;
    }

    const sorted = sortForDispatch(candidatesResult.issues);

    // 4. Dispatch eligible issues
    for (const issue of sorted) {
      if (availableSlots(this.state) === 0) break;
      if (!isEligible(issue, this.state, this.config)) continue;
      this.dispatchIssue(issue, null);
    }

    this.notify();
    this.scheduleTick(this.state.poll_interval_ms);
  }

  // ---------------------------------------------------------------------------
  // Reconciliation (spec 8.5)
  // ---------------------------------------------------------------------------

  private async reconcileRunning(): Promise<void> {
    // Part A: Stall detection
    if (this.config.codex.stall_timeout_ms > 0) {
      const now = Date.now();
      for (const [issueId, entry] of this.state.running) {
        const ref = entry.last_codex_timestamp?.getTime() ?? entry.started_at.getTime();
        const elapsedMs = now - ref;
        if (elapsedMs > this.config.codex.stall_timeout_ms) {
          logger.warn('orchestrator: stall detected — terminating worker', {
            issue_id: issueId,
            issue_identifier: entry.identifier,
            elapsed_ms: elapsedMs,
          });
          entry.worker_abort.abort();
          // Worker exit handler will schedule retry
        }
      }
    }

    // Part B: Tracker state refresh
    const runningIds = [...this.state.running.keys()];
    if (runningIds.length === 0) return;

    const client = new LinearClient(this.config.tracker);
    const refreshResult = await client.fetchIssueStatesByIds(runningIds);
    if ('error' in refreshResult) {
      logger.warn('orchestrator: state refresh failed — keeping workers running', {
        error: refreshResult.error,
      });
      return;
    }

    for (const issue of refreshResult.issues) {
      if (!this.state.running.has(issue.id)) continue;

      if (isTerminalState(issue.state, this.config)) {
        logger.info('orchestrator: issue reached terminal state — stopping worker', {
          issue_id: issue.id,
          issue_identifier: issue.identifier,
          state: issue.state,
        });
        this.terminateRunningIssue(issue.id, true);
      } else if (isActiveState(issue.state, this.config)) {
        // Update snapshot
        const entry = this.state.running.get(issue.id)!;
        entry.issue = issue;
      } else {
        // Not active, not terminal — stop without cleanup
        logger.info('orchestrator: issue left active states — stopping worker', {
          issue_id: issue.id,
          issue_identifier: issue.identifier,
          state: issue.state,
        });
        this.terminateRunningIssue(issue.id, false);
      }
    }
  }

  private terminateRunningIssue(issueId: string, cleanWorkspace: boolean): void {
    const entry = this.state.running.get(issueId);
    if (!entry) return;
    entry.worker_abort.abort();
    if (cleanWorkspace) {
      void removeWorkspace(this.config.workspace.root, entry.identifier, this.config.hooks);
    }
  }

  // ---------------------------------------------------------------------------
  // Dispatch (spec 16.4)
  // ---------------------------------------------------------------------------

  private dispatchIssue(issue: Issue, attempt: number | null): void {
    const abort = new AbortController();

    const entry: RunningEntry = {
      worker_abort: abort,
      identifier: issue.identifier,
      issue,
      retry_attempt: attempt,
      started_at: new Date(),
      session_id: null,
      thread_id: null,
      turn_id: null,
      codex_app_server_pid: null,
      last_codex_event: null,
      last_codex_timestamp: null,
      last_codex_message: '',
      codex_input_tokens: 0,
      codex_output_tokens: 0,
      codex_total_tokens: 0,
      last_reported_input_tokens: 0,
      last_reported_output_tokens: 0,
      last_reported_total_tokens: 0,
      turn_count: 0,
    };

    this.state.running.set(issue.id, entry);
    this.state.claimed.add(issue.id);
    // Remove any pending retry since we're dispatching now
    const existingRetry = this.state.retry_attempts.get(issue.id);
    if (existingRetry) {
      clearTimeout(existingRetry.timer_handle);
      this.state.retry_attempts.delete(issue.id);
    }

    logger.info('orchestrator: dispatching issue', {
      issue_id: issue.id,
      issue_identifier: issue.identifier,
      attempt: attempt ?? 'first',
    });

    // Capture config snapshot for this worker run
    const runConfig = this.config;
    const runWorkflow = this.workflow;

    // Run the worker in background
    void this.runWorker(issue, attempt, abort.signal, runConfig, runWorkflow);
  }

  // ---------------------------------------------------------------------------
  // Worker (spec 16.5)
  // ---------------------------------------------------------------------------

  private async runWorker(
    issue: Issue,
    attempt: number | null,
    abortSignal: AbortSignal,
    config: ServiceConfig,
    workflow: WorkflowDefinition,
  ): Promise<void> {
    const startTime = Date.now();

    const onWorkerExit = (
      reason: WorkerExitReason,
      runtimeSeconds: number,
      error?: string,
      tokenDelta?: { input: number; output: number; total: number },
    ) => {
      this.handleWorkerExit({
        issue_id: issue.id,
        reason,
        error,
        runtime_seconds: runtimeSeconds,
        token_delta: tokenDelta,
      });
    };

    // 1. Create / reuse workspace
    const wsResult = await createWorkspace({
      workspaceRoot: config.workspace.root,
      identifier: issue.identifier,
      hooks: config.hooks,
    });

    if (!wsResult.ok) {
      logger.error('orchestrator: workspace creation failed', {
        issue_id: issue.id,
        issue_identifier: issue.identifier,
        error: wsResult.error,
      });
      onWorkerExit('error', (Date.now() - startTime) / 1000, wsResult.error);
      return;
    }

    const workspace = wsResult.workspace;

    // 2. before_run hook
    if (config.hooks.before_run) {
      const hookResult = await runHook(
        config.hooks.before_run,
        workspace.path,
        config.hooks.timeout_ms,
        'before_run',
      );
      if (!hookResult.ok) {
        logger.error('orchestrator: before_run hook failed', {
          issue_id: issue.id,
          error: hookResult.error,
        });
        await this.runAfterRunHook(config, workspace.path);
        onWorkerExit('error', (Date.now() - startTime) / 1000, hookResult.error);
        return;
      }
    }

    // 3. Build first-turn prompt
    const promptResult = await buildPrompt(workflow, issue, attempt);
    if (!promptResult.ok) {
      logger.error('orchestrator: prompt rendering failed', {
        issue_id: issue.id,
        error: promptResult.message,
      });
      await this.runAfterRunHook(config, workspace.path);
      onWorkerExit('error', (Date.now() - startTime) / 1000, promptResult.message);
      return;
    }

    // 4. Run agent session
    const sessionResult = await runAgentSession({
      issue,
      attempt,
      workspacePath: workspace.path,
      prompt: promptResult.prompt,
      config: config.codex,
      onEvent: (evt) => this.handleCodexEvent(issue.id, evt),
      abortSignal,
      maxTurns: config.agent.max_turns,
      getContinuationPrompt: async (iss, turnNumber) => {
        // Subsequent turns on same thread: send continuation guidance only (spec 7.1)
        const cResult = await buildPrompt(workflow, iss, turnNumber);
        if (!cResult.ok) {
          logger.warn('orchestrator: continuation prompt rendering failed — using fallback', {
            issue_id: iss.id,
            issue_identifier: iss.identifier,
            code: cResult.code,
            error: cResult.message,
          });
        }
        return `(Continuation — turn ${turnNumber})\n\nPlease continue working on the issue.`;
      },
    });

    // 5. after_run hook (best-effort)
    await this.runAfterRunHook(config, workspace.path);

    const reason: WorkerExitReason = abortSignal.aborted
      ? 'cancel'
      : sessionResult.ok
        ? 'normal'
        : 'error';

    onWorkerExit(
      reason,
      sessionResult.runtime_seconds,
      sessionResult.ok ? undefined : sessionResult.error,
      sessionResult.token_delta,
    );
  }

  private async runAfterRunHook(config: ServiceConfig, workspacePath: string): Promise<void> {
    if (!config.hooks.after_run) return;
    const result = await runHook(config.hooks.after_run, workspacePath, config.hooks.timeout_ms, 'after_run');
    if (!result.ok) {
      logger.warn('orchestrator: after_run hook failed (ignored)', { error: result.error });
    }
  }

  // ---------------------------------------------------------------------------
  // Codex event handler
  // ---------------------------------------------------------------------------

  private handleCodexEvent(issueId: string, evt: import('./agent-runner.js').AgentEvent): void {
    const entry = this.state.running.get(issueId);
    if (!entry) return;

    entry.last_codex_event = evt.event;
    entry.last_codex_timestamp = evt.timestamp;
    if (evt.message) entry.last_codex_message = evt.message;
    if (evt.codex_app_server_pid) entry.codex_app_server_pid = evt.codex_app_server_pid;

    if (evt.thread_id) {
      entry.thread_id = evt.thread_id;
      entry.turn_id = evt.turn_id ?? entry.turn_id;
      entry.session_id = entry.thread_id && entry.turn_id
        ? `${entry.thread_id}-${entry.turn_id}`
        : entry.session_id;
    }

    if (evt.event === 'session_started') entry.turn_count++;
    if (evt.rate_limits) this.state.codex_rate_limits = evt.rate_limits;

    this.notify();
  }

  // ---------------------------------------------------------------------------
  // Worker exit handling (spec 16.6)
  // ---------------------------------------------------------------------------

  private handleWorkerExit(evt: WorkerExitEvent): void {
    const entry = this.state.running.get(evt.issue_id);
    if (!entry) return;

    this.state.running.delete(evt.issue_id);

    // Accumulate runtime
    this.state.codex_totals.seconds_running += evt.runtime_seconds;
    if (evt.token_delta) {
      this.state.codex_totals.input_tokens += evt.token_delta.input;
      this.state.codex_totals.output_tokens += evt.token_delta.output;
      this.state.codex_totals.total_tokens += evt.token_delta.total;
    }

    const currentAttempt = entry.retry_attempt ?? 0;

    if (evt.reason === 'normal') {
      this.state.completed.add(evt.issue_id); // bookkeeping only
      logger.info('orchestrator: worker exited normally — scheduling continuation check', {
        issue_id: evt.issue_id,
        issue_identifier: entry.identifier,
      });
      this.scheduleRetry(evt.issue_id, entry.identifier, 1, true, null);
    } else {
      const nextAttempt = currentAttempt + 1;
      logger.warn('orchestrator: worker exited with error — scheduling retry', {
        issue_id: evt.issue_id,
        issue_identifier: entry.identifier,
        reason: evt.reason,
        error: evt.error ?? '',
        next_attempt: nextAttempt,
      });
      this.scheduleRetry(
        evt.issue_id,
        entry.identifier,
        nextAttempt,
        false,
        evt.error ?? `worker exited: ${evt.reason}`,
      );
    }

    this.notify();
  }

  // ---------------------------------------------------------------------------
  // Retry scheduling (spec 8.4)
  // ---------------------------------------------------------------------------

  private scheduleRetry(
    issueId: string,
    identifier: string,
    attempt: number,
    isContinuation: boolean,
    error: string | null,
  ): void {
    // Cancel existing retry timer for this issue
    const existing = this.state.retry_attempts.get(issueId);
    if (existing) {
      clearTimeout(existing.timer_handle);
      this.state.retry_attempts.delete(issueId);
    }

    const delayMs = retryDelayMs(attempt, this.config, isContinuation);
    const dueAtMs = Date.now() + delayMs;

    const handle = setTimeout(() => void this.onRetryTimer(issueId), delayMs);

    const entry: RetryEntry = {
      issue_id: issueId,
      identifier,
      attempt,
      due_at_ms: dueAtMs,
      timer_handle: handle,
      error,
    };

    this.state.retry_attempts.set(issueId, entry);
    this.state.claimed.add(issueId); // keep claimed while retrying

    logger.info('orchestrator: retry scheduled', {
      issue_id: issueId,
      issue_identifier: identifier,
      attempt,
      delay_ms: delayMs,
    });
  }

  // ---------------------------------------------------------------------------
  // Retry handler (spec 16.6 on_retry_timer)
  // ---------------------------------------------------------------------------

  private async onRetryTimer(issueId: string): Promise<void> {
    const retryEntry = this.state.retry_attempts.get(issueId);
    if (!retryEntry) return;
    this.state.retry_attempts.delete(issueId);

    const client = new LinearClient(this.config.tracker);
    const candidatesResult = await client.fetchCandidateIssues();

    if ('error' in candidatesResult) {
      logger.warn('orchestrator: retry poll failed — re-queuing', {
        issue_id: issueId,
        issue_identifier: retryEntry.identifier,
        error: candidatesResult.error,
      });
      this.scheduleRetry(
        issueId,
        retryEntry.identifier,
        retryEntry.attempt + 1,
        false,
        'retry poll failed',
      );
      return;
    }

    const issue = candidatesResult.issues.find((i) => i.id === issueId);
    if (!issue) {
      // Issue no longer active / found — release claim
      this.state.claimed.delete(issueId);
      logger.info('orchestrator: issue not found in candidates — releasing claim', {
        issue_id: issueId,
        issue_identifier: retryEntry.identifier,
      });
      return;
    }

    if (!isActiveState(issue.state, this.config)) {
      this.state.claimed.delete(issueId);
      logger.info('orchestrator: issue no longer active — releasing claim', {
        issue_id: issueId,
        issue_identifier: issue.identifier,
      });
      return;
    }

    if (availableSlots(this.state) === 0) {
      logger.info('orchestrator: no slots available — re-queuing', {
        issue_id: issueId,
        issue_identifier: issue.identifier,
      });
      this.scheduleRetry(
        issueId,
        issue.identifier,
        retryEntry.attempt + 1,
        false,
        'no available orchestrator slots',
      );
      return;
    }

    // Dispatch
    this.dispatchIssue(issue, retryEntry.attempt);
    this.notify();
  }

  // ---------------------------------------------------------------------------
  // Public observability accessors
  // ---------------------------------------------------------------------------

  getState(): Readonly<OrchestratorState> {
    return this.state;
  }

  getConfig(): Readonly<ServiceConfig> {
    return this.config;
  }

  /** Trigger an immediate poll cycle (for /api/v1/refresh). */
  triggerRefresh(): void {
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
    this.scheduleTick(0);
  }
}
