type VNodeFactory<TNode extends object> = (
    tag: string,
    props: Record<string, unknown> | null,
    ...children: Array<string | TNode>
) => TNode;

type HtmlAttrs = Record<string, string | undefined>;

interface InsetSidebarShellHtmlConfig {
    shellTag?: string;
    shellClassName: string;
    shellAttributes?: HtmlAttrs;
    panelClassName: string;
    panelAttributes?: HtmlAttrs;
    topClassName: string;
    topAttributes?: HtmlAttrs;
    topHtml: string;
    bodyClassName: string;
    bodyAttributes?: HtmlAttrs;
    bodyHtml: string;
}

interface InsetSidebarShellVNodeConfig<TNode extends object> {
    shellTag?: string;
    shellProps: Record<string, unknown>;
    panelProps: Record<string, unknown>;
    topProps: Record<string, unknown>;
    topChildren: Array<string | TNode>;
    bodyProps: Record<string, unknown>;
    bodyChildren: Array<string | TNode>;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function htmlAttrsToString(attrs?: HtmlAttrs): string {
    if (!attrs) return '';

    const entries = Object.entries(attrs).filter(([, value]) => value !== undefined);
    if (entries.length === 0) return '';

    return ` ${entries.map(([key, value]) => `${key}="${escapeHtml(String(value))}"`).join(' ')}`;
}

export function renderInsetSidebarShellHTML(config: InsetSidebarShellHtmlConfig): string {
    const shellTag = config.shellTag || 'div';

    return `
        <${shellTag} class="${escapeHtml(config.shellClassName)}"${htmlAttrsToString(config.shellAttributes)}>
            <div class="${escapeHtml(config.panelClassName)}"${htmlAttrsToString(config.panelAttributes)}>
                <div class="${escapeHtml(config.topClassName)}"${htmlAttrsToString(config.topAttributes)}>${config.topHtml}</div>
                <div class="${escapeHtml(config.bodyClassName)}"${htmlAttrsToString(config.bodyAttributes)}>${config.bodyHtml}</div>
            </div>
        </${shellTag}>
    `.trim();
}

export function createInsetSidebarShellVNode<TNode extends object>(
    vnodeFactory: VNodeFactory<TNode>,
    config: InsetSidebarShellVNodeConfig<TNode>
): TNode {
    const shellTag = config.shellTag || 'div';

    return vnodeFactory(
        shellTag,
        config.shellProps,
        vnodeFactory(
            'div',
            config.panelProps,
            vnodeFactory('div', config.topProps, ...config.topChildren),
            vnodeFactory('div', config.bodyProps, ...config.bodyChildren)
        )
    );
}
