#!/usr/bin/env node
/**
 * Launch Safari with the Dev Server URL
 * Used by VS Code Debug profile "Safari: Launch with Dev Server"
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function launchSafari() {
    const url = 'http://127.0.0.1:5173';

    try {
        console.log(`🧭 Opening Safari with ${url}...`);
        await execAsync(`open -a Safari "${url}"`);
        console.log('✓ Safari launched successfully');
    } catch (error) {
        console.error('✗ Failed to launch Safari:', error.message);
        process.exit(1);
    }
}

launchSafari();
