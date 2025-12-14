/**
 * Centralized z-index and top-window manager shared across legacy modals and the
 * multi-window system. This is the single source of truth for stacking order.
 *
 * Responsibilities:
 * - Maintain an ordered window stack (bottom -> top)
 * - Assign clamped z-index values to DOM nodes
 * - Expose top-window lookup without duplicating logic in WindowManager/Registry
 * - Persist a compatible __zIndexManager on window for existing consumers/tests
 */

export interface ZIndexManager {
    bringToFront(
        windowId: string,
        modal?: HTMLElement | null,
        windowEl?: HTMLElement | null
    ): number;
    removeWindow(windowId: string): void;
    getWindowStack(): string[];
    restoreWindowStack(stack: string[]): void;
    reset(): void;
    getTopWindowId(): string | null;
    getTopWindowElement(): HTMLElement | null;
    getTopZIndex(): number;
    bumpZIndex(): number;
    ensureTopZIndex(z: number): number;
    syncFromDOM(): number;
}

export const BASE_Z_INDEX = 1000;
const MAX_WINDOW_Z_INDEX = 2147483500; // Below Dock (2147483550) and Launchpad (2147483600)

type MaybeZIndexManager = Partial<ZIndexManager> & { [key: string]: unknown };

type StackAware = {
    windowStack: string[];
    externalTopZ: number;
};

function clamp(z: number): number {
    return Math.min(z, MAX_WINDOW_Z_INDEX);
}

function applyZIndex(
    windowId: string,
    zIndex: number,
    modal?: HTMLElement | null,
    windowEl?: HTMLElement | null
): void {
    const targets: Array<HTMLElement | null> = [];
    if (modal) targets.push(modal);
    if (windowEl && windowEl !== modal) targets.push(windowEl);

    const element = modal || document.getElementById(windowId);
    if (element && !targets.includes(element)) targets.push(element);
    const autoPointer = element?.querySelector?.('.autopointer') as HTMLElement | null;
    if (autoPointer && !targets.includes(autoPointer)) targets.push(autoPointer);
    const contentEl = element?.querySelector?.('.window-container') as HTMLElement | null;
    if (contentEl && !targets.includes(contentEl)) targets.push(contentEl);

    targets.forEach(target => {
        if (!target) return;
        target.style.zIndex = zIndex.toString();
    });
}

function pruneHiddenOrMissing(stack: string[]): string[] {
    for (let i = stack.length - 1; i >= 0; i -= 1) {
        const id = stack[i];
        if (!id) {
            stack.splice(i, 1);
            continue;
        }
        const el = document.getElementById(id);
        if (!el || el.classList.contains('hidden')) {
            stack.splice(i, 1);
        }
    }
    return stack;
}

function findTopVisibleModal(): HTMLElement | null {
    let top: HTMLElement | null = null;
    let highest = 0;
    document.querySelectorAll<HTMLElement>('.modal:not(.hidden)').forEach(modal => {
        const z = parseInt(getComputedStyle(modal).zIndex, 10) || 0;
        if (z > highest) {
            highest = z;
            top = modal;
        }
    });
    return top;
}

function getState(existing: MaybeZIndexManager | undefined): StackAware {
    // If an older manager exists, reuse its stack to preserve ordering during hot reloads
    const windowStack = existing?.getWindowStack?.() || [];
    const externalTopZ = BASE_Z_INDEX;
    return { windowStack: [...windowStack], externalTopZ };
}

