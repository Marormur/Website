/**
 * PURPOSE: Reusable Tab Header Control – vereinheitlicht Tab-Header über alle Apps
 * (Text Editor, Finder, Terminal) mit konsistenter Höhe, Padding und Styling.
 *
 * PATTERN: Ähnlich wie traffic-lights.ts, unterstützt sowohl HTML-Rendering als auch
 * VNode-Factory für flexible Integration in verschiedene Rendering-Szenarien.
 *
 * WHY: Bündelt Tab-Header-Logik zentral, verhindert höhen-/styling-Inkonsistenzen
 * und ermöglicht einfache zukünftige Änderungen an allen Apps gleichzeitig.
 *
 * INPUT: TabHeaderConfig mit optionalen Klassen, Attributen und Callbacks
 * OUTPUT: Einheitliches HTML-Element oder VNodes für das Tab-Header-System
 *
 * INVARIANT: Alle Tab-Header-Container haben die gleiche Höhe (44px) und konsistentes
 * Padding unabhängig von der App (Text Editor, Finder, Terminal).
 *
 * PERFORMANCE: Minimal – nur strukturelles HTML, keine komplexen Berechnungen.
 */

type VNodeFactory<TNode extends object> = (
    tag: string,
    props: Record<string, unknown> | null,
    ...children: Array<string | TNode>
) => TNode;

export interface TabHeaderControlConfig {
    /**
     * Container-Klasse(n) – überschreibt Defaults.
     */
    containerClassName?: string;

    /**
     * Zusätzliche CSS-Klassen für Flex-Layout und Spacing.
     */
    layoutClassName?: string;

    /**
     * Zusätzliche Daten-Attribute für das Container-Element.
     */
    dataAttributes?: Record<string, string>;

    /**
     * Inline-Styles für das Container-Element (falls notwendig).
     */
    style?: Record<string, string>;

    /**
     * Optional: ARIA-Label für das gesamte Tab-Header.
     */
    ariaLabel?: string;

    /**
     * Optional: Daten-App-Type ('text-editor' | 'finder' | 'terminal' | etc.)
     * wird als `data-app-type` gespeichert.
     */
    dataAppType?: string;

    /**
     * Optional: Role-Attribut (üblicherweise 'tablist').
     */
    role?: string;
}

const DEFAULT_CONTAINER_CLASS = 'tab-header-control';
const DEFAULT_LAYOUT_CLASS = 'tab-header-layout';

/**
 * HELPER: Erstellt das Tab-Header-Container-Element mit standardisiertem Styling.
 * Höhe: 44px (konsistent über alle Apps)
 * Padding/Gaps: definiert über CSS-Klassen
 */
export function createTabHeaderControlElement(config: TabHeaderControlConfig): HTMLElement {
    const container = document.createElement('div');
    const containerClass = config.containerClassName || DEFAULT_CONTAINER_CLASS;
    const layoutClass = config.layoutClassName || DEFAULT_LAYOUT_CLASS;

    container.className = `${containerClass} ${layoutClass}`;

    if (config.role) {
        container.setAttribute('role', config.role);
    } else {
        container.setAttribute('role', 'tablist');
    }

    if (config.ariaLabel) {
        container.setAttribute('aria-label', config.ariaLabel);
    }

    if (config.dataAppType) {
        container.setAttribute('data-app-type', config.dataAppType);
    }

    if (config.dataAttributes) {
        Object.entries(config.dataAttributes).forEach(([key, value]) => {
            container.setAttribute(`data-${key}`, value);
        });
    }

    if (config.style) {
        Object.entries(config.style).forEach(([prop, value]) => {
            (container.style as unknown as Record<string, string>)[prop] = value;
        });
    }

    return container;
}

/**
 * HELPER: Rendert das Tab-Header-Control als HTML-String (für SSR / HTML-Templates).
 */
export function renderTabHeaderControlHTML(config: TabHeaderControlConfig): string {
    const containerClass = config.containerClassName || DEFAULT_CONTAINER_CLASS;
    const layoutClass = config.layoutClassName || DEFAULT_LAYOUT_CLASS;

    const attrs: Array<[string, string]> = [
        ['class', `${containerClass} ${layoutClass}`],
        ['role', config.role || 'tablist'],
    ];

    if (config.ariaLabel) {
        attrs.push(['aria-label', config.ariaLabel]);
    }
    if (config.dataAppType) {
        attrs.push(['data-app-type', config.dataAppType]);
    }

    if (config.dataAttributes) {
        Object.entries(config.dataAttributes).forEach(([key, value]) => {
            attrs.push([`data-${key}`, value]);
        });
    }

    const styleStr = config.style
        ? Object.entries(config.style)
              .map(([prop, val]) => `${prop}: ${val}`)
              .join('; ')
        : '';
    if (styleStr) {
        attrs.push(['style', styleStr]);
    }

    const attrsString = attrs.map(([key, value]) => `${key}="${escapeHtml(value)}"`).join(' ');

    return `<div ${attrsString}></div>`;
}

/**
 * HELPER: Erstellt VNodes für VNode-Factory (z. B. für vdom.ts Render-System).
 */
export function createTabHeaderControlNodes<TNode extends object>(
    vnodeFactory: VNodeFactory<TNode>,
    config: TabHeaderControlConfig
): TNode {
    const containerClass = config.containerClassName || DEFAULT_CONTAINER_CLASS;
    const layoutClass = config.layoutClassName || DEFAULT_LAYOUT_CLASS;

    const props: Record<string, unknown> = {
        className: `${containerClass} ${layoutClass}`,
        role: config.role || 'tablist',
    };

    if (config.ariaLabel) {
        props['aria-label'] = config.ariaLabel;
    }
    if (config.dataAppType) {
        props['data-app-type'] = config.dataAppType;
    }
    if (config.dataAttributes) {
        Object.entries(config.dataAttributes).forEach(([key, value]) => {
            props[`data-${key}`] = value;
        });
    }
    if (config.style) {
        props.style = config.style;
    }

    return vnodeFactory('div', props);
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
