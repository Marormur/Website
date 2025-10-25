(function () {
    'use strict';
    function isMac() {
        return navigator.platform.toUpperCase().includes('MAC');
    }
    function isEditable(target) {
        if (!(target instanceof Element))
            return false;
        const tag = target.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select')
            return true;
        return target.isContentEditable;
    }
    function nextIndex(current, total) {
        return (current + 1) % total;
    }
    function prevIndex(current, total) {
        return (current - 1 + total) % total;
    }
    function register(manager, options = {}) {
        const scope = options.scope || document;
        const handler = (e) => {
            const useMeta = isMac();
            const mod = useMeta ? e.metaKey : e.ctrlKey;
            if (!mod)
                return;
            if (isEditable(e.target))
                return; // don't hijack typing
            const key = e.key.toLowerCase();
            // Cmd/Ctrl+N => new instance
            if (key === 'n') {
                e.preventDefault();
                const title = options.newTitleFactory?.();
                manager.createInstance({ title });
                return;
            }
            const active = manager.getActiveInstance();
            const instances = manager.getAllInstances();
            const total = instances.length;
            if (total === 0)
                return;
            // Cmd/Ctrl+W => close active instance
            if (key === 'w' && active) {
                e.preventDefault();
                manager.destroyInstance(active.instanceId);
                return;
            }
            // Cmd/Ctrl+Tab => next, Shift+Tab => prev
            if (key === 'tab') {
                e.preventDefault();
                const currentIndex = active ? instances.findIndex(i => i.instanceId === active.instanceId) : -1;
                const idx = e.shiftKey ? prevIndex(currentIndex, total) : nextIndex(currentIndex, total);
                const target = instances[idx];
                if (target)
                    manager.setActiveInstance(target.instanceId);
                return;
            }
            // Cmd/Ctrl+1-9 => jump
            if (/^[1-9]$/.test(key)) {
                e.preventDefault();
                const n = parseInt(key, 10);
                const idx = Math.min(n - 1, total - 1);
                const target = instances[idx];
                if (target)
                    manager.setActiveInstance(target.instanceId);
                return;
            }
        };
        scope.addEventListener('keydown', handler);
        return () => scope.removeEventListener('keydown', handler);
    }
    const KeyboardShortcuts = { register };
    window.KeyboardShortcuts = KeyboardShortcuts;
})();
//# sourceMappingURL=keyboard-shortcuts.js.map