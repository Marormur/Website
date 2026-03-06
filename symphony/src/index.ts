#!/usr/bin/env node
/**
 * Symphony — CLI Entry Point.
 *
 * Usage:
 *   symphony [--workflow <path>] [--port <n>] [--log-level <level>]
 *
 * Environment variables:
 *   LINEAR_API_KEY     — Linear API token (if not set in WORKFLOW.md as $VAR)
 *   SYMPHONY_LOG_LEVEL — Minimum log level (debug|info|warn|error)
 */

import * as path from 'path';
import { initLogLevel, setLogLevel, logger } from './logger.js';
import { loadWorkflow, watchWorkflow } from './workflow-loader.js';
import { buildConfig, validateConfig } from './config.js';
import { Orchestrator } from './orchestrator.js';
import { startHttpServer } from './http-server.js';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  workflowPath?: string;
  port?: number;
  logLevel?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '--workflow' || arg === '-w') && argv[i + 1]) {
      args.workflowPath = argv[++i];
    } else if ((arg === '--port' || arg === '-p') && argv[i + 1]) {
      args.port = parseInt(argv[++i], 10);
    } else if ((arg === '--log-level' || arg === '-l') && argv[i + 1]) {
      args.logLevel = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp(): void {
  process.stdout.write(`Symphony — coding agent orchestration service

Usage: symphony [options]

Options:
  --workflow, -w <path>       Path to WORKFLOW.md (default: ./WORKFLOW.md)
  --port, -p <port>           Start HTTP dashboard/API server on this port
  --log-level, -l <level>     Log level: debug|info|warn|error (default: info)
  --help, -h                  Show this help

Environment variables:
  LINEAR_API_KEY              Linear API token
  SYMPHONY_LOG_LEVEL          Minimum log level

The workflow file (WORKFLOW.md) controls all runtime behaviour:
  - Issue tracker connection (Linear project, states, API key)
  - Polling cadence and concurrency limits
  - Workspace root and lifecycle hooks
  - Codex agent command and timeouts
  - Optional HTTP server port

See https://github.com/openai/symphony/blob/main/SPEC.md for full details.
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  // Initialise logging
  initLogLevel();
  if (args.logLevel) {
    setLogLevel(args.logLevel as Parameters<typeof setLogLevel>[0]);
  }

  const workflowPath = args.workflowPath
    ? path.resolve(args.workflowPath)
    : path.resolve(process.cwd(), 'WORKFLOW.md');

  logger.info('symphony: starting', { workflow_path: workflowPath, pid: String(process.pid) });

  // ---------------------------------------------------------------------------
  // Load workflow (required at startup — spec 6.3)
  // ---------------------------------------------------------------------------

  const loadResult = loadWorkflow(workflowPath);
  if (!loadResult.ok) {
    logger.error('symphony: workflow load failed — cannot start', {
      code: loadResult.error.code,
      message: loadResult.error.message,
    });
    process.exit(1);
  }

  // Validate dispatch config before entering the scheduling loop
  const cfg = buildConfig(loadResult.value);
  const validationErr = validateConfig(cfg);
  if (validationErr) {
    logger.error('symphony: startup validation failed', {
      code: validationErr.code,
      message: validationErr.message,
    });
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Determine server port: CLI --port overrides WORKFLOW.md server.port
  // ---------------------------------------------------------------------------

  const serverPort = args.port ?? cfg.server.port ?? null;

  // ---------------------------------------------------------------------------
  // Create orchestrator and wire up reload
  // ---------------------------------------------------------------------------

  const orchestrator = new Orchestrator(loadResult.value, workflowPath);

  // Watch WORKFLOW.md for changes (section 6.2)
  const stopWatch = watchWorkflow(workflowPath, (result) => {
    if (!result.ok) {
      logger.error('symphony: workflow reload failed — keeping last known good config', {
        code: result.error.code,
        message: result.error.message,
      });
      return;
    }
    logger.info('symphony: WORKFLOW.md changed — reloading config');
    orchestrator.reloadWorkflow(result.value);
  });

  // ---------------------------------------------------------------------------
  // Optional HTTP server (section 13.7)
  // ---------------------------------------------------------------------------

  if (serverPort !== null) {
    startHttpServer({
      port: serverPort,
      getState: () => orchestrator.getState(),
      triggerRefresh: () => {
        logger.info('http: /api/v1/refresh triggered');
        orchestrator.triggerRefresh();
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Graceful shutdown
  // ---------------------------------------------------------------------------

  const shutdown = (signal: string) => {
    logger.info('symphony: received signal — shutting down', { signal });
    stopWatch();
    orchestrator.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // ---------------------------------------------------------------------------
  // Start orchestrator loop
  // ---------------------------------------------------------------------------

  await orchestrator.start();

  logger.info('symphony: running — press Ctrl+C to stop', {
    poll_interval_ms: cfg.polling.interval_ms,
    max_concurrent_agents: cfg.agent.max_concurrent_agents,
    workspace_root: cfg.workspace.root,
    tracker_kind: cfg.tracker.kind,
    server_port: serverPort ?? 'disabled',
  });
}

main().catch((err) => {
  logger.error('symphony: fatal error', { error: String(err) });
  process.exit(1);
});