export function getZIndexManager(): ZIndexManager {
    const win = window as unknown as {
        __zIndexManager?: MaybeZIndexManager | ZIndexManager;
        topZIndex?: number;
        __topZIndexRaw?: number;
    };
    const existing = win.__zIndexManager as MaybeZIndexManager | undefined;
    const initialTopZ = existing?.getTopZIndex?.() ?? BASE_Z_INDEX;
    const topZStore = {
        value: clamp(initialTopZ),
    };
    const setTopZStore = (v: number) => {
        topZStore.value = clamp(v);
        // Keep a raw copy without touching the window.topZIndex accessor to avoid recursion
        (win as Record<string, unknown>).__topZIndexRaw = topZStore.value;
    };
    const getTopZStore = () => topZStore.value;

    if (existing && typeof existing.bringToFront === 'function') {
        // Ensure newer helpers exist on previously created managers
        if (typeof existing.getTopWindowElement !== 'function') {
            (existing as MaybeZIndexManager).getTopWindowElement = () => {
                const topId = (existing as MaybeZIndexManager).getTopWindowId?.() || null;
                return topId ? document.getElementById(topId) : findTopVisibleModal();
            };
        }
        if (typeof existing.getTopWindowId !== 'function') {
            (existing as MaybeZIndexManager).getTopWindowId = () => {
                const stack = (existing as MaybeZIndexManager).getWindowStack?.() || [];
                const pruned = pruneHiddenOrMissing([...stack]);
                if (pruned.length > 0) return pruned[pruned.length - 1] ?? null;
                const fallback = findTopVisibleModal();
                return fallback ? fallback.id : null;
            };
        }
        if (typeof existing.getTopZIndex !== 'function') {
            (existing as MaybeZIndexManager).getTopZIndex = () => getTopZStore();
        }
        if (typeof existing.bumpZIndex !== 'function') {
            (existing as MaybeZIndexManager).bumpZIndex = () => {
                setTopZStore((getTopZStore() || BASE_Z_INDEX) + 1);
                return getTopZStore();
            };
        }
        if (typeof existing.ensureTopZIndex !== 'function') {
            (existing as MaybeZIndexManager).ensureTopZIndex = (z: number) => {
                setTopZStore(Math.max(getTopZStore(), z));
                return getTopZStore();
            };
        }
        if (typeof existing.syncFromDOM !== 'function') {
            (existing as MaybeZIndexManager).syncFromDOM = () =>
                existing.getTopZIndex?.() ?? BASE_Z_INDEX;
        }
        win.__zIndexManager = existing as ZIndexManager;
        return win.__zIndexManager as ZIndexManager;
    }

    const state = getState(existing);

    const assignZIndices = (): void => {
        state.windowStack.forEach((id, index) => {
            const zIndex = clamp(BASE_Z_INDEX + index);
            applyZIndex(id, zIndex);
        });
        // Keep topZIndex as "next available" to mirror legacy semantics
        const stackTopNext = BASE_Z_INDEX + state.windowStack.length;
        setTopZStore(Math.max(stackTopNext, state.externalTopZ));
    };

    const manager: ZIndexManager = {
        bringToFront(
            windowId: string,
            modal?: HTMLElement | null,
            windowEl?: HTMLElement | null
        ): number {
            const currentIndex = state.windowStack.indexOf(windowId);
            if (currentIndex !== -1) {
                state.windowStack.splice(currentIndex, 1);
            }
            state.windowStack.push(windowId);
            assignZIndices();
            const assigned = clamp(BASE_Z_INDEX + state.windowStack.length - 1);
            applyZIndex(windowId, assigned, modal, windowEl);
            return manager.getTopZIndex();
        },

        removeWindow(windowId: string): void {
            const idx = state.windowStack.indexOf(windowId);
            if (idx !== -1) {
                state.windowStack.splice(idx, 1);
                assignZIndices();
            }
        },

        getWindowStack(): string[] {
            return [...state.windowStack];
        },

        restoreWindowStack(savedStack: string[]): void {
            state.windowStack.length = 0;
            savedStack.forEach(id => {
                const el = document.getElementById(id);
                if (el) state.windowStack.push(id);
            });
            assignZIndices();
        },

        reset(): void {
            state.windowStack.length = 0;
            state.externalTopZ = BASE_Z_INDEX;
            setTopZStore(BASE_Z_INDEX);
        },

        getTopWindowId(): string | null {
            pruneHiddenOrMissing(state.windowStack);
            if (state.windowStack.length > 0)
                return state.windowStack[state.windowStack.length - 1] ?? null;
            const fallback = findTopVisibleModal();
            return fallback ? fallback.id : null;
        },

        getTopWindowElement(): HTMLElement | null {
            const topId = manager.getTopWindowId();
            if (topId) return document.getElementById(topId);
            return findTopVisibleModal();
        },

        getTopZIndex(): number {
            const stackNext = BASE_Z_INDEX + state.windowStack.length;
            const value = clamp(Math.max(stackNext, state.externalTopZ));
            setTopZStore(value);
            return value;
        },

        bumpZIndex(): number {
            // Keep external counter at least in sync with stack-based z-index
            const nextFromStack = BASE_Z_INDEX + state.windowStack.length + 1;
            state.externalTopZ = clamp(Math.max(state.externalTopZ + 1, nextFromStack));
            setTopZStore(state.externalTopZ);
            return state.externalTopZ;
        },

        ensureTopZIndex(z: number): number {
            state.externalTopZ = clamp(Math.max(state.externalTopZ, z));
            const nextFromStack = BASE_Z_INDEX + state.windowStack.length;
            setTopZStore(Math.max(nextFromStack, state.externalTopZ));
            return getTopZStore();
        },

        syncFromDOM(): number {
            let maxZ = BASE_Z_INDEX;
            document.querySelectorAll<HTMLElement>('.modal').forEach(modal => {
                const modalZ = parseInt(window.getComputedStyle(modal).zIndex, 10);
                if (!Number.isNaN(modalZ)) maxZ = Math.max(maxZ, modalZ);
                const winEl = modal.querySelector('.autopointer') as HTMLElement | null;
                if (winEl) {
                    const winZ = parseInt(window.getComputedStyle(winEl).zIndex, 10);
                    if (!Number.isNaN(winZ)) maxZ = Math.max(maxZ, winZ);
                }
            });
            state.externalTopZ = clamp(Math.max(state.externalTopZ, maxZ));
            return manager.getTopZIndex();
        },
    };

    win.__zIndexManager = manager;
    assignZIndices();
    return manager;
}
