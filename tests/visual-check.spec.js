// @ts-check
const { test, expect } = require("@playwright/test");
const { waitForAppReady } = require("./e2e/utils");

test("visual check: homepage in Firefox vs Chrome", async ({
    page,
    browserName,
}) => {
    await page.goto("/");
    await waitForAppReady(page);

    // Wait for critical elements
    await page.waitForSelector(".menubar", { state: "attached" });
    await page.waitForSelector("#dock", { state: "attached" });

    // Take full page screenshot
    await page.screenshot({
        path: `test-results/homepage-${browserName}-full.png`,
        fullPage: true,
    });

    // Take viewport screenshot for better detail
    await page.screenshot({
        path: `test-results/homepage-${browserName}-viewport.png`,
        fullPage: false,
    });

    // Check if critical elements are attached
    await expect(page.locator(".menubar")).toBeAttached();
    await expect(page.locator("#dock")).toBeAttached();
    await expect(page.locator(".desktop-area")).toBeAttached();

    // Check computed styles of menubar
    const menubarDisplay = await page
        .locator(".menubar")
        .evaluate((el) => window.getComputedStyle(el).display);
    const menubarBg = await page
        .locator(".menubar")
        .evaluate((el) => window.getComputedStyle(el).backgroundColor);

    console.log(
        `[${browserName}] menubar display: ${menubarDisplay}, background: ${menubarBg}`,
    );

    // Menubar should be flex (horizontal layout), not block (vertical)
    expect(menubarDisplay).toBe("flex");

    // Check if dock tray exists and has background
    const dockTray = await page.locator("#dock .dock-tray").count();
    console.log(`[${browserName}] dock-tray elements found: ${dockTray}`);

    if (dockTray > 0) {
        const dockBg = await page
            .locator("#dock .dock-tray")
            .first()
            .evaluate((el) => window.getComputedStyle(el).backgroundColor);
        console.log(`[${browserName}] dock background: ${dockBg}`);
    }
});
