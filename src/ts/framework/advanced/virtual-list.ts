import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

export interface VirtualListProps<T> extends ComponentConfig {
    items: T[];
    itemHeight: number;
    height: number;
    renderItem: (item: T, index: number) => VNode;
    overscan?: number;
}

export interface VirtualListState {
    scrollTop: number;
}

/**
 * Virtual List Component
 * 
 * Renders only visible items for optimal performance with large lists (1000+ items).
 * Uses virtual scrolling technique to maintain 60fps even with massive datasets.
 * 
 * @example
 * ```typescript
 * const list = new VirtualList({
 *     items: largeArray, // 10,000+ items
 *     itemHeight: 40,
 *     height: 600,
 *     overscan: 5,
 *     renderItem: (item, index) => h('div', {}, `Item ${index}: ${item.name}`)
 * });
 * ```
 */
export class VirtualList<T> extends BaseComponent<VirtualListProps<T>, VirtualListState> {
    constructor(props: VirtualListProps<T>) {
        super(props);
        this.state = {
            scrollTop: 0,
        };
    }

    render(): VNode {
        const { items, itemHeight, height, overscan = 3 } = this.props;
        const { scrollTop } = this.state;

        const totalHeight = items.length * itemHeight;
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
        const endIndex = Math.min(
            items.length - 1,
            Math.ceil((scrollTop + height) / itemHeight) + overscan
        );

        const visibleItems: VNode[] = [];
        for (let i = startIndex; i <= endIndex; i++) {
            if (i >= items.length) break;
            const item = items[i];
            if (!item) continue;
            const offsetY = i * itemHeight;

            visibleItems.push(
                h(
                    'div',
                    {
                        key: `item-${i}`,
                        className: 'macui-virtual-list-item absolute w-full',
                        style: `height: ${itemHeight}px; top: ${offsetY}px;`,
                    },
                    this.props.renderItem(item, i)
                )
            );
        }

        return h(
            'div',
            {
                className: 'macui-virtual-list relative overflow-auto',
                style: `height: ${height}px;`,
                onscroll: (e: Event) => this.handleScroll(e),
            },
            h(
                'div',
                {
                    className: 'relative',
                    style: `height: ${totalHeight}px;`,
                },
                ...visibleItems
            )
        );
    }

    private handleScroll(e: Event): void {
        const target = e.target as HTMLElement;
        this.setState({ scrollTop: target.scrollTop });
    }

    /**
     * Scroll to specific item index
     */
    scrollToIndex(index: number): void {
        const { itemHeight } = this.props;
        if (this.element) {
            (this.element as HTMLElement).scrollTop = index * itemHeight;
        }
    }

    /**
     * Scroll to top
     */
    scrollToTop(): void {
        this.scrollToIndex(0);
    }

    /**
     * Scroll to bottom
     */
    scrollToBottom(): void {
        this.scrollToIndex(this.props.items.length - 1);
    }
}
