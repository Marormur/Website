import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

export const FRAMEWORK_TOOLBAR_BASE_CLASS = 'app-toolbar';
export const FRAMEWORK_TOOLBAR_SECTION_CLASS = 'app-toolbar-section';
export const FRAMEWORK_TOOLBAR_GROW_SECTION_CLASS = 'app-toolbar-section--grow';
export const FRAMEWORK_TOOLBAR_END_SECTION_CLASS = 'app-toolbar-section--end';

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
                className: `${FRAMEWORK_TOOLBAR_BASE_CLASS} px-4 flex items-center gap-2 ${this.props.className || ''}`,
                style: { height: '44px', backgroundColor: 'transparent' },
            },
            // Left section
            h(
                'div',
                { className: `${FRAMEWORK_TOOLBAR_SECTION_CLASS} flex items-center gap-1` },
                ...(this.props.left || [])
            ),

            // Center section (usually breadcrumbs)
            h(
                'div',
                {
                    className: `${FRAMEWORK_TOOLBAR_SECTION_CLASS} ${FRAMEWORK_TOOLBAR_GROW_SECTION_CLASS} flex-1 mx-2 min-w-0`,
                },
                ...(this.props.center || [])
            ),

            // Right section
            h(
                'div',
                {
                    className: `${FRAMEWORK_TOOLBAR_SECTION_CLASS} ${FRAMEWORK_TOOLBAR_END_SECTION_CLASS} flex items-center gap-2`,
                },
                ...(this.props.right || [])
            )
        );
    }
}
