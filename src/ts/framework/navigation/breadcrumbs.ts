import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

export interface BreadcrumbPart {
    label: string;
    path: string;
}

export interface BreadcrumbsProps extends ComponentConfig {
    rootLabel: string;
    path: string[];
    onNavigate: (path: string[]) => void;
}

export class Breadcrumbs extends BaseComponent<BreadcrumbsProps> {
    render(): VNode {
        const parts: VNode[] = [];

        // Root
        parts.push(
            h(
                'button',
                {
                    className: 'finder-breadcrumb-item',
                    onclick: () => this.props.onNavigate([]),
                },
                this.props.rootLabel
            )
        );

        // Path segments
        this.props.path.forEach((segment, index) => {
            parts.push(h('span', { className: 'finder-breadcrumb-separator' }, '›'));

            const currentPath = this.props.path.slice(0, index + 1);
            parts.push(
                h(
                    'button',
                    {
                        className: 'finder-breadcrumb-item',
                        onclick: () => this.props.onNavigate(currentPath),
                    },
                    segment
                )
            );
        });

        return h(
            'div',
            {
                className:
                    'breadcrumbs text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 overflow-hidden',
            },
            ...parts
        );
    }
}
