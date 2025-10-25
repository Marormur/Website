(function () {
    'use strict';

    const GITHUB_CACHE_NS = 'finderGithubCacheV1:';

    function getCacheTtl(): number {
        const dflt = 5 * 60 * 1000; // 5 minutes
        try {
            const constants = (window as unknown as { APP_CONSTANTS?: Record<string, unknown> }).APP_CONSTANTS || {};
            const val = (constants as Record<string, unknown>)[
                'GITHUB_CACHE_DURATION'
            ];
            return typeof val === 'number' ? (val as number) : dflt;
        } catch {
            return dflt;
        }
    }

    function makeCacheKey(kind: 'repos' | 'contents', repo = '', subPath = ''): string {
        if (kind === 'repos') return GITHUB_CACHE_NS + 'repos';
        return `${GITHUB_CACHE_NS}contents:${repo}:${subPath}`;
    }

    function writeCache(kind: 'repos' | 'contents', repo: string, subPath: string, data: unknown): void {
        const key = makeCacheKey(kind, repo, subPath);
        try {
            const payload = { t: Date.now(), d: data };
            localStorage.setItem(key, JSON.stringify(payload));
        } catch {
            /* ignore */
        }
    }

    function readCache<T = unknown>(kind: 'repos' | 'contents', repo = '', subPath = ''): T | null {
        const key = makeCacheKey(kind, repo, subPath);
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            const ttl = getCacheTtl();
            if (typeof parsed.t !== 'number' || Date.now() - parsed.t > ttl) return null;
            return (parsed.d as T) ?? null;
        } catch {
            return null;
        }
    }

    function getHeaders(): Record<string, string> {
        const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
        try {
            const token = localStorage.getItem('githubToken');
            if (token && token.trim()) {
                headers['Authorization'] = `token ${token.trim()}`;
            }
        } catch {
            /* ignore */
        }
        return headers;
    }

    async function fetchJSON<T = unknown>(url: string): Promise<T> {
        const res = await fetch(url, { headers: getHeaders() });
        if (!res.ok) {
            throw Object.assign(new Error(`GitHub API error: ${res.status}`), {
                status: res.status,
            });
        }
        return res.json() as Promise<T>;
    }

    async function fetchUserRepos(username: string, params?: { per_page?: number; sort?: string }): Promise<unknown[]> {
        const search = new URLSearchParams();
        search.set('per_page', String(params?.per_page ?? 100));
        search.set('sort', params?.sort ?? 'updated');
        const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?${search.toString()}`;
        return fetchJSON<unknown[]>(url);
    }

    async function fetchRepoContents(username: string, repo: string, subPath = ''): Promise<unknown> {
        const pathPart = subPath ? `/${encodeURIComponent(subPath).replace(/%2F/g, '/')}` : '';
        const url = `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/contents${pathPart}`;
        return fetchJSON<unknown>(url);
    }

    type GitHubAPINamespace = {
        getHeaders: () => Record<string, string>;
        readCache: <T = unknown>(kind: 'repos' | 'contents', repo?: string, subPath?: string) => T | null;
        writeCache: (kind: 'repos' | 'contents', repo: string, subPath: string, data: unknown) => void;
        fetchJSON: <T = unknown>(url: string) => Promise<T>;
        fetchUserRepos: (username: string, params?: { per_page?: number; sort?: string }) => Promise<unknown[]>;
        fetchRepoContents: (username: string, repo: string, subPath?: string) => Promise<unknown>;
    };

    (window as unknown as { GitHubAPI: GitHubAPINamespace }).GitHubAPI = {
        getHeaders,
        readCache,
        writeCache,
        fetchJSON,
        fetchUserRepos,
        fetchRepoContents,
    };
})();
