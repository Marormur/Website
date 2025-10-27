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

// Files that need fixing (add more as needed)
const FILES_TO_FIX = ['js/app-init.js', 'js/dialog-utils.js'];

const EXPORTS_PATTERN = /^Object\.defineProperty\(exports, "__esModule", \{ value: true \}\);$/gm;
const REPLACEMENT =
    '// Object.defineProperty(exports, "__esModule", { value: true }); // REMOVED: Causes "exports is not defined" in browser';

let filesFixed = 0;
let filesSkipped = 0;

console.log('🔧 Fixing TypeScript exports...\n');

FILES_TO_FIX.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  Skipped (not found): ${filePath}`);
        filesSkipped++;
        return;
    }

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
