// End-to-end tests for menubar switching logic between Finder and Texteditor
const { test, expect } = require("@playwright/test");
const { waitForAppReady } = require("./utils");
const {
    clickDockIcon,
    expectMenuButton,
    expectMenuItem,
    bringModalToFront,
} = require("./utils");

test.describe("Menubar switches with active window (de-DE)", () => {
    test.use({ locale: "de-DE" });

    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + "/index.html");
        await waitForAppReady(page);
    });

    test("Finder menus appear when Finder is active", async ({ page }) => {
        // Open Finder from dock
        await clickDockIcon(page, "Finder Icon");
        // Ensure Finder is the active window before asserting menubar
        await bringModalToFront(page, "finder-modal");

        // Program label becomes "Finder"
        const finderButton = page.getByRole("button", { name: "Finder" });
        await finderButton.waitFor({ state: "visible", timeout: 10000 });
        await expect(finderButton).toBeVisible({ timeout: 10000 });

        // Finder menubar sections
        await expectMenuButton(page, "Ablage");
        await expectMenuButton(page, "Fenster");
        await expectMenuButton(page, "Hilfe");

        // Verify Finder-specific menu items in Ablage
        await expectMenuItem(page, "Ablage", "Neues Finder-Fenster");
        await expectMenuItem(page, "Ablage", "Finder neu laden");
        await expectMenuItem(page, "Ablage", "Fenster schließen");
    });

    test("Switch to Texteditor and back to Finder updates menubar", async ({
        page,
    }) => {
        // Open Texteditor
        await clickDockIcon(page, "Texteditor Icon");
        const textEditorButton = page.getByRole("button", {
            name: "Texteditor",
        });
        await textEditorButton.waitFor({ state: "visible", timeout: 10000 });
        await expect(textEditorButton).toBeVisible({ timeout: 10000 });

        // Texteditor menubar sections
        await expectMenuButton(page, "Ablage");
        await expectMenuButton(page, "Bearbeiten");
        await expectMenuButton(page, "Darstellung");
        await expectMenuButton(page, "Fenster");
        await expectMenuButton(page, "Hilfe");

        // Open Finder too
        await clickDockIcon(page, "Finder Icon");

        // Ensure Finder is actually the top-most by clicking its title bar
        await bringModalToFront(page, "finder-modal");

        // Program label switches to Finder
        await expect(
            page.getByRole("button", { name: "Finder" }),
        ).toBeVisible();

        // Back to Finder sections
        await expectMenuButton(page, "Ablage");
        await expectMenuButton(page, "Fenster");
        await expectMenuButton(page, "Hilfe");
    });
});
