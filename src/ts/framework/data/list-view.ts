import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';

export interface ListViewColumn<T> {
    key: keyof T | string;
    label: string;
    i18nKey?: string;
    width?: string;
    render?: (item: T) => VNode | string;
    sortable?: boolean;
}

export interface ListViewProps<T> {
    items: T[];
    columns: ListViewColumn<T>[];
    onItemClick?: (item: T) => void;
    onItemDblClick?: (item: T) => void;
    selectedIds?: Set<string | number>;
    idField: keyof T;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onSort?: (key: string) => void;
    className?: string;
    rowClassName?: (item: T) => string;
}

export class ListView<T> extends BaseComponent<ListViewProps<T>> {
    render(): VNode {
        const {
            items,
            columns,
            onItemClick,
            onItemDblClick,
            selectedIds,
            idField,
            sortBy,
            sortOrder,
            onSort,
            className = '',
            rowClassName,
        } = this.props;

        return h(
            'div',
            { className: `macui-list-view flex flex-col h-full overflow-auto ${className}` },
            // Header
            h(
                'div',
                {
                    className:
                        'macui-list-header flex sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700',
                },
                ...columns.map(col =>
                    h(
                        'div',
                        {
                            className: `macui-list-header-cell px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1 ${col.sortable ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700' : ''}`,
                            style: col.width ? `width: ${col.width}` : 'flex: 1',
                            onclick:
                                col.sortable && onSort
                                    ? () => onSort(col.key as string)
                                    : undefined,
                        },
                        col.label,
                        sortBy === col.key
                            ? h(
                                  'span',
                                  { className: 'text-[10px]' },
                                  sortOrder === 'asc' ? '▲' : '▼'
                              )
                            : ''
                    )
                )
            ),
            // Body
            h(
                'div',
                { className: 'macui-list-body flex-1' },
                ...(items.length === 0
                    ? [
                          h(
                              'div',
                              {
                                  className:
                                      'p-8 text-center text-gray-500 dark:text-gray-400 italic',
                              },
                              'Keine Einträge'
                          ),
                      ]
                    : items.map(item => {
                          const id = item[idField] as unknown as string | number;
                          const isSelected = selectedIds?.has(id);
                          const customRowClass = rowClassName ? rowClassName(item) : '';

                          return h(
                              'div',
                              {
                                  className: `macui-list-row flex border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-default select-none ${isSelected ? 'bg-blue-100 dark:bg-blue-900/40' : ''} ${customRowClass}`,
                                  onclick: () => onItemClick?.(item),
                                  ondblclick: () => onItemDblClick?.(item),
                                  'data-id': id,
                              },
                              ...columns.map(col =>
                                  h(
                                      'div',
                                      {
                                          className:
                                              'macui-list-cell px-4 py-2 text-sm text-gray-700 dark:text-gray-300 truncate flex items-center',
                                          style: col.width ? `width: ${col.width}` : 'flex: 1',
                                      },
                                      col.render
                                          ? col.render(item)
                                          : (item[col.key as keyof T] as unknown as string)
                                  )
                              )
                          );
                      }))
            )
        );
    }
}
