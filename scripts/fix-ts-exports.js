/**
 * Post-processing script for TypeScript compiled output
 *
 * Problem: TypeScript generates CommonJS export code even with "module": "none"
 * when source files contain `export` statements.
 *
 * Solution: Add a simple exports object stub at the TOP of each file that has exports,
 * BEFORE 'use strict'. This allows the export assignments to work without errors,
 * while the actual exports are exposed via window.* assignments at the end of each file.
 *
 * This script runs automatically after `npm run build:ts`
 */

const fs = require('fs');
const path = require('path');

// Recursively collect all JS files under the provided directory
function collectJsFiles(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...collectJsFiles(full));
        } else if (entry.isFile() && full.endsWith('.js')) {
            results.push(full);
        }
    }
    return results;
}

let filesProcessed = 0;
let filesSkipped = 0;

console.log('🔧 Adding exports stub to TypeScript-compiled files...\n');

const files = collectJsFiles(path.join(process.cwd(), 'js'));
if (files.length === 0) {
    console.log('ℹ️  No JS files found under ./js');
}

files.forEach(fullPath => {
    const filePath = path.relative(process.cwd(), fullPath);

    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;

    // Check if file has exports references
    const hasExports = content.includes('Object.defineProperty(exports,') || 
                       /^exports\.\w+\s*=/m.test(content);

    if (!hasExports) {
        filesSkipped++;
        return;
    }

    // Check if we've already added the stub
    if (content.includes('/* EXPORTS STUB FOR BROWSER */')) {
        filesSkipped++;
        return;
    }

    // Add exports stub at the very beginning, before 'use strict'
    const exportsStub = `/* EXPORTS STUB FOR BROWSER */
var exports = {};
`;

    content = exportsStub + content;

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Added exports stub to: ${filePath}`);
    filesProcessed++;
});

console.log(`\n📊 Summary: ${filesProcessed} processed, ${filesSkipped} skipped`);

if (filesProcessed > 0) {
    console.log('✅ Exports stubs added successfully');
    console.log('ℹ️  Modules still export via window.* assignments');
}



