import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

export interface ContextMenuItem {
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    divider?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    submenu?: ContextMenuItem[];
}

export interface ContextMenuProps extends ComponentConfig {
    items: ContextMenuItem[];
    position: { x: number; y: number };
    onClose: () => void;
}

/**
 * ContextMenu Component
 * 
 * Right-click context menu with support for submenus, icons, shortcuts, and keyboard navigation.
 * Auto-adjusts position to stay within viewport.
 */
export class ContextMenu extends BaseComponent<ContextMenuProps> {
    private selectedIndex = 0;

    onMount(): void {
        document.addEventListener('click', this.handleOutsideClick);
        document.addEventListener('keydown', this.handleKeyDown);
        this.adjustPosition();
    }

    onDestroy(): void {
        document.removeEventListener('click', this.handleOutsideClick);
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    render(): VNode {
        const { items, position } = this.props;

        return h(
            'div',
            {
                className:
                    'macui-context-menu fixed z-[9999] min-w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1',
                style: `left: ${position.x}px; top: ${position.y}px;`,
                onclick: (e: Event) => e.stopPropagation(),
            },
            ...items.map((item, index) => this.renderItem(item, index))
        );
    }

    private renderItem(item: ContextMenuItem, index: number): VNode {
        if (item.divider) {
            return h('div', {
                key: item.id,
                className: 'border-t border-gray-200 dark:border-gray-700 my-1',
            });
        }

        const isSelected = index === this.selectedIndex;
        const isDisabled = item.disabled;

        return h(
            'button',
            {
                key: item.id,
                className: `w-full text-left px-3 py-2 flex items-center justify-between gap-4 transition-colors ${
                    isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : isSelected
                          ? 'bg-blue-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`,
                disabled: isDisabled,
                onclick: () => !isDisabled && this.handleItemClick(item),
                onmouseenter: () => (this.selectedIndex = index),
            },
            h(
                'span',
                { className: 'flex items-center gap-2' },
                item.icon ? h('span', { className: 'text-base' }, item.icon) : '',
                h('span', { className: 'text-sm' }, item.label)
            ),
            item.shortcut
                ? h('span', { className: 'text-xs opacity-60' }, item.shortcut)
                : item.submenu
                  ? h('span', { className: 'text-sm' }, '▸')
                  : ''
        );
    }

    private handleItemClick(item: ContextMenuItem): void {
        if (item.onClick) {
            item.onClick();
        }
        this.props.onClose();
    }

    private handleOutsideClick = (): void => {
        this.props.onClose();
    };

    private handleKeyDown = (e: KeyboardEvent): void => {
        const items = this.props.items.filter((item) => !item.divider && !item.disabled);

        switch (e.key) {
            case 'Escape':
                this.props.onClose();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex + 1) % items.length;
                this.update();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
                this.update();
                break;
            case 'Enter':
                e.preventDefault();
                const selectedItem = items[this.selectedIndex];
                if (selectedItem) {
                    this.handleItemClick(selectedItem);
                }
                break;
        }
    };

    private adjustPosition(): void {
        if (!this.element) return;

        const rect = this.element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let { x, y } = this.props.position;

        if (x + rect.width > viewportWidth) {
            x = viewportWidth - rect.width - 10;
        }

        if (y + rect.height > viewportHeight) {
            y = viewportHeight - rect.height - 10;
        }

        if (x !== this.props.position.x || y !== this.props.position.y) {
            (this.element as HTMLElement).style.left = `${x}px`;
            (this.element as HTMLElement).style.top = `${y}px`;
        }
    }
}
