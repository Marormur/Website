#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');

const root = path.resolve(__dirname, '..');
const srcFile = path.join(root, 'index.html');
const outFile = path.join(root, 'index.fixed.html');

const src = fs.readFileSync(srcFile, 'utf8');

// Parse and serialize (will normalize and auto-close tags)
const document = parse5.parse(src, { sourceCodeLocationInfo: true });
const repaired = parse5.serialize(document);
fs.writeFileSync(outFile, repaired, 'utf8');
console.log('Wrote repaired file to', outFile);

// Run a simple audit on the repaired content (strip scripts/styles)
let clean = repaired.replace(/<script[\s\S]*?<\/script>/gi, '<script></script>');
clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '<style></style>');
const lines = clean.split(/\r?\n/);
let balance = 0;
const issues = [];
for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const opens = (l.match(/<div(\s|>)/g) || []).length;
    const closes = (l.match(/<\/div>/g) || []).length;
    balance += opens - closes;
    if (opens > 0 || closes > 0) issues.push({ line: i + 1, opens, closes, balanceAfter: balance });
}
console.log('Repaired file div open tags:', (clean.match(/<div(\s|>)/g) || []).length);
console.log('Repaired file div close tags:', (clean.match(/<\/div>/g) || []).length);
console.log('Repaired final balance (open - close):', balance);
if (balance === 0) {
    console.log('\nAudit: OK — div tags balanced.');
} else {
    console.log('\nAudit: NOT balanced. Significant lines (first 100):');
    issues
        .slice(0, 100)
        .forEach(it =>
            console.log(
                `  line ${it.line}: opens=${it.opens} closes=${it.closes} balanceAfter=${it.balanceAfter}`
            )
        );
}
