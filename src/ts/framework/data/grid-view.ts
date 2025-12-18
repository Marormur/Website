import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';

export interface GridViewProps<T> {
    items: T[];
    renderItem: (item: T) => VNode;
    onItemClick?: (item: T) => void;
    onItemDblClick?: (item: T) => void;
    selectedIds?: Set<string | number>;
    idField: keyof T;
    className?: string;
    itemClassName?: (item: T) => string;
}

export class GridView<T> extends BaseComponent<GridViewProps<T>> {
    render(): VNode {
        const {
            items,
            renderItem,
            onItemClick,
            onItemDblClick,
            selectedIds,
            idField,
            className = '',
            itemClassName,
        } = this.props;

        return h(
            'div',
            {
                className: `macui-grid-view p-4 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4 h-full overflow-auto ${className}`,
            },
            ...(items.length === 0
                ? [
                      h(
                          'div',
                          {
                              className:
                                  'col-span-full p-8 text-center text-gray-500 dark:text-gray-400 italic',
                          },
                          'Keine Einträge'
                      ),
                  ]
                : items.map(item => {
                      const id = item[idField] as unknown as string | number;
                      const isSelected = selectedIds?.has(id);
                      const customItemClass = itemClassName ? itemClassName(item) : '';

                      return h(
                          'div',
                          {
                              className: `macui-grid-item flex flex-col items-center p-2 rounded-lg cursor-default select-none transition-colors ${isSelected ? 'bg-blue-100 dark:bg-blue-900/40' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'} ${customItemClass}`,
                              onclick: () => onItemClick?.(item),
                              ondblclick: () => onItemDblClick?.(item),
                              'data-id': id,
                          },
                          renderItem(item)
                      );
                  }))
        );
    }
}
