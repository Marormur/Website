interface InsetWindowShellOptions {
    windowEl: HTMLElement;
    titlebarElement: HTMLElement | null;
    shellClassName: string;
    cssVariables: Record<string, string>;
    contentClassName?: string;
    contentClassListAdd?: string[];
}

export function configureInsetWindowShell(options: InsetWindowShellOptions): HTMLElement | null {
    options.windowEl.classList.add(options.shellClassName);

    Object.entries(options.cssVariables).forEach(([name, value]) => {
        options.windowEl.style.setProperty(name, value);
    });

    const radiusVariable = Object.keys(options.cssVariables).find(name =>
        name.endsWith('window-radius')
    );
    if (radiusVariable) {
        options.windowEl.style.borderRadius = `var(${radiusVariable})`;
    }

    options.titlebarElement?.remove();

    const baseTabBar = options.windowEl.querySelector('.window-tab-bar');
    if (baseTabBar) {
        baseTabBar.remove();
    }

    const content = options.windowEl.querySelector('.window-content') as HTMLElement | null;
    if (content) {
        if (options.contentClassName) {
            content.className = options.contentClassName;
        }
        if (options.contentClassListAdd?.length) {
            content.classList.add(...options.contentClassListAdd);
        }
    }

    return null;
}
