/**
 * Symphony — Workflow Loader (section 5).
 *
 * Reads `WORKFLOW.md`, parses optional YAML front-matter, and returns a
 * `WorkflowDefinition`.  Also provides a `watchWorkflow` helper that fires a
 * callback whenever the file changes (section 6.2 dynamic reload).
 *
 * File format:
 *   ---
 *   <YAML front matter>
 *   ---
 *   <prompt template body>
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import type { WorkflowDefinition, WorkflowError } from './types.js';

/** Default workflow file name, relative to process.cwd(). */
const DEFAULT_WORKFLOW_FILE = 'WORKFLOW.md';

export type WorkflowResult =
  | { ok: true; value: WorkflowDefinition }
  | { ok: false; error: WorkflowError };

/**
 * Load and parse `WORKFLOW.md` (or the path provided).
 *
 * Returns a typed result rather than throwing so callers can decide whether
 * a load failure is fatal (startup) or non-fatal (bad reload).
 */
export function loadWorkflow(filePath?: string): WorkflowResult {
  const resolvedPath = filePath ?? path.resolve(process.cwd(), DEFAULT_WORKFLOW_FILE);

  let raw: string;
  try {
    raw = fs.readFileSync(resolvedPath, 'utf-8');
  } catch {
    return {
      ok: false,
      error: {
        code: 'missing_workflow_file',
        message: `Cannot read workflow file: ${resolvedPath}`,
      },
    };
  }

  return parseWorkflow(raw, resolvedPath);
}

/**
 * Parse raw `WORKFLOW.md` content into a WorkflowDefinition.
 * Exported for testing.
 */
export function parseWorkflow(raw: string, sourcePath = '<inline>'): WorkflowResult {
  let config: Record<string, unknown> = {};
  let prompt_template = raw;

  // Detect YAML front matter: file must start with "---"
  if (raw.startsWith('---')) {
    const endMarker = raw.indexOf('\n---', 3);
    if (endMarker === -1) {
      // Treat the whole file as prompt if closing --- is missing
      prompt_template = raw.trim();
    } else {
      const frontMatterRaw = raw.slice(3, endMarker).trim();
      const bodyRaw = raw.slice(endMarker + 4); // skip "\n---"

      let parsed: unknown;
      try {
        parsed = yaml.load(frontMatterRaw);
      } catch (err) {
        return {
          ok: false,
          error: {
            code: 'workflow_parse_error',
            message: `YAML parse error in ${sourcePath}: ${String(err)}`,
          },
        };
      }

      if (parsed === null || parsed === undefined) {
        // Empty front matter is a valid empty config map
        config = {};
      } else if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {
          ok: false,
          error: {
            code: 'workflow_front_matter_not_a_map',
            message: `Front matter in ${sourcePath} must be a YAML map/object, got ${typeof parsed}`,
          },
        };
      } else {
        config = parsed as Record<string, unknown>;
      }

      prompt_template = bodyRaw.trim();
    }
  }

  return { ok: true, value: { config, prompt_template } };
}

/**
 * Watch `filePath` for changes and call `onChange` with a new load attempt.
 * Uses polling via `fs.watchFile` so it works across all platforms.
 *
 * Returns a cleanup function that stops the watch.
 */
export function watchWorkflow(
  filePath: string | undefined,
  onChange: (result: WorkflowResult) => void,
): () => void {
  const resolvedPath = filePath ?? path.resolve(process.cwd(), DEFAULT_WORKFLOW_FILE);

  const listener: fs.WatchListener<string> = () => {
    const result = loadWorkflow(resolvedPath);
    onChange(result);
  };

  // Use fs.watch for efficiency; fall back gracefully if unavailable.
  let watcher: fs.FSWatcher | null = null;
  try {
    watcher = fs.watch(resolvedPath, { persistent: false }, listener);
    watcher.on('error', () => {
      // If the watcher errors out (e.g. file deleted), just ignore.
    });
  } catch {
    // File may not exist yet; that is OK — startup validation will report the error.
  }

  return () => {
    watcher?.close();
  };
}
