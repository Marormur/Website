export type TrafficLightRole = 'close' | 'minimize' | 'maximize';
export type TrafficLightElementTag = 'button' | 'div';

type VNodeFactory<TNode extends object> = (
    tag: string,
    props: Record<string, unknown> | null,
    ...children: Array<string | TNode>
) => TNode;

interface TrafficLightButtonConfig {
    tag?: TrafficLightElementTag;
    className?: string;
    title?: string;
    ariaLabel?: string;
    i18nTitleKey?: string;
    symbol?: string;
    id?: string;
    dataAction?: string;
    dataWindowId?: string;
    noDrag?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}

export interface TrafficLightControlsConfig {
    containerClassName?: string;
    defaults?: Omit<TrafficLightButtonConfig, 'onClick'>;
    close?: TrafficLightButtonConfig;
    minimize?: TrafficLightButtonConfig;
    maximize?: TrafficLightButtonConfig;
}

const ROLE_ORDER: TrafficLightRole[] = ['close', 'minimize', 'maximize'];

const ROLE_DEFAULTS: Record<
    TrafficLightRole,
    Required<Pick<TrafficLightButtonConfig, 'symbol'>>
> = {
    close: { symbol: '×' },
    minimize: { symbol: '−' },
    maximize: { symbol: '+' },
};

function resolveConfig(
    role: TrafficLightRole,
    config: TrafficLightControlsConfig
): Required<Omit<TrafficLightButtonConfig, 'onClick'>> & Pick<TrafficLightButtonConfig, 'onClick'> {
    const roleConfig = config[role] || {};
    const defaults = config.defaults || {};
    const tag = roleConfig.tag || defaults.tag || 'button';
    const disabled = roleConfig.disabled ?? defaults.disabled ?? false;
    const roleClass = `traffic-light-control traffic-light-control--${role}`;
    const noDragClass = roleConfig.noDrag || defaults.noDrag ? ' finder-no-drag' : '';
    const disabledClass = disabled ? ' traffic-light-control--disabled' : '';

    return {
        tag,
        className: `${roleClass}${noDragClass}${disabledClass}${roleConfig.className ? ` ${roleConfig.className}` : defaults.className ? ` ${defaults.className}` : ''}`,
        title: roleConfig.title || defaults.title || '',
        ariaLabel: roleConfig.ariaLabel || defaults.ariaLabel || '',
        i18nTitleKey: roleConfig.i18nTitleKey || defaults.i18nTitleKey || '',
        symbol: roleConfig.symbol || defaults.symbol || ROLE_DEFAULTS[role].symbol,
        id: roleConfig.id || defaults.id || '',
        dataAction: roleConfig.dataAction || defaults.dataAction || '',
        dataWindowId: roleConfig.dataWindowId || defaults.dataWindowId || '',
        noDrag: roleConfig.noDrag || defaults.noDrag || false,
        disabled,
        onClick: roleConfig.onClick,
    };
}

function applyCommonAttributes(
    element: HTMLElement,
    conf: Required<Omit<TrafficLightButtonConfig, 'onClick'>>
): void {
    element.className = conf.className;
    if (conf.title) {
        element.title = conf.title;
    }
    if (conf.ariaLabel) {
        element.setAttribute('aria-label', conf.ariaLabel);
    }
    if (conf.i18nTitleKey) {
        element.setAttribute('data-i18n-title', conf.i18nTitleKey);
    }
    if (conf.symbol) {
        element.setAttribute('data-symbol', conf.symbol);
    }
    if (conf.id) {
        element.id = conf.id;
    }
    if (conf.dataAction) {
        element.setAttribute('data-action', conf.dataAction);
    }
    if (conf.dataWindowId) {
        element.setAttribute('data-window-id', conf.dataWindowId);
    }
    if (conf.disabled) {
        if (element.tagName === 'BUTTON') {
            (element as HTMLButtonElement).disabled = true;
        } else {
            element.setAttribute('aria-disabled', 'true');
        }
    }
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function attrsToString(attrs: Array<[string, string]>): string {
    if (attrs.length === 0) return '';
    return ` ${attrs.map(([key, value]) => `${key}="${escapeHtml(value)}"`).join(' ')}`;
}

export function createTrafficLightControlsElement(config: TrafficLightControlsConfig): HTMLElement {
    const controls = document.createElement('div');
    controls.className = config.containerClassName || 'traffic-light-controls';

    ROLE_ORDER.forEach(role => {
        const conf = resolveConfig(role, config);
        const control = document.createElement(conf.tag);
        if (conf.tag === 'button') {
            (control as HTMLButtonElement).type = 'button';
        } else {
            control.setAttribute('role', 'button');
            control.setAttribute('tabindex', '0');
        }

        applyCommonAttributes(control, conf);
        if (typeof conf.onClick === 'function' && !conf.disabled) {
            control.addEventListener('click', conf.onClick);
        }
        controls.appendChild(control);
    });

    return controls;
}

export function renderTrafficLightControlsHTML(config: TrafficLightControlsConfig): string {
    const containerClass = config.containerClassName || 'traffic-light-controls';

    const content = ROLE_ORDER.map(role => {
        const conf = resolveConfig(role, config);
        const attrs: Array<[string, string]> = [['class', conf.className]];

        if (conf.tag === 'button') {
            attrs.push(['type', 'button']);
        } else {
            attrs.push(['role', 'button']);
            attrs.push(['tabindex', '0']);
        }
        if (conf.title) attrs.push(['title', conf.title]);
        if (conf.ariaLabel) attrs.push(['aria-label', conf.ariaLabel]);
        if (conf.i18nTitleKey) attrs.push(['data-i18n-title', conf.i18nTitleKey]);
        if (conf.id) attrs.push(['id', conf.id]);
        if (conf.dataAction) attrs.push(['data-action', conf.dataAction]);
        if (conf.dataWindowId) attrs.push(['data-window-id', conf.dataWindowId]);
        if (conf.symbol) attrs.push(['data-symbol', conf.symbol]);

        return `<${conf.tag}${attrsToString(attrs)}></${conf.tag}>`;
    }).join('');

    return `<div class="${escapeHtml(containerClass)}">${content}</div>`;
}

export function createTrafficLightControlNodes<TNode extends object>(
    vnodeFactory: VNodeFactory<TNode>,
    config: TrafficLightControlsConfig
): TNode[] {
    return ROLE_ORDER.map(role => {
        const conf = resolveConfig(role, config);
        const props: Record<string, unknown> = {
            className: conf.className,
            title: conf.title || undefined,
            'aria-label': conf.ariaLabel || undefined,
            'data-i18n-title': conf.i18nTitleKey || undefined,
            'data-symbol': conf.symbol,
            id: conf.id || undefined,
            'data-action': conf.dataAction || undefined,
            'data-window-id': conf.dataWindowId || undefined,
            onclick: conf.onClick,
        };

        if (conf.tag === 'button') {
            props.type = 'button';
        } else {
            props.role = 'button';
            props.tabindex = '0';
        }

        return vnodeFactory(conf.tag, props);
    });
}
