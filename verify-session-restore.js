#!/usr/bin/env node
/**
 * Verification script for session restore functionality
 * This script checks that the SessionManager has the required methods
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Session Restore Implementation...\n');

// Check SessionManager file exists
const sessionManagerPath = path.join(__dirname, 'js', 'session-manager.js');
if (!fs.existsSync(sessionManagerPath)) {
    console.error('❌ SessionManager file not found at:', sessionManagerPath);
    process.exit(1);
}

console.log('✅ SessionManager file exists');

// Read and check for required methods
const sessionManagerContent = fs.readFileSync(sessionManagerPath, 'utf-8');

const requiredMethods = [
    '_captureModalState',
    '_restoreModalState',
    '_captureTabState',
    '_restoreTabState',
    'saveAllSessions',
    'restoreAllSessions',
    'registerManager',
    'startAutoSave'
];

console.log('\nChecking for required methods:');
let allMethodsPresent = true;

requiredMethods.forEach(method => {
    if (sessionManagerContent.includes(method)) {
        console.log(`  ✅ ${method}`);
    } else {
        console.log(`  ❌ ${method} - MISSING`);
        allMethodsPresent = false;
    }
});

// Check for version 1.1
if (sessionManagerContent.includes("version: '1.1'")) {
    console.log('\n✅ Session format version 1.1 detected');
} else {
    console.log('\n⚠️  Session format version 1.1 not found');
}

// Check test file exists
const testPath = path.join(__dirname, 'tests', 'e2e', 'session-restore-full.spec.js');
if (fs.existsSync(testPath)) {
    console.log('✅ E2E test file exists');
    
    // Count test cases
    const testContent = fs.readFileSync(testPath, 'utf-8');
    const testMatches = testContent.match(/^\s*(?!\/\/)test\s*\(/gm);
    if (testMatches) {
        console.log(`   Found ${testMatches.length} test cases`);
    }
} else {
    console.log('❌ E2E test file not found');
    allMethodsPresent = false;
}

// Check CHANGELOG updated
const changelogPath = path.join(__dirname, 'CHANGELOG.md');
if (fs.existsSync(changelogPath)) {
    const changelogContent = fs.readFileSync(changelogPath, 'utf-8');
    if (changelogContent.includes('Session Restore on Load')) {
        console.log('✅ CHANGELOG.md updated with session restore entry');
    } else {
        console.log('⚠️  CHANGELOG.md may need session restore entry');
    }
}

console.log('\n' + '='.repeat(60));
if (allMethodsPresent) {
    console.log('✅ All required components are present!');
    console.log('\nNext steps:');
    console.log('  1. Run TypeScript check: npm run typecheck');
    console.log('  2. Run linting: npm run lint');
    console.log('  3. Run E2E tests: npm run test:e2e -- session-restore-full');
    console.log('  4. Manual testing with browser');
    process.exit(0);
} else {
    console.log('❌ Some required components are missing');
    process.exit(1);
}
