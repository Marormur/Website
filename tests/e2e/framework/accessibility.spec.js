const { test, expect } = require('@playwright/test');

test.describe('Accessibility Utils', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('http://127.0.0.1:5173');
		await page.waitForFunction(() => window.__APP_READY === true);
	});

	test('should apply ARIA attributes', async ({ page }) => {
		const result = await page.evaluate(() => {
			const { applyAriaAttributes } = window.MacUI;
			const element = document.createElement('div');
			
			applyAriaAttributes(element, {
				role: 'button',
				'aria-label': 'Test Button',
				'aria-pressed': false,
			});

			return {
				role: element.getAttribute('role'),
				label: element.getAttribute('aria-label'),
				pressed: element.getAttribute('aria-pressed'),
			};
		});

		expect(result.role).toBe('button');
		expect(result.label).toBe('Test Button');
		expect(result.pressed).toBe('false');
	});

	test('should make element focusable', async ({ page }) => {
		const result = await page.evaluate(() => {
			const { makeFocusable, makeUnfocusable } = window.MacUI;
			const element = document.createElement('div');
			
			makeFocusable(element);
			const focusableTabIndex = element.getAttribute('tabindex');
			
			makeUnfocusable(element);
			const unfocusableTabIndex = element.getAttribute('tabindex');

			return { focusableTabIndex, unfocusableTabIndex };
		});

		expect(result.focusableTabIndex).toBe('0');
		expect(result.unfocusableTabIndex).toBe('-1');
	});

	test('should create FocusTrap', async ({ page }) => {
		const result = await page.evaluate(() => {
			const { FocusTrap } = window.MacUI;
			const container = document.createElement('div');
			const button1 = document.createElement('button');
			const button2 = document.createElement('button');
			
			container.appendChild(button1);
			container.appendChild(button2);
			document.body.appendChild(container);

			const trap = new FocusTrap(container);
			trap.activate();

			const hasFocus = document.activeElement === button1;

			trap.deactivate();
			document.body.removeChild(container);

			return { hasFocus };
		});

		expect(result.hasFocus).toBe(true);
	});

	test('should handle keyboard navigation', async ({ page }) => {
		const result = await page.evaluate(() => {
			const { KeyboardNavigation } = window.MacUI;
			const elements = [
				document.createElement('button'),
				document.createElement('button'),
				document.createElement('button'),
			];

			const nav = new KeyboardNavigation(elements, 'vertical');
			
			nav.next();
			const index1 = nav.getCurrentIndex();
			
			nav.next();
			const index2 = nav.getCurrentIndex();
			
			nav.previous();
			const index3 = nav.getCurrentIndex();
			
			nav.first();
			const index4 = nav.getCurrentIndex();
			
			nav.last();
			const index5 = nav.getCurrentIndex();

			return { index1, index2, index3, index4, index5 };
		});

		expect(result.index1).toBe(0);
		expect(result.index2).toBe(1);
		expect(result.index3).toBe(0);
		expect(result.index4).toBe(0);
		expect(result.index5).toBe(2);
	});

	test('should have accessibility CSS styles', async ({ page }) => {
		const exists = await page.evaluate(() => {
			return document.getElementById('macui-a11y-styles') !== null;
		});

		expect(exists).toBe(true);
	});
});
