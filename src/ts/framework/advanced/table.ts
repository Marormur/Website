import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

export interface TableColumn<T> {
    key: string;
    label: string;
    width?: string;
    sortable?: boolean;
    render?: (value: unknown, row: T, index: number) => VNode | string;
}

export interface TableProps<T> extends ComponentConfig {
    columns: TableColumn<T>[];
    data: T[];
    onSort?: (key: string, direction: 'asc' | 'desc') => void;
    onRowClick?: (row: T, index: number) => void;
    striped?: boolean;
    hoverable?: boolean;
}

export interface TableState {
    sortKey: string | null;
    sortDirection: 'asc' | 'desc';
}

/**
 * Table Component
 * 
 * Advanced data grid with sorting, custom rendering, and responsive design.
 * Supports large datasets with efficient rendering.
 * 
 * @example
 * ```typescript
 * const table = new Table({
 *     columns: [
 *         { key: 'name', label: 'Name', sortable: true },
 *         { key: 'email', label: 'Email', width: '300px' },
 *         { 
 *             key: 'status', 
 *             label: 'Status',
 *             render: (val) => new Badge({ content: val, variant: 'success' }).render()
 *         }
 *     ],
 *     data: users,
 *     onRowClick: (row) => this.viewUser(row),
 *     striped: true,
 *     hoverable: true
 * });
 * ```
 */
export class Table<T> extends BaseComponent<TableProps<T>, TableState> {
    constructor(props: TableProps<T>) {
        super(props);
        this.state = {
            sortKey: null,
            sortDirection: 'asc',
        };
    }

    render(): VNode {
        const { striped = false } = this.props;

        return h(
            'div',
            {
                className: 'macui-table w-full overflow-x-auto',
            },
            h(
                'table',
                {
                    className: 'w-full border-collapse',
                },
                this.renderHeader(),
                this.renderBody()
            )
        );
    }

    private renderHeader(): VNode {
        const { columns } = this.props;
        const { sortKey, sortDirection } = this.state;

        return h(
            'thead',
            {
                className: 'bg-gray-100 dark:bg-gray-800',
            },
            h(
                'tr',
                {},
                ...columns.map((column) =>
                    h(
                        'th',
                        {
                            key: column.key,
                            className: `text-left px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 ${
                                column.sortable ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700' : ''
                            }`,
                            style: column.width ? `width: ${column.width}` : '',
                            onclick: column.sortable ? () => this.handleSort(column.key) : undefined,
                        },
                        column.label,
                        column.sortable && sortKey === column.key
                            ? h(
                                  'span',
                                  { className: 'ml-2 text-xs' },
                                  sortDirection === 'asc' ? '▲' : '▼'
                              )
                            : ''
                    )
                )
            )
        );
    }

    private renderBody(): VNode {
        const { columns, data, striped, hoverable, onRowClick } = this.props;

        return h(
            'tbody',
            {},
            ...data.map((row, rowIndex) =>
                h(
                    'tr',
                    {
                        key: `row-${rowIndex}`,
                        className: `border-b border-gray-200 dark:border-gray-700 ${
                            striped && rowIndex % 2 === 1 ? 'bg-gray-50 dark:bg-gray-900' : ''
                        } ${hoverable ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : ''} ${
                            onRowClick ? 'cursor-pointer' : ''
                        }`,
                        onclick: onRowClick ? () => onRowClick(row, rowIndex) : undefined,
                    },
                    ...columns.map((column) =>
                        h(
                            'td',
                            {
                                key: `${rowIndex}-${column.key}`,
                                className: 'px-4 py-3 text-sm text-gray-900 dark:text-gray-100',
                            },
                            this.renderCell(column, row, rowIndex)
                        )
                    )
                )
            )
        );
    }

    private renderCell(column: TableColumn<T>, row: T, rowIndex: number): VNode | string {
        const value = (row as Record<string, unknown>)[column.key];

        if (column.render) {
            return column.render(value, row, rowIndex);
        }

        return value != null ? String(value) : '';
    }

    private handleSort(key: string): void {
        const { onSort } = this.props;
        const { sortKey, sortDirection } = this.state;

        let newDirection: 'asc' | 'desc' = 'asc';

        if (sortKey === key) {
            newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        }

        this.setState({
            sortKey: key,
            sortDirection: newDirection,
        });

        onSort?.(key, newDirection);
    }

    /**
     * Get current sort state
     */
    getSortState(): { key: string | null; direction: 'asc' | 'desc' } {
        return {
            key: this.state.sortKey,
            direction: this.state.sortDirection,
        };
    }
}
