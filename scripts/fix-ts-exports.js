/**
 * Post-processing script for TypeScript compiled output
 *
 * Problem: TypeScript generates `Object.defineProperty(exports, "__esModule", { value: true });`
 * even with "module": "none" in tsconfig, because we use `export {}` for global augmentation.
 *
 * Solution: Remove/comment out this line from generated JS files since we don't use CommonJS/ES modules
 * in the browser - all code runs as global scripts.
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

const EXPORTS_PATTERN = /^Object\.defineProperty\(exports, "__esModule", \{ value: true \}\);$/gm;
const REPLACEMENT =
    '// Object.defineProperty(exports, "__esModule", { value: true }); // REMOVED: Causes "exports is not defined" in browser';

let filesFixed = 0;
let filesSkipped = 0;

console.log('🔧 Fixing TypeScript exports...\n');

const files = collectJsFiles(path.join(process.cwd(), 'js'));
if (files.length === 0) {
    console.log('ℹ️  No JS files found under ./js');
}

files.forEach(fullPath => {
    const filePath = path.relative(process.cwd(), fullPath);

    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;

    content = content.replace(EXPORTS_PATTERN, REPLACEMENT);

    if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Fixed: ${filePath}`);
        filesFixed++;
    } else {
        console.log(`ℹ️  No changes: ${filePath}`);
        filesSkipped++;
    }
});

console.log(`\n📊 Summary: ${filesFixed} fixed, ${filesSkipped} skipped`);

if (filesFixed > 0) {
    console.log('✅ TypeScript exports fixed successfully');
}
