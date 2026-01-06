const { test, expect } = require('@playwright/test');

test.describe('MacUI Framework - Button Component', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForFunction(() => window.__APP_READY);
    });

    test('Button renders with label', async ({ page }) => {
        const buttonText = await page.evaluate(() => {
            const { Button } = window.MacUI;
            const container = document.createElement('div');
            container.id = 'test-container';
            document.body.appendChild(container);

            const btn = new Button({ label: 'Click Me' });
            btn.mount(container);

            return container.querySelector('.macui-button')?.textContent;
        });

        expect(buttonText).toContain('Click Me');
    });

    test('Button handles click events', async ({ page }) => {
        const clicked = await page.evaluate(() => {
            return new Promise(resolve => {
                const { Button } = window.MacUI;
                const container = document.createElement('div');
                container.id = 'test-container';
                document.body.appendChild(container);

                let wasClicked = false;
                const btn = new Button({
                    label: 'Click',
                    onClick: () => {
                        wasClicked = true;
                    },
                });
                btn.mount(container);

                const buttonEl = container.querySelector('.macui-button');
                if (buttonEl) {
                    buttonEl.click();
                }
                resolve(wasClicked);
            });
        });

        expect(clicked).toBe(true);
    });

    test('Button renders with different variants', async ({ page }) => {
        const variants = await page.evaluate(() => {
            const { Button } = window.MacUI;
            const container = document.createElement('div');
            container.id = 'test-container';
            document.body.appendChild(container);

            const results = [];
            ['primary', 'secondary', 'danger', 'ghost'].forEach(variant => {
                const btn = new Button({ label: 'Test', variant });
                const el = btn.mount();
                results.push(el.getAttribute('data-variant'));
            });

            return results;
        });

        expect(variants).toEqual(['primary', 'secondary', 'danger', 'ghost']);
    });
});
