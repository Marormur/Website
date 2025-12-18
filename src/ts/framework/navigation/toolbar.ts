import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

export interface ToolbarProps extends ComponentConfig {
    left?: (VNode | string)[];
    center?: (VNode | string)[];
    right?: (VNode | string)[];
}

export class Toolbar extends BaseComponent<ToolbarProps> {
    render(): VNode {
        return h(
            'div',
            {
                className: `finder-toolbar px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 ${this.props.className || ''}`,
            },
            // Left section
            h('div', { className: 'flex items-center gap-1' }, ...(this.props.left || [])),

            // Center section (usually breadcrumbs)
            h('div', { className: 'flex-1 mx-2 min-w-0' }, ...(this.props.center || [])),

            // Right section
            h('div', { className: 'flex items-center gap-2' }, ...(this.props.right || []))
        );
    }
}
