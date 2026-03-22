interface FocusableWindowLike {
    zIndex: number;
    bringToFront: () => void;
    show?: () => void;
    element?: HTMLElement | null;
    isMinimized?: boolean;
}

interface ShowableWindowLike {
    show: () => void;
    requestTabsRender?: () => void;
}

export function getFrontmostWindowByType<T extends FocusableWindowLike>(type: string): T | null {
    const windows = (window.WindowRegistry?.getWindowsByType?.(type) ?? []) as T[];
    if (windows.length === 0) return null;

    return windows.reduce((top, current) => (current.zIndex > top.zIndex ? current : top));
}

export function showAndRegisterWindow<T extends ShowableWindowLike>(
    instance: T,
    options?: { requestTabsRender?: boolean }
): T {
    globalThis.window.WindowRegistry?.registerWindow?.(instance as never);
    instance.show();
    if (options?.requestTabsRender) {
        instance.requestTabsRender?.();
    }
    return instance;
}

export function focusOrCreateWindowByType<T extends FocusableWindowLike>(options: {
    type: string;
    create: () => T;
    prepareExisting?: (instance: T) => void;
}): T {
    if (!window.WindowRegistry) {
        return options.create();
    }

    const existing = getFrontmostWindowByType<T>(options.type);
    if (!existing) {
        return options.create();
    }

    options.prepareExisting?.(existing);

    const isHidden = !!existing.element?.classList.contains('hidden');
    if (typeof existing.show === 'function' && (isHidden || existing.isMinimized)) {
        existing.show();
        return existing;
    }

    existing.bringToFront();
    return existing;
}
