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

  function register(manager: Manager, options: Options = {}): () => void {
    const scope: Document | HTMLElement = options.scope || document;

    const handler = (e: KeyboardEvent) => {
      const useMeta = isMac();
      const mod = useMeta ? e.metaKey : e.ctrlKey;

      if (!mod) return;
      if (isEditable(e.target)) return; // don't hijack typing

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

      if (total === 0) return;

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
        if (target) manager.setActiveInstance(target.instanceId);
        return;
      }

      // Cmd/Ctrl+1-9 => jump
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

  const KeyboardShortcuts = { register };
  (window as unknown as { [k: string]: unknown }).KeyboardShortcuts = KeyboardShortcuts;
})();
