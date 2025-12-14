import { getJSON, setJSON, getString } from '../services/storage-utils.js';

(function () {
    'use strict';

    const GITHUB_CACHE_NS = 'finderGithubCacheV1:';

    // Cache strategy: Stale-while-revalidate
    const CACHE_STALE_AGE = 5 * 60 * 1000; // 5 minutes - data is considered stale
    const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes - absolute max age

    function getCacheTtl(): number {
        const dflt = CACHE_MAX_AGE;
        try {
            const constants =
                (window as unknown as { APP_CONSTANTS?: Record<string, unknown> }).APP_CONSTANTS ||
                {};
            const val = (constants as Record<string, unknown>)['GITHUB_CACHE_DURATION'];
            return typeof val === 'number' ? (val as number) : dflt;
        } catch {
            return dflt;
        }
    }

    function makeCacheKey(kind: 'repos' | 'contents', repo = '', subPath = ''): string {
        if (kind === 'repos') return GITHUB_CACHE_NS + 'repos';
        return `${GITHUB_CACHE_NS}contents:${repo}:${subPath}`;
    }

    function writeCache(
        kind: 'repos' | 'contents',
        repo: string,
        subPath: string,
        data: unknown
    ): void {
        const key = makeCacheKey(kind, repo, subPath);
        try {
            const payload = { t: Date.now(), d: data };
            setJSON(key, payload);
        } catch {
            /* ignore */
        }
    }

    function readCache<T = unknown>(kind: 'repos' | 'contents', repo = '', subPath = ''): T | null {
        const key = makeCacheKey(kind, repo, subPath);
        try {
            const parsed = getJSON<{ t: number; d: T } | null>(key, null);
            if (!parsed || typeof parsed !== 'object') return null;
            const ttl = getCacheTtl();
            if (typeof parsed.t !== 'number' || Date.now() - parsed.t > ttl) return null;
            return (parsed.d as T) ?? null;
        } catch {
            return null;
        }
    }

    /**
     * Check if cached data is stale (beyond STALE_AGE but within MAX_AGE).
     * Returns null if cache doesn't exist or is expired (beyond MAX_AGE).
     */
    function isCacheStale(kind: 'repos' | 'contents', repo = '', subPath = ''): boolean {
        const key = makeCacheKey(kind, repo, subPath);
        try {
            const parsed = getJSON<{ t: number; d: unknown } | null>(key, null);
            if (!parsed || typeof parsed !== 'object' || typeof parsed.t !== 'number') {
                return false;
            }
            const age = Date.now() - parsed.t;
            return age > CACHE_STALE_AGE && age <= CACHE_MAX_AGE;
        } catch {
            return false;
        }
    }

    function getHeaders(): Record<string, string> {
        const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
        try {
            const token = getString('githubToken');
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

    // Request deduplication: Track pending requests to avoid duplicates
    const pendingRequests = new Map<string, Promise<unknown>>();

    /**
     * Deduplicate concurrent requests for the same resource.
     * If a request is already pending, return the existing promise.
     */
    function deduplicatedFetch<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
        const existing = pendingRequests.get(key);
        if (existing) {
            return existing as Promise<T>;
        }

        const promise = fetchFn()
            .finally(() => {
                pendingRequests.delete(key);
            });

        pendingRequests.set(key, promise);
        return promise as Promise<T>;
    }

    async function fetchUserRepos(
        username: string,
        params?: { per_page?: number; sort?: string }
    ): Promise<unknown[]> {
        const perf = (
            window as {
                PerfMonitor?: {
                    mark: (n: string) => void;
                    measure: (n: string, s?: string, e?: string) => void;
                };
            }
        ).PerfMonitor;
        perf?.mark('github:fetchUserRepos:start');

        const search = new globalThis.URLSearchParams();
        search.set('per_page', String(params?.per_page ?? 100));
        search.set('sort', params?.sort ?? 'updated');
        const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?${search.toString()}`;
        
        // Use deduplication to prevent concurrent duplicate requests
        const dedupeKey = `repos:${username}:${search.toString()}`;
        const result = await deduplicatedFetch(dedupeKey, () => fetchJSON<unknown[]>(url));

        perf?.mark('github:fetchUserRepos:end');
        perf?.measure(
            'github:fetchUserRepos-duration',
            'github:fetchUserRepos:start',
            'github:fetchUserRepos:end'
        );

        return result;
    }

    async function fetchRepoContents(
        username: string,
        repo: string,
        subPath = ''
    ): Promise<unknown> {
        const perf = (
            window as {
                PerfMonitor?: {
                    mark: (n: string) => void;
                    measure: (n: string, s?: string, e?: string) => void;
                };
            }
        ).PerfMonitor;
        perf?.mark('github:fetchRepoContents:start');

        const pathPart = subPath ? `/${encodeURIComponent(subPath).replace(/%2F/g, '/')}` : '';
        const url = `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/contents${pathPart}`;
        
        // Use deduplication to prevent concurrent duplicate requests
        const dedupeKey = `contents:${username}:${repo}:${subPath}`;
        const result = await deduplicatedFetch(dedupeKey, () => fetchJSON<unknown>(url));

        perf?.mark('github:fetchRepoContents:end');
        perf?.measure(
            'github:fetchRepoContents-duration',
            'github:fetchRepoContents:start',
            'github:fetchRepoContents:end'
        );

        return result;
    }

    type GitHubAPINamespace = {
        getHeaders: () => Record<string, string>;
        readCache: <T = unknown>(
            kind: 'repos' | 'contents',
            repo?: string,
            subPath?: string
        ) => T | null;
        isCacheStale: (kind: 'repos' | 'contents', repo?: string, subPath?: string) => boolean;
        writeCache: (
            kind: 'repos' | 'contents',
            repo: string,
            subPath: string,
            data: unknown
        ) => void;
        fetchJSON: <T = unknown>(url: string) => Promise<T>;
        fetchUserRepos: (
            username: string,
            params?: { per_page?: number; sort?: string }
        ) => Promise<unknown[]>;
        fetchRepoContents: (username: string, repo: string, subPath?: string) => Promise<unknown>;
        prefetchUserRepos: (username: string) => void;
    };

    /**
     * Prefetch user repositories in the background.
     * This is called when opening Finder to warm up the cache.
     */
    function prefetchUserRepos(username: string): void {
        // Only prefetch if cache is empty or stale
        const cached = readCache('repos');
        if (cached && !isCacheStale('repos')) {
            return; // Cache is fresh, no need to prefetch
        }

        // Fetch in background (fire and forget)
        fetchUserRepos(username)
            .then(repos => {
                writeCache('repos', '', '', repos);
            })
            .catch(err => {
                console.warn('[GitHubAPI] Prefetch failed:', err);
            });
    }

    (window as unknown as { GitHubAPI: GitHubAPINamespace }).GitHubAPI = {
        getHeaders,
        readCache,
        isCacheStale,
        writeCache,
        fetchJSON,
        fetchUserRepos,
        fetchRepoContents,
        prefetchUserRepos,
    };
})();
