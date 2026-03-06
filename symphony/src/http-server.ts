/**
 * Symphony — Optional HTTP Server extension (section 13.7).
 *
 * Enabled when `server.port` is set in WORKFLOW.md front matter or a
 * `--port` CLI argument is provided.
 *
 * Endpoints:
 *   GET  /                        — human-readable HTML dashboard
 *   GET  /api/v1/state            — JSON runtime summary
 *   GET  /api/v1/<identifier>     — per-issue debug detail
 *   POST /api/v1/refresh          — trigger immediate poll cycle
 */

import * as http from 'http';
import type { OrchestratorState } from './types.js';
import { logger } from './logger.js';

export type RefreshTrigger = () => void;

export interface HttpServerOptions {
  port: number;
  getState: () => Readonly<OrchestratorState>;
  triggerRefresh: RefreshTrigger;
}

// ---------------------------------------------------------------------------
// Dashboard HTML template
// ---------------------------------------------------------------------------

function buildDashboard(state: Readonly<OrchestratorState>): string {
  const now = new Date().toISOString();
  const running = [...state.running.values()];
  const retrying = [...state.retry_attempts.values()];
  const totals = state.codex_totals;

  const runningRows = running
    .map(
      (e) => `
      <tr>
        <td>${e.identifier}</td>
        <td>${e.issue.state}</td>
        <td>${e.session_id ?? '—'}</td>
        <td>${e.turn_count}</td>
        <td>${e.last_codex_event ?? '—'}</td>
        <td>${e.last_codex_message ? e.last_codex_message.slice(0, 80) : '—'}</td>
        <td>${e.started_at.toISOString()}</td>
        <td>${e.last_codex_timestamp?.toISOString() ?? '—'}</td>
        <td>${e.codex_total_tokens}</td>
      </tr>`,
    )
    .join('');

  const retryRows = retrying
    .map(
      (r) => `
      <tr>
        <td>${r.identifier}</td>
        <td>${r.attempt}</td>
        <td>${new Date(r.due_at_ms).toISOString()}</td>
        <td>${r.error ?? '—'}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Symphony Dashboard</title>
  <meta http-equiv="refresh" content="30">
  <style>
    body { font-family: monospace; background: #111; color: #eee; padding: 1rem; }
    h1, h2 { color: #7cf; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
    th, td { border: 1px solid #444; padding: .4rem .6rem; text-align: left; }
    th { background: #222; }
    .meta { color: #999; font-size: .85em; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <h1>Symphony Dashboard</h1>
  <p class="meta">Generated at ${now} &bull; Auto-refreshes every 30 s</p>

  <h2>Running (${running.length} / ${state.max_concurrent_agents})</h2>
  <table>
    <thead><tr>
      <th>Identifier</th><th>State</th><th>Session</th><th>Turns</th>
      <th>Last Event</th><th>Last Message</th><th>Started</th><th>Last Event At</th><th>Tokens</th>
    </tr></thead>
    <tbody>${runningRows || '<tr><td colspan="9">No active sessions</td></tr>'}</tbody>
  </table>

  <h2>Retrying (${retrying.length})</h2>
  <table>
    <thead><tr><th>Identifier</th><th>Attempt</th><th>Due At</th><th>Error</th></tr></thead>
    <tbody>${retryRows || '<tr><td colspan="4">No retries queued</td></tr>'}</tbody>
  </table>

  <h2>Aggregate Totals</h2>
  <table>
    <thead><tr><th>Input Tokens</th><th>Output Tokens</th><th>Total Tokens</th><th>Seconds Running</th></tr></thead>
    <tbody><tr>
      <td>${totals.input_tokens}</td>
      <td>${totals.output_tokens}</td>
      <td>${totals.total_tokens}</td>
      <td>${totals.seconds_running.toFixed(1)}</td>
    </tr></tbody>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// JSON API helpers
// ---------------------------------------------------------------------------

function stateToJson(state: Readonly<OrchestratorState>): Record<string, unknown> {
  const now = new Date();
  const running = [...state.running.values()];
  const retrying = [...state.retry_attempts.values()];

  // Live seconds: add active session elapsed time (spec 13.5)
  const liveSeconds = running.reduce(
    (acc, e) => acc + (now.getTime() - e.started_at.getTime()) / 1000,
    0,
  );

  return {
    generated_at: now.toISOString(),
    counts: { running: running.length, retrying: retrying.length },
    running: running.map((e) => ({
      issue_id: e.issue.id,
      issue_identifier: e.identifier,
      state: e.issue.state,
      session_id: e.session_id,
      turn_count: e.turn_count,
      last_event: e.last_codex_event,
      last_message: e.last_codex_message,
      started_at: e.started_at.toISOString(),
      last_event_at: e.last_codex_timestamp?.toISOString() ?? null,
      tokens: {
        input_tokens: e.codex_input_tokens,
        output_tokens: e.codex_output_tokens,
        total_tokens: e.codex_total_tokens,
      },
    })),
    retrying: retrying.map((r) => ({
      issue_id: r.issue_id,
      issue_identifier: r.identifier,
      attempt: r.attempt,
      due_at: new Date(r.due_at_ms).toISOString(),
      error: r.error,
    })),
    codex_totals: {
      input_tokens: state.codex_totals.input_tokens,
      output_tokens: state.codex_totals.output_tokens,
      total_tokens: state.codex_totals.total_tokens,
      seconds_running: state.codex_totals.seconds_running + liveSeconds,
    },
    rate_limits: state.codex_rate_limits,
  };
}

// ---------------------------------------------------------------------------
// Request routing
// ---------------------------------------------------------------------------

function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  getState: () => Readonly<OrchestratorState>,
  triggerRefresh: RefreshTrigger,
): void {
  const url = req.url ?? '/';
  const method = req.method ?? 'GET';

  const send = (
    statusCode: number,
    body: string,
    contentType = 'application/json; charset=utf-8',
  ) => {
    res.writeHead(statusCode, { 'Content-Type': contentType, 'X-Frame-Options': 'DENY' });
    res.end(body);
  };

  const sendJson = (statusCode: number, obj: unknown) =>
    send(statusCode, JSON.stringify(obj), 'application/json; charset=utf-8');

  const sendError = (code: number, errorCode: string, message: string) =>
    sendJson(code, { error: { code: errorCode, message } });

  // GET /
  if (url === '/' && method === 'GET') {
    const html = buildDashboard(getState());
    send(200, html, 'text/html; charset=utf-8');
    return;
  }

  // GET /api/v1/state
  if (url === '/api/v1/state' && method === 'GET') {
    sendJson(200, stateToJson(getState()));
    return;
  }

  // POST /api/v1/refresh
  if (url === '/api/v1/refresh' && method === 'POST') {
    triggerRefresh();
    sendJson(202, {
      queued: true,
      coalesced: false,
      requested_at: new Date().toISOString(),
      operations: ['poll', 'reconcile'],
    });
    return;
  }

  // Wrong method on known routes
  if (url === '/api/v1/refresh' && method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendError(405, 'method_not_allowed', 'Only POST is supported for /api/v1/refresh');
    return;
  }
  if (url === '/api/v1/state' && method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendError(405, 'method_not_allowed', 'Only GET is supported for /api/v1/state');
    return;
  }

  // GET /api/v1/<identifier>
  const issueMatch = url.match(/^\/api\/v1\/([^/?]+)$/);
  if (issueMatch && method === 'GET') {
    const identifier = decodeURIComponent(issueMatch[1]);
    const state = getState();

    // Look up by identifier in running or retry maps
    const runningEntry = [...state.running.values()].find((e) => e.identifier === identifier);
    const retryEntry = [...state.retry_attempts.values()].find((e) => e.identifier === identifier);

    if (!runningEntry && !retryEntry) {
      sendError(404, 'issue_not_found', `Issue "${identifier}" is not known to the current in-memory state`);
      return;
    }

    const status = runningEntry ? 'running' : 'retrying';
    const issue = runningEntry?.issue;

    sendJson(200, {
      issue_identifier: identifier,
      issue_id: issue?.id ?? retryEntry?.issue_id ?? null,
      status,
      workspace: issue
        ? { path: null /* not tracked here — workspace path is in worker context */ }
        : null,
      attempts: {
        current_retry_attempt: runningEntry?.retry_attempt ?? retryEntry?.attempt ?? null,
      },
      running: runningEntry
        ? {
            session_id: runningEntry.session_id,
            turn_count: runningEntry.turn_count,
            state: runningEntry.issue.state,
            started_at: runningEntry.started_at.toISOString(),
            last_event: runningEntry.last_codex_event,
            last_message: runningEntry.last_codex_message,
            last_event_at: runningEntry.last_codex_timestamp?.toISOString() ?? null,
            tokens: {
              input_tokens: runningEntry.codex_input_tokens,
              output_tokens: runningEntry.codex_output_tokens,
              total_tokens: runningEntry.codex_total_tokens,
            },
          }
        : null,
      retry: retryEntry
        ? {
            attempt: retryEntry.attempt,
            due_at: new Date(retryEntry.due_at_ms).toISOString(),
            error: retryEntry.error,
          }
        : null,
      last_error: retryEntry?.error ?? null,
      tracked: {},
    });
    return;
  }

  // 404 for everything else
  sendError(404, 'not_found', `Route not found: ${url}`);
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

export function startHttpServer(opts: HttpServerOptions): http.Server {
  const server = http.createServer((req, res) => {
    try {
      handleRequest(req, res, opts.getState, opts.triggerRefresh);
    } catch (err) {
      logger.error('http: unhandled error', { error: String(err) });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'internal_error', message: 'Internal server error' } }));
    }
  });

  server.listen(opts.port, '127.0.0.1', () => {
    const addr = server.address();
    const boundPort = typeof addr === 'object' && addr ? addr.port : opts.port;
    logger.info('http: server started', { port: boundPort });
  });

  server.on('error', (err) => {
    logger.error('http: server error', { error: String(err) });
  });

  return server;
}
