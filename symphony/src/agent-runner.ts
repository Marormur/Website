/**
 * Symphony — Agent Runner / Codex App-Server Client (section 10).
 *
 * Implements the JSON-RPC-over-stdio protocol to communicate with the Codex
 * app-server subprocess.
 *
 * Startup sequence (section 10.2):
 *   initialize → initialized (notification) → thread/start → turn/start
 *
 * Turn processing (section 10.3):
 *   Read line-delimited JSON from stdout until turn completes/fails/cancels.
 *   Stderr is diagnostic only — never parsed as protocol.
 *
 * Approval / tool call policy (section 10.5 — high-trust default):
 *   - Auto-approve command and file-change approvals.
 *   - Hard-fail on user-input-required events.
 *   - Return tool-failure for unsupported dynamic tool calls.
 */

import * as child_process from 'child_process';
import * as readline from 'readline';
import type { Issue, CodexConfig } from './types.js';
import { logger } from './logger.js';

// ---------------------------------------------------------------------------
// Protocol types
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  id: number;
  method: string;
  params: unknown;
}

interface JsonRpcNotification {
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

type OutboundMessage = JsonRpcRequest | JsonRpcNotification;

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

export interface AgentSessionHandle {
  thread_id: string;
  proc: child_process.ChildProcess;
  send: (msg: OutboundMessage) => void;
  nextId: () => number;
}

// ---------------------------------------------------------------------------
// Event types emitted to the orchestrator callback
// ---------------------------------------------------------------------------

export type AgentEventKind =
  | 'session_started'
  | 'startup_failed'
  | 'turn_completed'
  | 'turn_failed'
  | 'turn_cancelled'
  | 'turn_ended_with_error'
  | 'turn_input_required'
  | 'approval_auto_approved'
  | 'unsupported_tool_call'
  | 'notification'
  | 'other_message'
  | 'malformed';

export interface AgentEvent {
  event: AgentEventKind;
  timestamp: Date;
  codex_app_server_pid: string | null;
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  message?: string;
  thread_id?: string;
  turn_id?: string;
  rate_limits?: unknown;
  raw?: unknown;
}

export type AgentEventCallback = (evt: AgentEvent) => void;

// ---------------------------------------------------------------------------
// Turn result
// ---------------------------------------------------------------------------

export type TurnResult =
  | { ok: true }
  | { ok: false; reason: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEmit(pid: string | null): (kind: AgentEventKind, extra?: Partial<AgentEvent>) => AgentEvent {
  return (kind, extra = {}) => ({
    event: kind,
    timestamp: new Date(),
    codex_app_server_pid: pid,
    ...extra,
  });
}

/** Wait for the next RPC response with the given id, timing out after ms. */
function waitForResponse(
  responses: Map<number, (res: JsonRpcResponse) => void>,
  id: number,
  timeoutMs: number,
): Promise<JsonRpcResponse> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      responses.delete(id);
      reject(new Error(`response_timeout waiting for id=${id} after ${timeoutMs}ms`));
    }, timeoutMs);

    responses.set(id, (res) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}

// ---------------------------------------------------------------------------
// Main agent session runner
// ---------------------------------------------------------------------------

export interface RunAgentSessionOptions {
  issue: Issue;
  attempt: number | null;
  workspacePath: string;
  prompt: string;           // rendered first-turn prompt
  config: CodexConfig;
  onEvent: AgentEventCallback;
  abortSignal: AbortSignal;
  /** Called once the thread_id is known, to get continuation prompts. */
  getContinuationPrompt?: (issue: Issue, turnNumber: number) => Promise<string>;
  maxTurns: number;
}

export interface AgentRunResult {
  ok: boolean;
  error?: string;
  runtime_seconds: number;
  token_delta: { input: number; output: number; total: number };
}

/**
 * Run a full agent session:
 *   - Launch codex subprocess
 *   - Handshake (initialize / thread/start)
 *   - Execute turns in a loop until issue state changes or max_turns reached
 *   - Return aggregate result to orchestrator
 */
