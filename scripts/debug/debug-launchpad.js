(async () => {
    const { chromium } = require('playwright');
    const url = process.argv[2] || 'http://127.0.0.1:5173/';
    console.log('Navigating to', url);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url);
    // wait for app ready
    await page.waitForFunction(() => window.__APP_READY === true);
    console.log('__APP_READY detected');

    // Ensure dock exists
    const dockSel = '#dock .dock-item[data-window-id="launchpad-modal"]';
    await page.waitForSelector(dockSel, { timeout: 5000 });
    console.log('Clicking launchpad dock item...');
    await page.click(dockSel);

    // Give time for animations/JS
    await page.waitForTimeout(250);

    const info = await page.evaluate(() => {
        const viewport = {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            docClientWidth: document.documentElement.clientWidth,
            docClientHeight: document.documentElement.clientHeight,
            bodyClientWidth: document.body.clientWidth,
            bodyClientHeight: document.body.clientHeight,
        };
        const body = document.body || document.documentElement;
        const bodyCS = window.getComputedStyle(body);
        const html = document.documentElement;
        const htmlCS = window.getComputedStyle(html);

        const listStylesheets = () => {
            const sheets = [];
            for (const s of Array.from(document.styleSheets || [])) {
                try {
                    sheets.push({
                        href: s.href || null,
                        rules: s.cssRules ? s.cssRules.length : null,
                    });
                } catch (e) {
                    sheets.push({ href: s.href || null, rules: null, error: e && e.message });
                }
            }
            return sheets;
        };

        const grab = id => {
            const el = document.getElementById(id);
            if (!el) return null;
            const cs = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            const inlineStyle = el.getAttribute('style') || null;
            const parents = [];
            let p = el.parentElement;
            while (p) {
                parents.push({
                    tag: p.tagName,
                    id: p.id || null,
                    className: p.className || null,
                    display: window.getComputedStyle(p).display,
                    visibility: window.getComputedStyle(p).visibility,
                });
                p = p.parentElement;
            }
            return {
                id,
                tag: el.tagName,
                className: el.className,
                inlineStyle,
                display: cs.display,
                visibility: cs.visibility,
                opacity: cs.opacity,
                transform: cs.transform,
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                offsetParent: el.offsetParent
                    ? { tag: el.offsetParent.tagName, id: el.offsetParent.id || null }
                    : null,
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight,
                parents,
            };
        };

        return {
            viewport,
            stylesheets: listStylesheets(),
            bodyInlineStyle: document.body ? document.body.getAttribute('style') : null,
            htmlInlineStyle: document.documentElement
                ? document.documentElement.getAttribute('style')
                : null,
            bodyComputed: {
                display: bodyCS.display,
                height: bodyCS.height,
                margin: bodyCS.margin,
                position: bodyCS.position,
                overflow: bodyCS.overflow,
                transform: bodyCS.transform,
            },
            htmlComputed: {
                display: htmlCS.display,
                height: htmlCS.height,
                margin: htmlCS.margin,
                position: htmlCS.position,
                overflow: htmlCS.overflow,
                transform: htmlCS.transform,
            },
            launchpadModal: grab('launchpad-modal'),
            launchpadInner: (function () {
                const el = document.querySelector('.launchpad-modal-inner');
                if (!el) return null;
                const cs = window.getComputedStyle(el);
                const r = el.getBoundingClientRect();
                return {
                    tag: el.tagName,
                    className: el.className,
                    inlineStyle: el.getAttribute('style') || null,
                    display: cs.display,
                    visibility: cs.visibility,
                    transform: cs.transform,
                    width: Math.round(r.width),
                    height: Math.round(r.height),
                    scrollHeight: el.scrollHeight,
                    clientHeight: el.clientHeight,
                };
            })(),
            appsGrid: (function () {
                const el = document.getElementById('launchpad-apps-grid');
                if (!el) return null;
                const cs = window.getComputedStyle(el);
                const r = el.getBoundingClientRect();
                return {
                    id: 'launchpad-apps-grid',
                    tag: el.tagName,
                    className: el.className,
                    inlineStyle: el.getAttribute('style') || null,
                    display: cs.display,
                    visibility: cs.visibility,
                    transform: cs.transform,
                    width: Math.round(r.width),
                    height: Math.round(r.height),
                    scrollHeight: el.scrollHeight,
                    clientHeight: el.clientHeight,
                };
            })(),
            launchpadContainer: (function () {
                const el = document.getElementById('launchpad-container');
                if (!el) return null;
                const cs = window.getComputedStyle(el);
                const r = el.getBoundingClientRect();
                return {
                    id: 'launchpad-container',
                    tag: el.tagName,
                    className: el.className,
                    inlineStyle: el.getAttribute('style') || null,
                    display: cs.display,
                    visibility: cs.visibility,
                    transform: cs.transform,
                    width: Math.round(r.width),
                    height: Math.round(r.height),
                    scrollHeight: el.scrollHeight,
                    clientHeight: el.clientHeight,
                };
            })(),
        };
    });

    console.log('Result:', JSON.stringify(info, null, 2));
    // Attempt background click to test close behavior and report classes
    try {
        const beforeClass = await page.$eval('#launchpad-modal', el => el.className);
        console.log('launchpad-class-before-click:', beforeClass);
        await page.click('#launchpad-modal', { position: { x: 10, y: 10 } });
        await page.waitForTimeout(200);
        const afterClass = await page.$eval('#launchpad-modal', el => el.className);
        console.log('launchpad-class-after-click:', afterClass);
    } catch (e) {
        console.warn('Background click test failed:', e && e.message);
    }
    await browser.close();
})();
