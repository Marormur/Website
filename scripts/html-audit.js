#!/usr/bin/env node
// Simple report-only HTML audit for mismatched <div> tags and modal nesting
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'index.html');
const src = fs.readFileSync(file, 'utf8');
const lines = src.split(/\r?\n/);

let balance = 0;
const issues = [];
for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const opens = (l.match(/<div(\s|>)/g) || []).length;
    const closes = (l.match(/<\/div>/g) || []).length;
    const prev = balance;
    balance += opens - closes;
    if (opens > 0 || closes > 0) {
        issues.push({ line: i + 1, opens, closes, balanceAfter: balance });
    }
}

console.log('HTML Audit Report for index.html');
console.log('  div open tags found:', (src.match(/<div(\s|>)/g) || []).length);
console.log('  div close tags found:', (src.match(/<\/div>/g) || []).length);
console.log('  final balance (open - close):', balance);
console.log('--- Significant lines (where opens or closes occur):');
issues.slice(0, 200).forEach(it => {
    if (it.opens || it.closes) {
        console.log(
            `  line ${it.line}: opens=${it.opens} closes=${it.closes} balanceAfter=${it.balanceAfter}`
        );
    }
});

// Check modal nesting: list modal elements and their approximate line
const modalRegex = /<div[^>]*class="[^"]*modal[^"]*"[^>]*>/g;
let m;
const modals = [];
while ((m = modalRegex.exec(src)) !== null) {
    const idx = m.index;
    const before = src.slice(0, idx);
    const line = before.split(/\r?\n/).length;
    const snippet = m[0].replace(/\s+/g, ' ').slice(0, 120);
    modals.push({ line, snippet });
}

console.log('--- Modal elements found:');
modals.forEach(mm => console.log(`  line ${mm.line}: ${mm.snippet}`));

if (balance !== 0) {
    console.log('\nAudit summary: Unmatched <div> tags detected.');
    console.log(
        'Suggested action: review the reported lines and correct missing closing tags or extra openings.'
    );
    process.exitCode = 2;
} else {
    console.log('\nAudit summary: div tags appear balanced (balance=0).');
}
