/**
 * Symphony — Workspace Manager (section 9).
 *
 * Handles per-issue workspace creation, reuse, cleanup, and lifecycle hooks.
 *
 * Safety invariants (section 9.5):
 *   1. Coding agent runs ONLY inside the per-issue workspace path.
 *   2. Workspace path MUST stay inside workspace root.
 *   3. Workspace key is sanitized to `[A-Za-z0-9._-]` only.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import type { Workspace, HooksConfig } from './types.js';
import { logger } from './logger.js';

// ---------------------------------------------------------------------------
// Sanitisation (spec 4.2 + 9.5 invariant 3)
// ---------------------------------------------------------------------------

/** Replace characters not in [A-Za-z0-9._-] with underscore. */
export function sanitiseWorkspaceKey(identifier: string): string {
  return identifier.replace(/[^A-Za-z0-9._-]/g, '_');
}

// ---------------------------------------------------------------------------
// Path safety (spec 9.5 invariants 1 & 2)
// ---------------------------------------------------------------------------

/**
 * Compute the workspace path for an issue identifier.
 * Throws if the resulting path is outside the workspace root (path-traversal guard).
 */
export function workspacePath(workspaceRoot: string, identifier: string): string {
  const key = sanitiseWorkspaceKey(identifier);
  const absRoot = path.resolve(workspaceRoot);
  const wsPath = path.resolve(absRoot, key);

  // Invariant 2: workspace path must be inside the workspace root
  if (!wsPath.startsWith(absRoot + path.sep) && wsPath !== absRoot) {
    throw new Error(
      `Workspace path "${wsPath}" is outside workspace root "${absRoot}" — rejected for safety`,
    );
  }
  return wsPath;
}

// ---------------------------------------------------------------------------
// Workspace creation / reuse (spec 9.2)
// ---------------------------------------------------------------------------

export interface CreateWorkspaceOptions {
  workspaceRoot: string;
  identifier: string;
  hooks: HooksConfig;
}

export type CreateWorkspaceResult =
  | { ok: true; workspace: Workspace }
  | { ok: false; error: string };

/**
 * Create or reuse the workspace directory for the given issue identifier.
 *
 * Algorithm:
 *  1. Sanitise identifier → workspace_key
 *  2. Compute path under workspace_root
 *  3. Create directory if absent (mark created_now)
 *  4. Run after_create hook if created_now
 */
export async function createWorkspace(
  opts: CreateWorkspaceOptions,
): Promise<CreateWorkspaceResult> {
  const { workspaceRoot, identifier, hooks } = opts;

  let wsPath: string;
  try {
    wsPath = workspacePath(workspaceRoot, identifier);
  } catch (err) {
    return { ok: false, error: String(err) };
  }

  const key = sanitiseWorkspaceKey(identifier);
  let created_now = false;

  // Ensure root exists
  try {
    fs.mkdirSync(workspaceRoot, { recursive: true });
  } catch (err) {
    return { ok: false, error: `Failed to create workspace root "${workspaceRoot}": ${String(err)}` };
  }

  // Check whether workspace directory already exists
  let exists = false;
  try {
    const stat = fs.statSync(wsPath);
    exists = stat.isDirectory();
    if (!exists) {
      // Non-directory at the path — fail safely
      return {
        ok: false,
        error: `Workspace path "${wsPath}" exists but is not a directory`,
      };
    }
  } catch {
    exists = false;
  }

  if (!exists) {
    try {
      fs.mkdirSync(wsPath, { recursive: true });
      created_now = true;
    } catch (err) {
      return { ok: false, error: `Failed to create workspace directory "${wsPath}": ${String(err)}` };
    }
  }

  const workspace: Workspace = { path: wsPath, workspace_key: key, created_now };

  // Run after_create hook only when the directory was just created (spec 9.4)
  if (created_now && hooks.after_create) {
    logger.info('workspace: running after_create hook', { workspace_path: wsPath });
    const hookResult = await runHook(hooks.after_create, wsPath, hooks.timeout_ms, 'after_create');
    if (!hookResult.ok) {
      // after_create failure is FATAL — clean up the partially-created workspace
      try {
        fs.rmSync(wsPath, { recursive: true, force: true });
      } catch {
        /* best effort */
      }
      return { ok: false, error: `after_create hook failed: ${hookResult.error}` };
    }
  }

  return { ok: true, workspace };
}

// ---------------------------------------------------------------------------
// Workspace removal (spec 9.2 + 8.5)
// ---------------------------------------------------------------------------

export async function removeWorkspace(
  workspaceRoot: string,
  identifier: string,
  hooks: HooksConfig,
): Promise<void> {
  let wsPath: string;
  try {
    wsPath = workspacePath(workspaceRoot, identifier);
  } catch (err) {
    logger.warn('workspace: cannot compute path for removal', { identifier, error: String(err) });
    return;
  }

  let exists = false;
  try {
    exists = fs.statSync(wsPath).isDirectory();
  } catch {
    /* not found */
  }

  if (!exists) return;

  // Run before_remove hook — failure is logged but ignored (spec 9.4)
  if (hooks.before_remove) {
    logger.info('workspace: running before_remove hook', { workspace_path: wsPath });
    const hookResult = await runHook(
      hooks.before_remove,
      wsPath,
      hooks.timeout_ms,
      'before_remove',
    );
    if (!hookResult.ok) {
      logger.warn('workspace: before_remove hook failed (ignored)', {
        workspace_path: wsPath,
        error: hookResult.error,
      });
    }
  }

  try {
    fs.rmSync(wsPath, { recursive: true, force: true });
    logger.info('workspace: removed', { workspace_path: wsPath });
  } catch (err) {
    logger.warn('workspace: failed to remove', { workspace_path: wsPath, error: String(err) });
  }
}

// ---------------------------------------------------------------------------
// Hooks (spec 9.4)
// ---------------------------------------------------------------------------

export type HookResult = { ok: true } | { ok: false; error: string };

/**
 * Execute a workspace hook script in a shell with `cwd` set to the workspace.
 *
 * Uses `sh -lc <script>` on POSIX (bash if available).
 * Enforces `timeout_ms`.
 */
export async function runHook(
  script: string,
  cwd: string,
  timeoutMs: number,
  hookName: string,
): Promise<HookResult> {
  return new Promise((resolve) => {
    const shell = process.platform === 'win32' ? 'cmd' : 'bash';
    const args = process.platform === 'win32' ? ['/c', script] : ['-lc', script];

    let timedOut = false;
    const proc = child_process.spawn(shell, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      // Force kill after 2s if still running
      setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {
          /* already dead */
        }
      }, 2_000);
    }, timeoutMs);

    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString();
      // Truncate excessive output
      if (stdout.length > 4096) stdout = stdout.slice(-4096);
    });
    proc.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString();
      if (stderr.length > 4096) stderr = stderr.slice(-4096);
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        logger.warn(`workspace: ${hookName} hook timed out`, { cwd, timeout_ms: timeoutMs });
        resolve({ ok: false, error: `${hookName} hook timed out after ${timeoutMs}ms` });
        return;
      }
      if (code !== 0) {
        logger.warn(`workspace: ${hookName} hook failed`, {
          cwd,
          exit_code: code ?? 'null',
          stderr: stderr.slice(-512),
        });
        resolve({ ok: false, error: `${hookName} hook exited with code ${code}` });
        return;
      }
      logger.debug(`workspace: ${hookName} hook completed`, { cwd });
      resolve({ ok: true });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: `${hookName} hook spawn error: ${String(err)}` });
    });
  });
}
