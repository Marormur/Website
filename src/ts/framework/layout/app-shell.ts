import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

export interface AppShellProps extends ComponentConfig {
    toolbar?: VNode | string;
    sidebar?: VNode | string;
    content: VNode | string;
    footer?: VNode | string;
}

export class AppShell extends BaseComponent<AppShellProps> {
    render(): VNode {
        return h(
            'div',
            { className: 'flex flex-col h-full w-full overflow-hidden bg-white dark:bg-gray-800' },
            // Toolbar
            this.props.toolbar ? h('div', { className: 'shrink-0' }, this.props.toolbar) : '',

            // Main Area (Sidebar + Content)
            h(
                'div',
                { className: 'flex-1 flex min-h-0 overflow-hidden' },
                this.props.sidebar ? h('div', { className: 'shrink-0' }, this.props.sidebar) : '',
                h(
                    'main',
                    { className: 'flex-1 min-w-0 overflow-hidden relative' },
                    this.props.content
                )
            ),

            // Footer
            this.props.footer ? h('div', { className: 'shrink-0' }, this.props.footer) : ''
        );
    }
}
