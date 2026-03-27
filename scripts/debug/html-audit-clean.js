#!/usr/bin/env node
// HTML audit that strips <script> and <style> contents before counting <div> tags
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');

const file = path.resolve(__dirname, '..', 'index.html');
let src = fs.readFileSync(file, 'utf8');

// Remove script/style text via AST traversal to avoid regex-based tag filtering.
const parsed = parse5.parse(src);
const stripScriptAndStyleChildren = node => {
    if (!node || !node.childNodes) return;
    if (node.tagName === 'script' || node.tagName === 'style') {
        node.childNodes = [];
        return;
    }
    node.childNodes.forEach(stripScriptAndStyleChildren);
};
stripScriptAndStyleChildren(parsed);
src = parse5.serialize(parsed);

const lines = src.split(/\r?\n/);

let balance = 0;
const issues = [];
for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const opens = (l.match(/<div(\s|>)/g) || []).length;
    const closes = (l.match(/<\/div>/g) || []).length;
    balance += opens - closes;
    if (opens > 0 || closes > 0) {
        issues.push({ line: i + 1, opens, closes, balanceAfter: balance });
    }
}

console.log('Clean HTML Audit Report for index.html');
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
