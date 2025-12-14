'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const storage_utils_js_1 = require('./storage-utils.js');
(function () {
    'use strict';
    const GITHUB_CACHE_NS = 'finderGithubCacheV1:';
    function getCacheTtl() {
        const dflt = 5 * 60 * 1000; // 5 minutes
        try {
            const constants = window.APP_CONSTANTS || {};
            const val = constants['GITHUB_CACHE_DURATION'];
            return typeof val === 'number' ? val : dflt;
        } catch {
            return dflt;
        }
    }
    function makeCacheKey(kind, repo = '', subPath = '') {
        if (kind === 'repos') return GITHUB_CACHE_NS + 'repos';
        return `${GITHUB_CACHE_NS}contents:${repo}:${subPath}`;
    }
    function writeCache(kind, repo, subPath, data) {
        const key = makeCacheKey(kind, repo, subPath);
        try {
            const payload = { t: Date.now(), d: data };
            (0, storage_utils_js_1.setJSON)(key, payload);
        } catch {
            /* ignore */
        }
    }
    function readCache(kind, repo = '', subPath = '') {
        const key = makeCacheKey(kind, repo, subPath);
        try {
            const parsed = (0, storage_utils_js_1.getJSON)(key, null);
            if (!parsed || typeof parsed !== 'object') return null;
            const ttl = getCacheTtl();
            if (typeof parsed.t !== 'number' || Date.now() - parsed.t > ttl) return null;
            return parsed.d ?? null;
        } catch {
            return null;
        }
    }
    function getHeaders() {
        const headers = { Accept: 'application/vnd.github.v3+json' };
        try {
            const token = (0, storage_utils_js_1.getString)('githubToken');
            if (token && token.trim()) {
                headers['Authorization'] = `token ${token.trim()}`;
            }
        } catch {
            /* ignore */
        }
        return headers;
    }
    async function fetchJSON(url) {
        const res = await fetch(url, { headers: getHeaders() });
        if (!res.ok) {
            throw Object.assign(new Error(`GitHub API error: ${res.status}`), {
                status: res.status,
            });
        }
        return res.json();
    }
    async function fetchUserRepos(username, params) {
        const search = new globalThis.URLSearchParams();
        search.set('per_page', String(params?.per_page ?? 100));
        search.set('sort', params?.sort ?? 'updated');
        const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?${search.toString()}`;
        return fetchJSON(url);
    }
    async function fetchRepoContents(username, repo, subPath = '') {
        const pathPart = subPath ? `/${encodeURIComponent(subPath).replace(/%2F/g, '/')}` : '';
        const url = `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/contents${pathPart}`;
        return fetchJSON(url);
    }
    window.GitHubAPI = {
        getHeaders,
        readCache,
        writeCache,
        fetchJSON,
        fetchUserRepos,
        fetchRepoContents,
    };
})();
//# sourceMappingURL=github-api.js.map
