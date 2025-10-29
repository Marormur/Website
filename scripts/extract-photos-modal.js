/**
 * Extract Photos App modal HTML from PR branch and replace in index.html
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get old PR branch index.html
console.log('Extracting Photos modal from PR branch...');
const prIndexHtml = execSync('git show codex/create-custom-macos-photos-app:index.html', {
    encoding: 'utf8',
    cwd: __dirname
});

// Find the Photos modal boundaries
const startMarker = '<!-- Bildbetrachter Modal -->';
const endMarker = '<!-- Launchpad Modal -->';

const startIdx = prIndexHtml.indexOf(startMarker);
const endIdx = prIndexHtml.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find modal boundaries in PR branch');
    process.exit(1);
}

// Extract Photos modal (including start marker, excluding end marker)
const photosModal = prIndexHtml.substring(startIdx, endIdx).trim();
console.log(`Extracted ${photosModal.split('\n').length} lines of Photos modal HTML`);

// Read current index.html
const indexPath = path.join(__dirname, '..', 'index.html');
const currentIndex = fs.readFileSync(indexPath, 'utf8');

// Find current modal boundaries
const currentStartIdx = currentIndex.indexOf(startMarker);
const currentEndIdx = currentIndex.indexOf(endMarker);

if (currentStartIdx === -1 || currentEndIdx === -1) {
    console.error('Could not find modal boundaries in current index.html');
    process.exit(1);
}

// Replace old modal with new Photos modal
const before = currentIndex.substring(0, currentStartIdx);
const after = currentIndex.substring(currentEndIdx);
const newIndex = before + photosModal + '\n                        ' + after;

// Write updated index.html
fs.writeFileSync(indexPath, newIndex, 'utf8');
console.log('✓ Successfully replaced image-modal with Photos App modal');
console.log(`✓ Updated ${indexPath}`);

// Verify the change
const verification = fs.readFileSync(indexPath, 'utf8');
const hasPhotosElements = verification.includes('id="photos-sidebar"') &&
                          verification.includes('id="photos-gallery"') &&
                          verification.includes('data-photos-segment');

if (hasPhotosElements) {
    console.log('✓ Verification passed: Photos App elements found');
} else {
    console.error('⚠ Warning: Photos App elements not found in updated file');
}
