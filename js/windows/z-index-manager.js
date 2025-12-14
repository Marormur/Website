'use strict';
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
Object.defineProperty(exports, '__esModule', { value: true });
exports.BASE_Z_INDEX = void 0;
exports.getZIndexManager = getZIndexManager;
exports.BASE_Z_INDEX = 1000;
const MAX_WINDOW_Z_INDEX = 2147483500; // Below Dock (2147483550) and Launchpad (2147483600)
function clamp(z) {
    return Math.min(z, MAX_WINDOW_Z_INDEX);
}
function applyZIndex(windowId, zIndex, modal, windowEl) {
    const targets = [];
    if (modal) targets.push(modal);
    if (windowEl && windowEl !== modal) targets.push(windowEl);
    const element = modal || document.getElementById(windowId);
    if (element && !targets.includes(element)) targets.push(element);
    const autoPointer = element?.querySelector?.('.autopointer');
    if (autoPointer && !targets.includes(autoPointer)) targets.push(autoPointer);
    const contentEl = element?.querySelector?.('.window-container');
    if (contentEl && !targets.includes(contentEl)) targets.push(contentEl);
    targets.forEach(target => {
        if (!target) return;
        target.style.zIndex = zIndex.toString();
    });
}
function pruneHiddenOrMissing(stack) {
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
function findTopVisibleModal() {
    let top = null;
    let highest = 0;
    document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
        const z = parseInt(getComputedStyle(modal).zIndex, 10) || 0;
        if (z > highest) {
            highest = z;
            top = modal;
        }
    });
    return top;
}
function getState(existing) {
    // If an older manager exists, reuse its stack to preserve ordering during hot reloads
    const windowStack = existing?.getWindowStack?.() || [];
    const externalTopZ = exports.BASE_Z_INDEX;
    return { windowStack: [...windowStack], externalTopZ };
}
function getZIndexManager() {
    const win = window;
    const existing = win.__zIndexManager;
    const initialTopZ = existing?.getTopZIndex?.() ?? exports.BASE_Z_INDEX;
    const topZStore = {
        value: clamp(initialTopZ),
    };
    const setTopZStore = v => {
        topZStore.value = clamp(v);
        // Keep a raw copy without touching the window.topZIndex accessor to avoid recursion
        win.__topZIndexRaw = topZStore.value;
    };
    const getTopZStore = () => topZStore.value;
    if (existing && typeof existing.bringToFront === 'function') {
        // Ensure newer helpers exist on previously created managers
        if (typeof existing.getTopWindowElement !== 'function') {
            existing.getTopWindowElement = () => {
                const topId = existing.getTopWindowId?.() || null;
                return topId ? document.getElementById(topId) : findTopVisibleModal();
            };
        }
        if (typeof existing.getTopWindowId !== 'function') {
            existing.getTopWindowId = () => {
                const stack = existing.getWindowStack?.() || [];
                const pruned = pruneHiddenOrMissing([...stack]);
                if (pruned.length > 0) return pruned[pruned.length - 1] ?? null;
                const fallback = findTopVisibleModal();
                return fallback ? fallback.id : null;
            };
        }
        if (typeof existing.getTopZIndex !== 'function') {
            existing.getTopZIndex = () => getTopZStore();
        }
        if (typeof existing.bumpZIndex !== 'function') {
            existing.bumpZIndex = () => {
                setTopZStore((getTopZStore() || exports.BASE_Z_INDEX) + 1);
                return getTopZStore();
            };
        }
        if (typeof existing.ensureTopZIndex !== 'function') {
            existing.ensureTopZIndex = z => {
                setTopZStore(Math.max(getTopZStore(), z));
                return getTopZStore();
            };
        }
        if (typeof existing.syncFromDOM !== 'function') {
            existing.syncFromDOM = () => existing.getTopZIndex?.() ?? exports.BASE_Z_INDEX;
        }
        win.__zIndexManager = existing;
        return win.__zIndexManager;
    }
    const state = getState(existing);
    const assignZIndices = () => {
        state.windowStack.forEach((id, index) => {
            const zIndex = clamp(exports.BASE_Z_INDEX + index);
            applyZIndex(id, zIndex);
        });
        // Keep topZIndex as "next available" to mirror legacy semantics
        const stackTopNext = exports.BASE_Z_INDEX + state.windowStack.length;
        setTopZStore(Math.max(stackTopNext, state.externalTopZ));
    };
    const manager = {
        bringToFront(windowId, modal, windowEl) {
            const currentIndex = state.windowStack.indexOf(windowId);
            if (currentIndex !== -1) {
                state.windowStack.splice(currentIndex, 1);
            }
            state.windowStack.push(windowId);
            assignZIndices();
            const assigned = clamp(exports.BASE_Z_INDEX + state.windowStack.length - 1);
            applyZIndex(windowId, assigned, modal, windowEl);
            return manager.getTopZIndex();
        },
        removeWindow(windowId) {
            const idx = state.windowStack.indexOf(windowId);
            if (idx !== -1) {
                state.windowStack.splice(idx, 1);
                assignZIndices();
            }
        },
        getWindowStack() {
            return [...state.windowStack];
        },
        restoreWindowStack(savedStack) {
            state.windowStack.length = 0;
            savedStack.forEach(id => {
                const el = document.getElementById(id);
                if (el) state.windowStack.push(id);
            });
            assignZIndices();
        },
        reset() {
            state.windowStack.length = 0;
            state.externalTopZ = exports.BASE_Z_INDEX;
            setTopZStore(exports.BASE_Z_INDEX);
        },
        getTopWindowId() {
            pruneHiddenOrMissing(state.windowStack);
            if (state.windowStack.length > 0)
                return state.windowStack[state.windowStack.length - 1] ?? null;
            const fallback = findTopVisibleModal();
            return fallback ? fallback.id : null;
        },
        getTopWindowElement() {
            const topId = manager.getTopWindowId();
            if (topId) return document.getElementById(topId);
            return findTopVisibleModal();
        },
        getTopZIndex() {
            const stackNext = exports.BASE_Z_INDEX + state.windowStack.length;
            const value = clamp(Math.max(stackNext, state.externalTopZ));
            setTopZStore(value);
            return value;
        },
        bumpZIndex() {
            // Keep external counter at least in sync with stack-based z-index
            const nextFromStack = exports.BASE_Z_INDEX + state.windowStack.length + 1;
            state.externalTopZ = clamp(Math.max(state.externalTopZ + 1, nextFromStack));
            setTopZStore(state.externalTopZ);
            return state.externalTopZ;
        },
        ensureTopZIndex(z) {
            state.externalTopZ = clamp(Math.max(state.externalTopZ, z));
            const nextFromStack = exports.BASE_Z_INDEX + state.windowStack.length;
            setTopZStore(Math.max(nextFromStack, state.externalTopZ));
            return getTopZStore();
        },
        syncFromDOM() {
            let maxZ = exports.BASE_Z_INDEX;
            document.querySelectorAll('.modal').forEach(modal => {
                const modalZ = parseInt(window.getComputedStyle(modal).zIndex, 10);
                if (!Number.isNaN(modalZ)) maxZ = Math.max(maxZ, modalZ);
                const winEl = modal.querySelector('.autopointer');
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
//# sourceMappingURL=z-index-manager.js.map
