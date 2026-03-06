/**
 * Symphony — Prompt Builder (section 12).
 *
 * Renders the per-issue prompt from the Liquid template in `WORKFLOW.md`.
 *
 * Rules:
 *  - Strict variable checking — unknown variables fail rendering.
 *  - Strict filter checking — unknown filters fail rendering.
 *  - `issue` and `attempt` are the two template variables.
 *  - If the prompt body is empty, falls back to a minimal default.
 */

import { Liquid } from 'liquidjs';
import type { Issue, WorkflowDefinition } from './types.js';

const FALLBACK_PROMPT = 'You are working on an issue from Linear.';

const engine = new Liquid({
  strictVariables: true,
  strictFilters: true,
});

export interface PromptRenderResult {
  ok: true;
  prompt: string;
}

export interface PromptRenderError {
  ok: false;
  code: 'template_parse_error' | 'template_render_error';
  message: string;
}

/**
 * Render the workflow prompt for a given issue and optional retry attempt.
 *
 * Returns a `PromptRenderError` rather than throwing so the caller can
 * treat it as a run-attempt failure (section 12.4).
 */
export async function buildPrompt(
  wf: WorkflowDefinition,
  issue: Issue,
  attempt: number | null,
): Promise<PromptRenderResult | PromptRenderError> {
  const template = wf.prompt_template.trim();

  // Empty prompt body → fall back to minimal default (spec 5.4)
  if (!template) {
    return { ok: true, prompt: FALLBACK_PROMPT };
  }

  // Convert issue fields to plain objects for template compatibility (spec 12.2)
  const issueObj: Record<string, unknown> = {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description,
    priority: issue.priority,
    state: issue.state,
    branch_name: issue.branch_name,
    url: issue.url,
    labels: issue.labels,
    blocked_by: issue.blocked_by.map((b) => ({
      id: b.id,
      identifier: b.identifier,
      state: b.state,
    })),
    created_at: issue.created_at?.toISOString() ?? null,
    updated_at: issue.updated_at?.toISOString() ?? null,
  };

  try {
    const rendered = await engine.parseAndRender(template, {
      issue: issueObj,
      attempt: attempt,
    });
    return { ok: true, prompt: rendered };
  } catch (err) {
    const msg = String(err);
    // Liquid throws on unknown variables/filters
    const isRenderError =
      msg.includes('undefined variable') ||
      msg.includes('Unknown filter') ||
      msg.includes('RenderError') ||
      msg.includes('ParseError');

    return {
      ok: false,
      code: isRenderError ? 'template_render_error' : 'template_parse_error',
      message: `Prompt rendering failed: ${msg}`,
    };
  }
}
