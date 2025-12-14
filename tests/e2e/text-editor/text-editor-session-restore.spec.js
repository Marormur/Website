// E2E test to ensure TextEditorInstanceManager exists and can manage instances
const { test, expect } = require('@playwright/test');
const { waitForAppReady, clickDockIcon } = require('../utils');

test.describe('TextEditor Instance Manager Availability', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('TextEditorInstanceManager exists on window after app init', async ({ page }) => {
        // Verify TextEditorInstanceManager is available
        const hasManager = await page.evaluate(() => {
            return typeof window.TextEditorInstanceManager !== 'undefined';
        });
        expect(hasManager).toBe(true);
    });

    test('can create and retrieve TextEditor instances via manager', async ({ page }) => {
        // Open TextEditor
        await clickDockIcon(page, 'text-modal');
        await expect(page.locator('#text-modal')).not.toHaveClass(/hidden/);

        // Create an instance and retrieve it
        const instResult = await page.evaluate(() => {
            const manager = window.TextEditorInstanceManager;
            if (!manager || typeof manager.createInstance !== 'function') return null;

            const inst = manager.createInstance({ title: 'Test Doc' });
            if (!inst) return null;

            return {
                created: !!inst,
                instanceId: inst.instanceId,
                hasTitle: !!inst.title,
            };
        });

        expect(instResult).not.toBeNull();
        expect(instResult.created).toBe(true);
        expect(instResult.instanceId).toBeTruthy();
    });

    test('can set and get active instance', async ({ page }) => {
        // Create two instances
        const result = await page.evaluate(() => {
            const manager = window.TextEditorInstanceManager;
            if (!manager) return { error: 'no manager' };

            // Create first instance
            const inst1 = manager.createInstance({ title: 'Doc 1' });
            if (!inst1) return { error: 'failed to create inst1' };

            // Create second instance
            const inst2 = manager.createInstance({ title: 'Doc 2' });
            if (!inst2) return { error: 'failed to create inst2' };

            // Get current active
            const active1 = manager.getActiveInstance();
            if (!active1) return { error: 'no active instance after creation' };

            // Set first as active
            manager.setActiveInstance(inst1.instanceId);
            const active2 = manager.getActiveInstance();

            return {
                success: active2?.instanceId === inst1.instanceId,
                activeId: active2?.instanceId,
                expectedId: inst1.instanceId,
            };
        });

        expect(result.success).toBe(true);
        expect(result.activeId).toBe(result.expectedId);
    });
});
