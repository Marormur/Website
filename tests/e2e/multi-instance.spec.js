/**
 * Multi-Instance E2E Tests
 *
 * Tests für das neue Multi-Instance Window System
 */

import { test, expect } from "@playwright/test";

test.describe("Multi-Instance Window System", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForLoadState("domcontentloaded");
        await page.waitForFunction(() => window.__APP_READY === true, {
            timeout: 15000,
        });
    });

    test("BaseWindowInstance class is available", async ({ page }) => {
        const hasBaseWindowInstance = await page.evaluate(() => {
            return typeof window.BaseWindowInstance === "function";
        });

        expect(hasBaseWindowInstance).toBe(true);
    });

    test("InstanceManager class is available", async ({ page }) => {
        const hasInstanceManager = await page.evaluate(() => {
            return typeof window.InstanceManager === "function";
        });

        expect(hasInstanceManager).toBe(true);
    });

    test("WindowChrome is available", async ({ page }) => {
        const hasWindowChrome = await page.evaluate(() => {
            return typeof window.WindowChrome === "object";
        });

        expect(hasWindowChrome).toBe(true);
    });

    test("TerminalInstanceManager is initialized", async ({ page }) => {
        const hasTerminalInstanceManager = await page.evaluate(() => {
            return (
                window.TerminalInstanceManager instanceof window.InstanceManager
            );
        });

        expect(hasTerminalInstanceManager).toBe(true);
    });

    test("TextEditorInstanceManager is initialized", async ({ page }) => {
        const hasTextEditorInstanceManager = await page.evaluate(() => {
            return (
                window.TextEditorInstanceManager instanceof
                window.InstanceManager
            );
        });

        expect(hasTextEditorInstanceManager).toBe(true);
    });
});

test.describe("Terminal Multi-Instance", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForLoadState("domcontentloaded");
        await page.waitForFunction(() => window.__APP_READY === true, {
            timeout: 15000,
        });
    });

    test("can create multiple terminal instances", async ({ page }) => {
        const result = await page.evaluate(() => {
            const manager = window.TerminalInstanceManager;

            // Create two terminal instances
            const terminal1 = manager.createInstance({ title: "Terminal 1" });
            const terminal2 = manager.createInstance({ title: "Terminal 2" });

            return {
                instanceCount: manager.getInstanceCount(),
                hasTerminal1: terminal1 !== null,
                hasTerminal2: terminal2 !== null,
                terminal1Id: terminal1?.instanceId,
                terminal2Id: terminal2?.instanceId,
                areDifferent: terminal1?.instanceId !== terminal2?.instanceId,
            };
        });

        expect(result.instanceCount).toBe(2);
        expect(result.hasTerminal1).toBe(true);
        expect(result.hasTerminal2).toBe(true);
        expect(result.areDifferent).toBe(true);
    });

    test("terminal instances have isolated state", async ({ page }) => {
        const result = await page.evaluate(() => {
            const manager = window.TerminalInstanceManager;

            const terminal1 = manager.createInstance({ title: "Terminal 1" });
            const terminal2 = manager.createInstance({ title: "Terminal 2" });

            // Each should have its own command history
            terminal1.commandHistory.push("ls");
            terminal2.commandHistory.push("pwd");

            return {
                terminal1History: terminal1.commandHistory,
                terminal2History: terminal2.commandHistory,
                areIsolated:
                    terminal1.commandHistory.length === 1 &&
                    terminal2.commandHistory.length === 1 &&
                    terminal1.commandHistory[0] !== terminal2.commandHistory[0],
            };
        });

        expect(result.areIsolated).toBe(true);
        expect(result.terminal1History).toEqual(["ls"]);
        expect(result.terminal2History).toEqual(["pwd"]);
    });

    test("can destroy terminal instance", async ({ page }) => {
        const result = await page.evaluate(() => {
            const manager = window.TerminalInstanceManager;

            const terminal1 = manager.createInstance({ title: "Terminal 1" });
            const terminal2 = manager.createInstance({ title: "Terminal 2" });
            const terminal1Id = terminal1.instanceId;

            const countBefore = manager.getInstanceCount();

            // Destroy terminal1
            manager.destroyInstance(terminal1Id);

            const countAfter = manager.getInstanceCount();
            const stillExists = manager.getInstance(terminal1Id);

            return {
                countBefore,
                countAfter,
                stillExists: stillExists !== null,
            };
        });

        expect(result.countBefore).toBe(2);
        expect(result.countAfter).toBe(1);
        expect(result.stillExists).toBe(false);
    });

    test("terminal instance can serialize and deserialize", async ({
        page,
    }) => {
        const result = await page.evaluate(() => {
            const manager = window.TerminalInstanceManager;

            const terminal = manager.createInstance({ title: "Terminal Test" });
            terminal.currentPath = "/home/user";
            terminal.commandHistory = ["ls", "pwd", "cd documents"];

            // Serialize
            const serialized = terminal.serialize();

            // Create new instance and deserialize
            const terminal2 = manager.createInstance({
                title: "Terminal Test 2",
            });
            terminal2.deserialize(serialized);

            return {
                originalPath: terminal.currentPath,
                restoredPath: terminal2.currentPath,
                originalHistory: terminal.commandHistory,
                restoredHistory: terminal2.commandHistory,
                matches:
                    terminal.currentPath === terminal2.currentPath &&
                    JSON.stringify(terminal.commandHistory) ===
                        JSON.stringify(terminal2.commandHistory),
            };
        });

        expect(result.matches).toBe(true);
        expect(result.restoredPath).toBe("/home/user");
        expect(result.restoredHistory).toEqual(["ls", "pwd", "cd documents"]);
    });
});

