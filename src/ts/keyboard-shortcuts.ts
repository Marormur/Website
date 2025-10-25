(function () {
  'use strict';

  type Instance = { instanceId: string };
  type Manager = {
    getAllInstances(): Instance[];
    getActiveInstance(): Instance | null;
    setActiveInstance(id: string): void;
    createInstance(config?: { title?: string }): Instance | null;
    destroyInstance(id: string): void;
  };

  interface Options {
    scope?: HTMLElement | Document;
    newTitleFactory?: () => string | undefined;
  }

  type Binding = {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    handler: () => void;
    description?: string;
    context?: string; // 'global' or a window type like 'finder'
  };

  const state = {
    bindings: [] as Binding[],
    contextResolver: (() => 'global') as () => string,
    globalListenerAttached: false,
  };

  function isMac(): boolean {
    return navigator.platform.toUpperCase().includes('MAC');
  }

  function isEditable(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    const tag = target.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    return (target as HTMLElement).isContentEditable;
  }

  function nextIndex(current: number, total: number): number {
    return (current + 1) % total;
  }

  function prevIndex(current: number, total: number): number {
    return (current - 1 + total) % total;
  }

  function isBinding(x: unknown): x is Binding {
    if (typeof x !== 'object' || x === null) return false;
    const obj = x as { key?: unknown; handler?: unknown };
    return typeof obj.key === 'string' && typeof obj.handler === 'function';
  }

  // Legacy-friendly register that accepts a binding object (used by MultiInstanceIntegration)
  function register(binding: Binding): () => void;
  // Manager-scoped shortcuts helper (convenience API)
  function register(manager: Manager, options?: Options): () => void;
  function register(arg1: Binding | Manager, arg2: Options = {} as Options): () => void {
    // Binding-style registry
    if (isBinding(arg1)) {
      const b = arg1 as Binding;
      state.bindings.push(b);
      ensureGlobalListener();
      return () => {
        const idx = state.bindings.indexOf(b);
        if (idx >= 0) state.bindings.splice(idx, 1);
      };
    }

    // Manager-style
    const manager = arg1 as Manager;
    const scope: Document | HTMLElement = arg2.scope || document;
    const handler = (e: KeyboardEvent) => {
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
        const currentIndex = active ? instances.findIndex(i => i.instanceId === active.instanceId) : -1;
        const idx = e.shiftKey ? prevIndex(currentIndex, total) : nextIndex(currentIndex, total);
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
    scope.addEventListener('keydown', handler as unknown as EventListener);
    return () => scope.removeEventListener('keydown', handler as unknown as EventListener);
  }

  function ensureGlobalListener() {
    if (state.globalListenerAttached) return;
    const listener = (e: KeyboardEvent) => {
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
        try { binding.handler(); } catch {}
      }
    };
    document.addEventListener('keydown', listener as unknown as EventListener);
    state.globalListenerAttached = true;
  }

  function setContextResolver(resolver: () => string) {
    state.contextResolver = resolver;
    ensureGlobalListener();
  }

  const KeyboardShortcuts = { register, setContextResolver };
  (window as unknown as { [k: string]: unknown }).KeyboardShortcuts = KeyboardShortcuts;
})();