export async function runAgentSession(opts: RunAgentSessionOptions): Promise<AgentRunResult> {
  const startTime = Date.now();
  const { issue, workspacePath, config, onEvent, abortSignal, maxTurns } = opts;
  let prompt = opts.prompt;

  const tokenDelta = { input: 0, output: 0, total: 0 };

  // Track last reported thread totals to compute deltas (spec 13.5)
  let lastReportedInput = 0;
  let lastReportedOutput = 0;
  let lastReportedTotal = 0;

  const fail = (reason: string): AgentRunResult => ({
    ok: false,
    error: reason,
    runtime_seconds: (Date.now() - startTime) / 1000,
    token_delta: tokenDelta,
  });

  // ---------------------------------------------------------------------------
  // 1. Launch subprocess (section 10.1)
  // ---------------------------------------------------------------------------

  if (abortSignal.aborted) return fail('canceled_before_start');

  logger.info('agent: launching codex subprocess', {
    issue_id: issue.id,
    issue_identifier: issue.identifier,
    workspace: workspacePath,
    command: config.command,
  });

  let proc: child_process.ChildProcess;
  try {
    proc = child_process.spawn('bash', ['-lc', config.command], {
      cwd: workspacePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });
  } catch (err) {
    return fail(`codex_not_found: ${String(err)}`);
  }

  const pid = proc.pid != null ? String(proc.pid) : null;
  const emit = makeEmit(pid);

  // Pending response waiters: id → resolver
  const pendingResponses = new Map<number, (res: JsonRpcResponse) => void>();
  let idCounter = 1;
  const nextId = () => idCounter++;

  // Queue of pending inbound messages for the turn loop
  type InboundMsg =
    | { type: 'response'; msg: JsonRpcResponse }
    | { type: 'notification'; msg: Record<string, unknown> }
    | { type: 'exit'; code: number | null };
  const inboundQueue: Array<{ resolve: (v: InboundMsg) => void }> = [];
  const inboundBuffer: InboundMsg[] = [];

  function enqueue(item: InboundMsg) {
    if (inboundQueue.length > 0) {
      const waiter = inboundQueue.shift()!;
      waiter.resolve(item);
    } else {
      inboundBuffer.push(item);
    }
  }

  function nextMessage(): Promise<InboundMsg> {
    if (inboundBuffer.length > 0) return Promise.resolve(inboundBuffer.shift()!);
    return new Promise((resolve) => inboundQueue.push({ resolve }));
  }

  // ---------------------------------------------------------------------------
  // 2. Wire up stdout line reader
  // ---------------------------------------------------------------------------

  const rl = readline.createInterface({
    input: proc.stdout!,
    crlfDelay: Infinity,
    // Max line size 10 MB per spec 10.1
  });

  rl.on('line', (line) => {
    if (!line.trim()) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      onEvent(emit('malformed', { message: `Non-JSON line from codex stdout: ${line.slice(0, 200)}` }));
      return;
    }

    const msg = parsed as Record<string, unknown>;

    // If it has an `id` and `result`/`error` field it is a response
    if ('id' in msg && ('result' in msg || 'error' in msg)) {
      const resp = msg as unknown as JsonRpcResponse;
      // Resolve pending response waiter if any
      const waiter = pendingResponses.get(resp.id);
      if (waiter) {
        pendingResponses.delete(resp.id);
        waiter(resp);
      }
      enqueue({ type: 'response', msg: resp });
      return;
    }

    // Otherwise treat as notification
    enqueue({ type: 'notification', msg });
  });

  proc.stderr?.on('data', (d: Buffer) => {
    logger.debug('agent: codex stderr', {
      issue_identifier: issue.identifier,
      data: d.toString().slice(0, 256),
    });
  });

  proc.on('close', (code) => {
    rl.close();
    enqueue({ type: 'exit', code });
  });

  // Abort handler — kill subprocess when orchestrator cancels
  const abortHandler = () => {
    proc.kill('SIGTERM');
    setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch { /* already dead */ }
    }, 2_000);
  };
  abortSignal.addEventListener('abort', abortHandler, { once: true });

  const send = (msg: OutboundMessage) => {
    const line = JSON.stringify(msg) + '\n';
    proc.stdin?.write(line);
  };

  // ---------------------------------------------------------------------------
  // 3. Startup handshake (section 10.2)
  // ---------------------------------------------------------------------------

  // initialize
  const initId = nextId();
  send({ id: initId, method: 'initialize', params: { clientInfo: { name: 'symphony', version: '1.0' }, capabilities: {} } });

  let initResp: JsonRpcResponse;
  try {
    initResp = await Promise.race([
      waitForResponse(pendingResponses, initId, config.read_timeout_ms),
      new Promise<JsonRpcResponse>((_, rej) =>
        abortSignal.addEventListener('abort', () => rej(new Error('canceled')), { once: true }),
      ),
    ]);
  } catch (err) {
    proc.kill('SIGTERM');
    abortSignal.removeEventListener('abort', abortHandler);
    onEvent(emit('startup_failed', { message: `initialize response error: ${String(err)}` }));
    return fail(`response_timeout: ${String(err)}`);
  }

  if (initResp.error) {
    proc.kill('SIGTERM');
    abortSignal.removeEventListener('abort', abortHandler);
    onEvent(emit('startup_failed', { message: `initialize error: ${initResp.error.message}` }));
    return fail(`response_error: initialize failed: ${initResp.error.message}`);
  }

  // initialized notification
  send({ method: 'initialized', params: {} });

  // thread/start
  const threadId2 = nextId();
  const threadStartParams: Record<string, unknown> = {
    cwd: workspacePath,
  };
  if (config.approval_policy) threadStartParams['approvalPolicy'] = config.approval_policy;
  if (config.thread_sandbox) threadStartParams['sandbox'] = config.thread_sandbox;

  send({ id: threadId2, method: 'thread/start', params: threadStartParams });

  let threadResp: JsonRpcResponse;
  try {
    threadResp = await Promise.race([
      waitForResponse(pendingResponses, threadId2, config.read_timeout_ms),
      new Promise<JsonRpcResponse>((_, rej) =>
        abortSignal.addEventListener('abort', () => rej(new Error('canceled')), { once: true }),
      ),
    ]);
  } catch (err) {
    proc.kill('SIGTERM');
    abortSignal.removeEventListener('abort', abortHandler);
    return fail(`response_timeout: thread/start: ${String(err)}`);
  }

  if (threadResp.error) {
    proc.kill('SIGTERM');
    abortSignal.removeEventListener('abort', abortHandler);
    return fail(`response_error: thread/start: ${threadResp.error.message}`);
  }

  const threadResult = threadResp.result as Record<string, unknown> | undefined;
  const thread = threadResult?.['thread'] as Record<string, unknown> | undefined;
  const threadId: string = (thread?.['id'] as string | undefined) ?? `thread-${Date.now()}`;

  onEvent(emit('session_started', { thread_id: threadId }));

  // ---------------------------------------------------------------------------
  // 4. Turn loop (section 10.3 + spec 7.1)
  // ---------------------------------------------------------------------------

  let turnNumber = 0;
  let sessionRunning = true;
  let lastTurnId: string | null = null;

  while (sessionRunning && !abortSignal.aborted) {
    turnNumber++;

    // Use rendered prompt for first turn; continuation guidance for subsequent turns
    if (turnNumber > 1 && opts.getContinuationPrompt) {
      try {
        prompt = await opts.getContinuationPrompt(issue, turnNumber);
      } catch {
        prompt = 'Please continue working on the issue.';
      }
    }

    // turn/start
    const turnId2 = nextId();
    const turnStartParams: Record<string, unknown> = {
      threadId,
      input: [{ type: 'text', text: prompt }],
      cwd: workspacePath,
      title: `${issue.identifier}: ${issue.title}`,
    };
    if (config.approval_policy) turnStartParams['approvalPolicy'] = config.approval_policy;
    if (config.turn_sandbox_policy) {
      turnStartParams['sandboxPolicy'] = { type: config.turn_sandbox_policy };
    }

    send({ id: turnId2, method: 'turn/start', params: turnStartParams });

    let turnStartResp: JsonRpcResponse;
    try {
      turnStartResp = await Promise.race([
        waitForResponse(pendingResponses, turnId2, config.read_timeout_ms),
        new Promise<JsonRpcResponse>((_, rej) =>
          abortSignal.addEventListener('abort', () => rej(new Error('canceled')), { once: true }),
        ),
      ]);
    } catch (err) {
      sessionRunning = false;
      proc.kill('SIGTERM');
      abortSignal.removeEventListener('abort', abortHandler);
      return fail(`response_timeout: turn/start: ${String(err)}`);
    }

    if (turnStartResp.error) {
      sessionRunning = false;
      proc.kill('SIGTERM');
      abortSignal.removeEventListener('abort', abortHandler);
      return fail(`response_error: turn/start: ${turnStartResp.error.message}`);
    }

    const turnResult2 = turnStartResp.result as Record<string, unknown> | undefined;
    const turnObj = turnResult2?.['turn'] as Record<string, unknown> | undefined;
    const turnId: string = (turnObj?.['id'] as string | undefined) ?? `turn-${turnNumber}`;
    lastTurnId = turnId;

    onEvent(emit('session_started', {
      thread_id: threadId,
      turn_id: turnId,
      message: `turn ${turnNumber} started`,
    }));

    // Stream turn until it completes
    const turnTimeout = config.turn_timeout_ms;
    const turnStart = Date.now();
    let turnDone = false;
    let turnOk = true;
    let turnFailReason = '';

    while (!turnDone && !abortSignal.aborted) {
      if (Date.now() - turnStart > turnTimeout) {
        turnOk = false;
        turnFailReason = 'turn_timeout';
        turnDone = true;
        break;
      }

      let inbound: InboundMsg;
      try {
        // Poll with 500ms timeout so we can check for global abort / stall
        inbound = await Promise.race([
          nextMessage(),
          new Promise<InboundMsg>((resolve) =>
            setTimeout(() => resolve({ type: 'exit', code: null }), 500),
          ),
        ]);
      } catch {
        break;
      }

      if (inbound.type === 'exit') {
        // Subprocess exited — treat as turn failure (unless already done)
        if (!turnDone) {
          turnOk = false;
          turnFailReason = 'subprocess_exit';
          turnDone = true;
        }
        sessionRunning = false;
        break;
      }

      const msg = inbound.type === 'response'
        ? inbound.msg as unknown as Record<string, unknown>
        : inbound.msg as Record<string, unknown>;

      const method = msg['method'] as string | undefined;

      // ---------------------------------------------------------------------------
      // Handle approval requests (high-trust: auto-approve, spec 10.5)
      // ---------------------------------------------------------------------------
      if (method === 'approval/request' || method === 'item/approval/request') {
        const approvalId = (msg['id'] ?? (msg['params'] as Record<string, unknown>)?.['id']) as
          | number
          | string
          | undefined;
        if (approvalId !== undefined) {
          send({ id: Number(approvalId), result: { approved: true } } as unknown as JsonRpcRequest);
          onEvent(emit('approval_auto_approved', { message: `auto-approved: ${method}` }));
        }
        continue;
      }

      // Hard-fail on user input required (spec 10.5)
      if (method === 'item/tool/requestUserInput' || method === 'turn/inputRequired') {
        onEvent(emit('turn_input_required', { message: 'user input required — failing run' }));
        turnOk = false;
        turnFailReason = 'turn_input_required';
        turnDone = true;
        break;
      }

      // Handle unsupported tool calls (spec 10.5)
      if (method === 'item/tool/call') {
        const params = msg['params'] as Record<string, unknown> | undefined;
        const toolCallId = params?.['id'] ?? msg['id'];
        const toolName = params?.['name'] as string | undefined;

        // Handle the optional linear_graphql tool (spec 10.5)
        if (toolName === 'linear_graphql') {
          // This would normally invoke the LinearClient — just return failure for now
          // since this is the agent runner layer (orchestrator passes the client in)
          send({
            id: toolCallId,
            result: { success: false, error: 'linear_graphql tool not configured in this session' },
          } as unknown as JsonRpcRequest);
          continue;
        }

        onEvent(emit('unsupported_tool_call', { message: `unsupported tool: ${toolName ?? 'unknown'}` }));
        send({
          id: toolCallId,
          result: { success: false, error: 'unsupported_tool_call' },
        } as unknown as JsonRpcRequest);
        continue;
      }

      // Turn completion
      if (method === 'turn/completed') {
        onEvent(emit('turn_completed', { thread_id: threadId, turn_id: turnId }));
        turnDone = true;
        break;
      }

      if (method === 'turn/failed') {
        const params = msg['params'] as Record<string, unknown> | undefined;
        onEvent(emit('turn_failed', { message: String(params?.['reason'] ?? '') }));
        turnOk = false;
        turnFailReason = 'turn_failed';
        turnDone = true;
        break;
      }

      if (method === 'turn/cancelled') {
        onEvent(emit('turn_cancelled', { message: 'turn cancelled' }));
        turnOk = false;
        turnFailReason = 'turn_cancelled';
        turnDone = true;
        break;
      }

      // Token / rate-limit events (spec 13.5)
      if (method === 'thread/tokenUsage/updated') {
        const params = msg['params'] as Record<string, unknown> | undefined;
        const usage = params?.['usage'] as Record<string, unknown> | undefined;
        if (usage) {
          const newInput = (usage['inputTokens'] ?? usage['input_tokens'] ?? 0) as number;
          const newOutput = (usage['outputTokens'] ?? usage['output_tokens'] ?? 0) as number;
          const newTotal = (usage['totalTokens'] ?? usage['total_tokens'] ?? 0) as number;
          // Compute delta relative to last reported (spec 13.5 — avoid double-counting)
          tokenDelta.input += Math.max(0, newInput - lastReportedInput);
          tokenDelta.output += Math.max(0, newOutput - lastReportedOutput);
          tokenDelta.total += Math.max(0, newTotal - lastReportedTotal);
          lastReportedInput = newInput;
          lastReportedOutput = newOutput;
          lastReportedTotal = newTotal;
          onEvent(emit('other_message', { usage: { input_tokens: newInput, output_tokens: newOutput, total_tokens: newTotal } }));
        }
        continue;
      }

      // Notifications / messages
      if (method === 'notification' || method === 'message' || method?.startsWith('item/')) {
        const params = msg['params'] as Record<string, unknown> | undefined;
        const text = params?.['text'] ?? params?.['content'] ?? '';
        onEvent(emit('notification', { message: String(text).slice(0, 500), thread_id: threadId, turn_id: turnId }));
        continue;
      }

      // Everything else is an unknown message
      onEvent(emit('other_message', { raw: msg }));
    }

    if (!turnOk) {
      // Turn failed/cancelled/timed out → fail the session
      proc.kill('SIGTERM');
      abortSignal.removeEventListener('abort', abortHandler);
      onEvent(emit('turn_ended_with_error', { message: turnFailReason }));
      return fail(turnFailReason);
    }

    // Check if we should continue (more turns possible and issue still active)
    if (turnNumber >= maxTurns) break;

    // Continuation is controlled by the orchestrator via the worker loop
    // (the worker checks tracker state after each turn and breaks if not active)
    sessionRunning = false; // signal normal completion; worker loop handles continuation
  }

  // ---------------------------------------------------------------------------
  // 5. Shutdown the subprocess
  // ---------------------------------------------------------------------------
  abortSignal.removeEventListener('abort', abortHandler);

  // Send a graceful terminate — give codex 5s to exit
  proc.stdin?.end();
  await new Promise<void>((resolve) => {
    const t = setTimeout(() => { proc.kill('SIGTERM'); resolve(); }, 5_000);
    proc.on('close', () => { clearTimeout(t); resolve(); });
  });

  return {
    ok: true,
    runtime_seconds: (Date.now() - startTime) / 1000,
    token_delta: tokenDelta,
  };
}