test.describe("TextEditor Multi-Instance", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForLoadState("domcontentloaded");
        await page.waitForFunction(() => window.__APP_READY === true, {
            timeout: 15000,
        });
    });

    test("can create multiple text editor instances", async ({ page }) => {
        const result = await page.evaluate(() => {
            const manager = window.TextEditorInstanceManager;

            const editor1 = manager.createInstance({ title: "Document 1" });
            const editor2 = manager.createInstance({ title: "Document 2" });

            return {
                instanceCount: manager.getInstanceCount(),
                hasEditor1: editor1 !== null,
                hasEditor2: editor2 !== null,
                areDifferent: editor1?.instanceId !== editor2?.instanceId,
            };
        });

        expect(result.instanceCount).toBe(2);
        expect(result.hasEditor1).toBe(true);
        expect(result.hasEditor2).toBe(true);
        expect(result.areDifferent).toBe(true);
    });

    test("text editor instances have isolated content", async ({ page }) => {
        const result = await page.evaluate(() => {
            const manager = window.TextEditorInstanceManager;

            const editor1 = manager.createInstance({
                title: "Document 1",
                initialState: { content: "Content for document 1" },
            });

            const editor2 = manager.createInstance({
                title: "Document 2",
                initialState: { content: "Content for document 2" },
            });

            return {
                content1: editor1.state.content,
                content2: editor2.state.content,
                areIsolated: editor1.state.content !== editor2.state.content,
            };
        });

        expect(result.areIsolated).toBe(true);
        expect(result.content1).toBe("Content for document 1");
        expect(result.content2).toBe("Content for document 2");
    });

    test("text editor can track dirty state independently", async ({
        page,
    }) => {
        const result = await page.evaluate(() => {
            const manager = window.TextEditorInstanceManager;

            const editor1 = manager.createInstance({ title: "Doc 1" });
            const editor2 = manager.createInstance({ title: "Doc 2" });

            // Mark editor1 as dirty
            editor1.isDirty = true;

            return {
                editor1Dirty: editor1.isDirty,
                editor2Dirty: editor2.isDirty,
                isolated: editor1.isDirty !== editor2.isDirty,
            };
        });

        expect(result.isolated).toBe(true);
        expect(result.editor1Dirty).toBe(true);
        expect(result.editor2Dirty).toBe(false);
    });

    test("text editor instance can serialize content", async ({ page }) => {
        const result = await page.evaluate(() => {
            const manager = window.TextEditorInstanceManager;

            const editor = manager.createInstance({
                title: "Test Document",
                initialState: {
                    content: "Hello World!",
                    filename: "test.txt",
                },
            });

            editor.currentFilename = "test.txt";

            const serialized = editor.serialize();

            return {
                hasContent: serialized.state.content === "Hello World!",
                hasFilename: serialized.state.filename === "test.txt",
                hasTitle: serialized.title === "Test Document",
                hasType: serialized.type === "text-editor",
            };
        });

        expect(result.hasContent).toBe(true);
        expect(result.hasFilename).toBe(true);
        expect(result.hasTitle).toBe(true);
        expect(result.hasType).toBe(true);
    });
});

