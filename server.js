#!/usr/bin/env node
/**
 * Simple HTTP server with proper MIME types and cache control
 * Start with: node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
let chokidar;

const PORT = 5173;
const HOST = '127.0.0.1';

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8'
};

// Keep a list of connected SSE clients for live reload
const sseClients = new Set();

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    // Remove query params for file lookup
    filePath = filePath.split('?')[0];

    // SSE endpoint for live reload
    if (filePath === './livereload') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write(': connected\n\n'); // comment to establish stream
        sseClients.add(res);
        req.on('close', () => {
            sseClients.delete(res);
        });
        return; // keep connection open
    }

    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} -> ${filePath}`);

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                console.error(`[404] File not found: ${filePath}`);
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                console.error(`[500] Server error: ${error.code} for ${filePath}`);
                res.writeHead(500);
                res.end('Server Error: ' + error.code, 'utf-8');
            }
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.end(content, 'utf-8');
            console.log(`[200] Served ${filePath} (${contentType})`);
        }
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}/`);
    // Start file watcher for live reload (dev only)
    try {
        chokidar = require('chokidar');
        if (process.env.NO_WATCH === '1' || process.env.CI === 'true') {
            console.log('[LR] Live reload disabled by environment (NO_WATCH/CI).');
            return;
        }

        // Keep the watch surface small to avoid excessive memory on Windows
        const watchPaths = [
            path.join(__dirname, 'index.html'),
            path.join(__dirname, '*.html'), // root-level html
            path.join(__dirname, 'js/**/*.js'),
            path.join(__dirname, 'style.css'),
            // CSS: only built files → reload after successful Tailwind build
            path.join(__dirname, 'dist/**/*.css')
        ];

        const watcher = chokidar.watch(watchPaths, {
            ignored: [
                // dotfiles
                /(^|[\/\\])\../,
                // heavy dirs
                '**/node_modules/**',
                '**/.git/**',
                '**/test-results/**',
                '**/.vscode/**'
            ],
            ignoreInitial: true,
            awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
            depth: 6,
        });

        const broadcastReload = (changedPath) => {
            const rel = path.relative(__dirname, changedPath || '');
            const ext = path.extname(rel).toLowerCase();
            const kind = ext === '.css' ? 'css' : (ext === '.html' ? 'html' : 'js');
            const msg = `event: reload\ndata: ${JSON.stringify({ path: rel, kind, ts: Date.now() })}\n\n`;
            for (const client of sseClients) {
                try {
                    if (client.writableEnded || client.destroyed) {
                        sseClients.delete(client);
                    } else {
                        client.write(msg);
                    }
                } catch (_) { /* drop broken client on next tick */ }
            }
            console.log(`[LR] Reload triggered by: ${rel}`);
        };

        // Throttle bursts of events
        let lastEventPath = '';
        let timer = null;
        function scheduleReload(p) {
            lastEventPath = p;
            if (timer) return;
            timer = setTimeout(() => {
                const pth = lastEventPath;
                lastEventPath = '';
                timer = null;
                broadcastReload(pth);
            }, 120);
        }

        watcher.on('add', scheduleReload)
            .on('change', scheduleReload)
            .on('unlink', scheduleReload);

        // Periodic heartbeat to prune dead SSE clients
        setInterval(() => {
            const ping = `: ping ${Date.now()}\n\n`;
            for (const client of sseClients) {
                try {
                    if (client.writableEnded || client.destroyed) {
                        sseClients.delete(client);
                    } else {
                        client.write(ping);
                    }
                } catch (_) { /* ignore */ }
            }
        }, 30000).unref();
        console.log('[LR] Live reload enabled (SSE).');
    } catch (err) {
        console.log('[LR] Live reload disabled (chokidar not installed). Run "npm i -D chokidar" to enable.');
    }
});
