import { VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ListView, ListViewProps } from './list-view.js';
import { GridView, GridViewProps } from './grid-view.js';

export type DataViewMode = 'list' | 'grid';

export interface DataViewProps<T> {
    mode: DataViewMode;
    items: T[];
    idField: keyof T;
    listProps: Omit<ListViewProps<T>, 'items' | 'idField'>;
    gridProps: Omit<GridViewProps<T>, 'items' | 'idField'>;
    className?: string;
}

export class DataView<T> extends BaseComponent<DataViewProps<T>> {
    render(): VNode {
        const { mode, items, idField, listProps, gridProps, className = '' } = this.props;

        if (mode === 'list') {
            const listView = new ListView({
                ...listProps,
                items,
                idField,
                className,
            });
            return listView.render();
        } else {
            const gridView = new GridView({
                ...gridProps,
                items,
                idField,
                className,
            });
            return gridView.render();
        }
    }
}