test.describe("WindowChrome Components", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForLoadState("domcontentloaded");
        await page.waitForFunction(() => window.__APP_READY === true, {
            timeout: 15000,
        });
    });

    test("can create titlebar", async ({ page }) => {
        const result = await page.evaluate(() => {
            const titlebar = window.WindowChrome.createTitlebar({
                title: "Test Window",
                icon: "💻",
                showClose: true,
            });

            return {
                hasElement: titlebar instanceof HTMLElement,
                hasTitle: titlebar.textContent.includes("Test Window"),
                className: titlebar.className,
            };
        });

        expect(result.hasElement).toBe(true);
        expect(result.hasTitle).toBe(true);
        expect(result.className).toContain("window-titlebar");
    });

    test("can create toolbar", async ({ page }) => {
        const result = await page.evaluate(() => {
            const toolbar = window.WindowChrome.createToolbar([
                { label: "New", action: "new" },
                { type: "separator" },
                { label: "Save", action: "save" },
            ]);

            return {
                hasElement: toolbar instanceof HTMLElement,
                hasButtons:
                    toolbar.querySelectorAll(".toolbar-btn").length === 2,
                hasSeparator:
                    toolbar.querySelector(".toolbar-separator") !== null,
            };
        });

        expect(result.hasElement).toBe(true);
        expect(result.hasButtons).toBe(true);
        expect(result.hasSeparator).toBe(true);
    });

    test("can create status bar", async ({ page }) => {
        const result = await page.evaluate(() => {
            const statusBar = window.WindowChrome.createStatusBar({
                leftContent: "Ready",
                rightContent: "Line 1, Col 1",
            });

            return {
                hasElement: statusBar instanceof HTMLElement,
                hasLeft: statusBar.textContent.includes("Ready"),
                hasRight: statusBar.textContent.includes("Line 1, Col 1"),
            };
        });

        expect(result.hasElement).toBe(true);
        expect(result.hasLeft).toBe(true);
        expect(result.hasRight).toBe(true);
    });

    test("can update titlebar title", async ({ page }) => {
        const result = await page.evaluate(() => {
            const titlebar = window.WindowChrome.createTitlebar({
                title: "Original Title",
                icon: "💻",
            });

            window.WindowChrome.updateTitle(titlebar, "Updated Title");

            return {
                hasUpdated: titlebar.textContent.includes("Updated Title"),
                noOriginal: !titlebar.textContent.includes("Original Title"),
            };
        });

        expect(result.hasUpdated).toBe(true);
        expect(result.noOriginal).toBe(true);
    });
});

test.describe("Instance Manager Features", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForLoadState("domcontentloaded");
        await page.waitForFunction(() => window.__APP_READY === true, {
            timeout: 15000,
        });
    });

    test("respects max instances limit", async ({ page }) => {
        const result = await page.evaluate(() => {
            // Provide a minimal subclass that implements render to avoid BaseWindowInstance error
            class TestInstance extends window.BaseWindowInstance {
                render() {
                    this.windowElement = document.createElement('div');
                    this.windowElement.textContent = this.title;
                    if (this.container) this.container.appendChild(this.windowElement);
                }
            }

            const limitedManager = new window.InstanceManager({
                type: 'test',
                instanceClass: TestInstance,
                maxInstances: 2,
            });

            const _i1 = limitedManager.createInstance({ title: 'Test 1' });
            const _i2 = limitedManager.createInstance({ title: 'Test 2' });
            const i3 = limitedManager.createInstance({ title: 'Test 3' });

            return {
                count: limitedManager.getInstanceCount(),
                instance3Created: i3 !== null,
            };
        });

        expect(result.count).toBe(2);
        expect(result.instance3Created).toBe(false);
    });

    test("tracks active instance", async ({ page }) => {
        const result = await page.evaluate(() => {
            const manager = window.TerminalInstanceManager;

            const terminal1 = manager.createInstance({ title: "Terminal 1" });
            const terminal2 = manager.createInstance({ title: "Terminal 2" });

            // Terminal 2 should be active (last created)
            const activeAfterCreate = manager.getActiveInstance();

            // Set terminal1 as active
            manager.setActiveInstance(terminal1.instanceId);
            const activeAfterSet = manager.getActiveInstance();

            return {
                activeAfterCreateId: activeAfterCreate?.instanceId,
                activeAfterSetId: activeAfterSet?.instanceId,
                isTerminal2:
                    activeAfterCreate?.instanceId === terminal2.instanceId,
                isTerminal1:
                    activeAfterSet?.instanceId === terminal1.instanceId,
            };
        });

        expect(result.isTerminal2).toBe(true);
        expect(result.isTerminal1).toBe(true);
    });

    test("can serialize and deserialize all instances", async ({ page }) => {
        const result = await page.evaluate(() => {
            const manager = window.TerminalInstanceManager;

            // Clear any existing instances
            manager.destroyAllInstances();

            // Create instances
            const term1 = manager.createInstance({ title: "Terminal 1" });
            const term2 = manager.createInstance({ title: "Terminal 2" });

            term1.currentPath = "/home";
            term2.currentPath = "/var";

            // Serialize all
            const serialized = manager.serializeAll();

            // Clear instances
            manager.destroyAllInstances();

            // Deserialize
            manager.deserializeAll(serialized);

            const allInstances = manager.getAllInstances();

            return {
                serializedCount: serialized.length,
                restoredCount: allInstances.length,
                instance0Path: allInstances[0]?.currentPath,
                instance1Path: allInstances[1]?.currentPath,
            };
        });

        expect(result.serializedCount).toBe(2);
        expect(result.restoredCount).toBe(2);
        expect(["/home", "/var"]).toContain(result.instance0Path);
        expect(["/home", "/var"]).toContain(result.instance1Path);
    });
});
