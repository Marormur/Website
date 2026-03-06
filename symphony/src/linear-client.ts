/**
 * Symphony — Linear Issue Tracker Client (section 11).
 *
 * Implements the three required tracker operations:
 *   1. fetchCandidateIssues()       — issues in active states for a project
 *   2. fetchIssuesByStates()        — used for startup terminal cleanup
 *   3. fetchIssueStatesByIds()      — used for active-run reconciliation
 *
 * All results are normalised into the canonical `Issue` domain model.
 */

import type { Issue, BlockerRef, TrackerConfig } from './types.js';
import { logger } from './logger.js';

const PAGE_SIZE = 50;
const NETWORK_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// GraphQL fragments / queries
// ---------------------------------------------------------------------------

const ISSUE_FRAGMENT = `
  id
  identifier
  title
  description
  priority
  state { name }
  branchName
  url
  labels { nodes { name } }
  relations(filter: { type: { eq: "blocks" } }) {
    nodes {
      relatedIssue {
        id
        identifier
        state { name }
      }
    }
  }
  createdAt
  updatedAt
`;

const CANDIDATE_ISSUES_QUERY = `
  query CandidateIssues($projectSlug: String!, $states: [String!]!, $after: String) {
    issues(
      filter: {
        project: { slugId: { eq: $projectSlug } }
        state: { name: { in: $states } }
      }
      first: ${PAGE_SIZE}
      after: $after
    ) {
      nodes { ${ISSUE_FRAGMENT} }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const ISSUES_BY_STATES_QUERY = `
  query IssuesByStates($projectSlug: String!, $states: [String!]!, $after: String) {
    issues(
      filter: {
        project: { slugId: { eq: $projectSlug } }
        state: { name: { in: $states } }
      }
      first: ${PAGE_SIZE}
      after: $after
    ) {
      nodes { ${ISSUE_FRAGMENT} }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const ISSUE_STATES_BY_IDS_QUERY = `
  query IssueStatesByIds($ids: [ID!]!) {
    issues(filter: { id: { in: $ids } }) {
      nodes {
        id
        identifier
        title
        description
        priority
        state { name }
        branchName
        url
        labels { nodes { name } }
        relations(filter: { type: { eq: "blocks" } }) {
          nodes {
            relatedIssue {
              id
              identifier
              state { name }
            }
          }
        }
        createdAt
        updatedAt
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Raw Linear API types (minimal surface for normalisation)
// ---------------------------------------------------------------------------

interface LinearNode {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  priority?: number | null;
  state?: { name: string } | null;
  branchName?: string | null;
  url?: string | null;
  labels?: { nodes: Array<{ name: string }> } | null;
  relations?: {
    nodes: Array<{
      relatedIssue?: { id: string; identifier: string; state?: { name: string } | null } | null;
    }>;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface LinearPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

function normaliseIssue(node: LinearNode): Issue {
  // blocked_by = inverse relations of type "blocks" (spec 11.3)
  const blocked_by: BlockerRef[] = (node.relations?.nodes ?? []).map((r) => ({
    id: r.relatedIssue?.id ?? null,
    identifier: r.relatedIssue?.identifier ?? null,
    state: r.relatedIssue?.state?.name ?? null,
  }));

  return {
    id: node.id,
    identifier: node.identifier,
    title: node.title,
    description: node.description ?? null,
    priority: typeof node.priority === 'number' ? node.priority : null,
    state: node.state?.name ?? '',
    branch_name: node.branchName ?? null,
    url: node.url ?? null,
    labels: (node.labels?.nodes ?? []).map((l) => l.name.toLowerCase()),
    blocked_by,
    created_at: node.createdAt ? new Date(node.createdAt) : null,
    updated_at: node.updatedAt ? new Date(node.updatedAt) : null,
  };
}

// ---------------------------------------------------------------------------
// HTTP transport
// ---------------------------------------------------------------------------

interface GraphQLResponse {
  data?: unknown;
  errors?: Array<{ message: string }>;
}

async function graphqlRequest(
  config: TrackerConfig,
  query: string,
  variables: Record<string, unknown>,
): Promise<{ data: unknown } | { error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);

  try {
    const res = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.api_key,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { error: `linear_api_status HTTP ${res.status}` };
    }

    const json = (await res.json()) as GraphQLResponse;
    if (json.errors && json.errors.length > 0) {
      const msgs = json.errors.map((e) => e.message).join('; ');
      return { error: `linear_graphql_errors: ${msgs}` };
    }
    if (json.data === undefined) {
      return { error: 'linear_unknown_payload: missing data field' };
    }
    return { data: json.data };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).name === 'AbortError') {
      return { error: `linear_api_request: network timeout after ${NETWORK_TIMEOUT_MS}ms` };
    }
    return { error: `linear_api_request: ${String(err)}` };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Paginated query helper
// ---------------------------------------------------------------------------

type PagedResult = {
  nodes: LinearNode[];
  pageInfo: LinearPageInfo;
};

async function fetchAllPages(
  config: TrackerConfig,
  query: string,
  variables: Record<string, unknown>,
  dataPath: string,
): Promise<{ issues: Issue[] } | { error: string }> {
  const issues: Issue[] = [];
  let after: string | null = null;

  for (;;) {
    const vars = after ? { ...variables, after } : variables;
    const result = await graphqlRequest(config, query, vars);
    if ('error' in result) return result;

    const data = (result.data as Record<string, unknown>)[dataPath] as PagedResult | undefined;
    if (!data || !Array.isArray(data.nodes)) {
      return { error: 'linear_unknown_payload: unexpected response shape' };
    }

    for (const node of data.nodes) {
      issues.push(normaliseIssue(node));
    }

    if (!data.pageInfo.hasNextPage) break;
    if (!data.pageInfo.endCursor) {
      return { error: 'linear_missing_end_cursor: pagination integrity error' };
    }
    after = data.pageInfo.endCursor;
  }

  return { issues };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class LinearClient {
  constructor(private readonly config: TrackerConfig) {}

  /** Fetch all candidate issues in the configured active states. */
  async fetchCandidateIssues(): Promise<{ issues: Issue[] } | { error: string }> {
    if (this.config.kind !== 'linear') {
      return { error: `unsupported_tracker_kind: ${this.config.kind}` };
    }
    if (!this.config.api_key) {
      return { error: 'missing_tracker_api_key' };
    }
    if (!this.config.project_slug) {
      return { error: 'missing_tracker_project_slug' };
    }

    logger.debug('linear: fetching candidate issues', {
      project_slug: this.config.project_slug,
      active_states: this.config.active_states.join(','),
    });

    return fetchAllPages(
      this.config,
      CANDIDATE_ISSUES_QUERY,
      { projectSlug: this.config.project_slug, states: this.config.active_states },
      'issues',
    );
  }

  /** Fetch issues in given states — used for startup terminal cleanup. */
  async fetchIssuesByStates(stateNames: string[]): Promise<{ issues: Issue[] } | { error: string }> {
    if (!this.config.project_slug) {
      return { error: 'missing_tracker_project_slug' };
    }
    return fetchAllPages(
      this.config,
      ISSUES_BY_STATES_QUERY,
      { projectSlug: this.config.project_slug, states: stateNames },
      'issues',
    );
  }

  /**
   * Fetch current state for a list of issue IDs — used for reconciliation.
   * Returns normalised issues (potentially a subset if some IDs are not found).
   */
  async fetchIssueStatesByIds(
    issueIds: string[],
  ): Promise<{ issues: Issue[] } | { error: string }> {
    if (issueIds.length === 0) return { issues: [] };

    const result = await graphqlRequest(this.config, ISSUE_STATES_BY_IDS_QUERY, {
      ids: issueIds,
    });
    if ('error' in result) return result;

    const data = (result.data as Record<string, unknown>)['issues'] as
      | { nodes: LinearNode[] }
      | undefined;
    if (!data || !Array.isArray(data.nodes)) {
      return { error: 'linear_unknown_payload: unexpected response shape' };
    }

    return { issues: data.nodes.map(normaliseIssue) };
  }

  /**
   * Execute a raw GraphQL operation on behalf of the agent (linear_graphql tool).
   * Reuses configured auth — the agent never sees the token directly.
   */
  async executeGraphQL(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!query.trim()) {
      return { success: false, error: 'query must be a non-empty string' };
    }

    // Reject multi-operation documents (spec 10.5)
    const operationCount = (query.match(/\b(query|mutation|subscription)\b/gi) ?? []).length;
    if (operationCount > 1) {
      return { success: false, error: 'query must contain exactly one GraphQL operation' };
    }

    const result = await graphqlRequest(this.config, query, variables ?? {});
    if ('error' in result) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data };
  }
}
