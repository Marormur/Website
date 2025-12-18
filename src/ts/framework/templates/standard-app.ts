import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { AppShell } from '../layout/app-shell.js';
import { SplitView } from '../layout/split-view.js';
import { Sidebar, SidebarGroup } from '../navigation/sidebar.js';
import { Toolbar } from '../navigation/toolbar.js';

export interface StandardAppProps {
    id: string;
    title: string;
    sidebarGroups?: SidebarGroup[];
    activeSidebarId?: string;
    sidebarWidth?: number;
    onSidebarAction?: (id: string) => void;
    onSidebarResize?: (width: number) => void;

    toolbarLeft?: VNode[];
    toolbarCenter?: VNode[];
    toolbarRight?: VNode[];

    renderContent: () => VNode;
    className?: string;
}

/**
 * StandardApp - A pre-configured component that provides a typical macOS app layout.
 * It includes a Toolbar, a Sidebar (optional), and a Content area.
 */
export class StandardApp extends BaseComponent<StandardAppProps> {
    render(): VNode {
        const {
            id,
            sidebarGroups,
            activeSidebarId,
            sidebarWidth = 200,
            onSidebarAction,
            onSidebarResize,
            toolbarLeft = [],
            toolbarCenter = [],
            toolbarRight = [],
            renderContent,
            className = '',
        } = this.props;

        // 1. Create Toolbar
        const toolbar = new Toolbar({
            left: toolbarLeft,
            center: toolbarCenter,
            right: toolbarRight,
        });

        // 2. Create Sidebar (if groups provided)
        let content: VNode;
        if (sidebarGroups && sidebarGroups.length > 0) {
            const sidebar = new Sidebar({
                groups: sidebarGroups,
                activeId: activeSidebarId,
                idPrefix: id,
                onAction: onSidebarAction,
            });

            const splitView = new SplitView({
                initialSize: sidebarWidth,
                minSize: 150,
                maxSize: 400,
                onResize: onSidebarResize,
                left: sidebar.render(),
                right: renderContent(),
            });

            content = splitView.render();
        } else {
            content = renderContent();
        }

        // 3. Create AppShell
        const shell = new AppShell({
            toolbar: toolbar.render(),
            content: content,
            className,
        });

        return shell.render();
    }
}
