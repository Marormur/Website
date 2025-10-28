#!/usr/bin/env node
/**
 * Cross-platform task helper to ensure the dev server is running.
 *
 * Behavior:
 * - If http://127.0.0.1:5173/ responds, prints the expected ready line and exits.
 * - Otherwise, starts `node server.js` and proxies stdio so VS Code problem matcher can detect readiness.
 */

const http = require('http');
const { spawn } = require('child_process');

const HOST = '127.0.0.1';
const PORT = 5173;
const READY_LINE = `Server running at http://${HOST}:${PORT}/`;

function checkServer(timeoutMs = 300) {
    return new Promise(resolve => {
        const req = http.get({ host: HOST, port: PORT, path: '/', timeout: timeoutMs }, res => {
            // Any HTTP response means something is listening there
            res.resume();
            resolve(true);
        });
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
        req.on('error', () => resolve(false));
    });
}

(async function main() {
    const isUp = await checkServer();
    if (isUp) {
        console.log(READY_LINE);
        // Small delay to let background task consider it stable
        setTimeout(() => process.exit(0), 150);
        return;
    }

    const child = spawn(process.execPath, ['server.js'], {
        stdio: 'inherit',
        env: { ...process.env },
    });

    child.on('exit', code => {
        process.exit(code ?? 0);
    });
})();
