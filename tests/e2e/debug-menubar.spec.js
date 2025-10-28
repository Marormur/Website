// Debug test to check menubar rendering
const { test, expect } = require('@playwright/test');
const { waitForAppReady, clickDockIcon } = require('./utils');

test('Debug menubar rendering for Finder', async ({ page, baseURL }) => {
    // Capture console messages
    const consoleMessages = [];
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('render') || text.includes('menu') || text.includes('Menu')) {
            consoleMessages.push({ type: msg.type(), text });
        }
    });

    await page.goto(baseURL + '/index.html');
    await waitForAppReady(page);
    await page.waitForTimeout(500);

    console.log('=== Before opening Finder ===');
    const beforeOpen = await page.evaluate(() => {
        const menubar = document.getElementById('menubar-links');
        const buttons = menubar?.querySelectorAll('.menubar-item') || [];
        const buttonTexts = Array.from(buttons).map(b => b.textContent);
        
        return {
            menubarExists: !!menubar,
            buttonCount: buttons.length,
            buttonTexts,
            hasWindowButton: buttonTexts.some(t => /fenster|window/i.test(t)),
        };
    });
    console.log('Before:', JSON.stringify(beforeOpen, null, 2));

    // Open Finder from dock
    console.log('=== Opening Finder ===');
    await clickDockIcon(page, 'Finder Icon');
    await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);
    await page.waitForTimeout(500);

    console.log('=== After opening Finder ===');
    const afterOpen = await page.evaluate(() => {
        const menubar = document.getElementById('menubar-links');
        const buttons = menubar?.querySelectorAll('.menubar-item') || [];
        const buttonTexts = Array.from(buttons).map(b => b.textContent);
        
        return {
            menubarExists: !!menubar,
            buttonCount: buttons.length,
            buttonTexts,
            hasWindowButton: buttonTexts.some(t => /fenster|window/i.test(t)),
            topModal: window.WindowManager?.getTopWindow()?.id || null,
            hasMenuSystem: !!window.MenuSystem,
            hasRenderFunction: typeof window.MenuSystem?.renderApplicationMenu === 'function',
        };
    });
    console.log('After:', JSON.stringify(afterOpen, null, 2));

    // Print console messages
    console.log('=== Console messages ===');
    consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

    // Verify Window button exists
    expect(afterOpen.hasWindowButton).toBe(true);
});
