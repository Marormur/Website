'use strict';
(function () {
    'use strict';
    const state = {
        bindings: [],
        contextResolver: () => 'global',
        globalListenerAttached: false,
    };
    function isMac() {
        return navigator.platform.toUpperCase().includes('MAC');
    }
    function isEditable(target) {
        if (!(target instanceof Element)) return false;
        const tag = target.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
        return target.isContentEditable;
    }
    function nextIndex(current, total) {
        return (current + 1) % total;
    }
    function prevIndex(current, total) {
        return (current - 1 + total) % total;
    }
    function isBinding(x) {
        if (typeof x !== 'object' || x === null) return false;
        const obj = x;
        return typeof obj.key === 'string' && typeof obj.handler === 'function';
    }
    function register(arg1, arg2 = {}) {
        // Binding-style registry
        if (isBinding(arg1)) {
            const b = arg1;
            state.bindings.push(b);
            ensureGlobalListener();
            return () => {
                const idx = state.bindings.indexOf(b);
                if (idx >= 0) state.bindings.splice(idx, 1);
            };
        }
        // Manager-style
        const manager = arg1;
        const scope = arg2.scope || document;
        const handler = e => {
            const useMeta = isMac();
            const mod = useMeta ? e.metaKey : e.ctrlKey;
            if (!mod) return;
            if (isEditable(e.target)) return;
            const key = e.key.toLowerCase();
            if (key === 'n') {
                e.preventDefault();
                const title = arg2.newTitleFactory?.();
                manager.createInstance({ title });
                return;
            }
            const active = manager.getActiveInstance();
            const instances = manager.getAllInstances();
            const total = instances.length;
            if (total === 0) return;
            if (key === 'w' && active) {
                e.preventDefault();
                manager.destroyInstance(active.instanceId);
                return;
            }
            if (key === 'tab') {
                e.preventDefault();
                const currentIndex = active
                    ? instances.findIndex(i => i.instanceId === active.instanceId)
                    : -1;
                const idx = e.shiftKey
                    ? prevIndex(currentIndex, total)
                    : nextIndex(currentIndex, total);
                const target = instances[idx];
                if (target) manager.setActiveInstance(target.instanceId);
                return;
            }
            if (/^[1-9]$/.test(key)) {
                e.preventDefault();
                const n = parseInt(key, 10);
                const idx = Math.min(n - 1, total - 1);
                const target = instances[idx];
                if (target) manager.setActiveInstance(target.instanceId);
                return;
            }
        };
        scope.addEventListener('keydown', handler);
        return () => scope.removeEventListener('keydown', handler);
    }
    function ensureGlobalListener() {
        if (state.globalListenerAttached) return;
        const listener = e => {
            const useMeta = isMac();
            const mod = useMeta ? e.metaKey : e.ctrlKey;
            if (!mod) return;
            if (isEditable(e.target)) return;
            const key = e.key.toLowerCase();
            const context = state.contextResolver?.() || 'global';
            // Find first matching binding for current context or global
            const binding = state.bindings.find(b => {
                if (b.key.toLowerCase() !== key) return false;
                if (!!b.ctrl !== true) return false; // API expects ctrl/meta always true
                if (!!b.shift !== !!e.shiftKey && b.shift !== undefined) return false;
                if (b.context && b.context !== context) return false;
                return true;
            });
            if (binding) {
                e.preventDefault();
                try {
                    binding.handler();
                } catch {}
            }
        };
        document.addEventListener('keydown', listener);
        state.globalListenerAttached = true;
    }
    function setContextResolver(resolver) {
        state.contextResolver = resolver;
        ensureGlobalListener();
    }
    const KeyboardShortcuts = { register, setContextResolver };
    window.KeyboardShortcuts = KeyboardShortcuts;
})();
//# sourceMappingURL=keyboard-shortcuts.js.map
