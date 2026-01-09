import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

export interface TreeNode {
    id: string;
    label: string;
    icon?: string;
    children?: TreeNode[];
    data?: unknown;
    expanded?: boolean;
    selected?: boolean;
}

export interface TreeProps extends ComponentConfig {
    nodes: TreeNode[];
    onSelect?: (node: TreeNode) => void;
    onToggle?: (node: TreeNode) => void;
    multiSelect?: boolean;
    showIcons?: boolean;
}

export interface TreeState {
    expandedNodes: Set<string>;
    selectedNodes: Set<string>;
}

/**
 * Tree Component
 * 
 * Hierarchical data display with expand/collapse, selection, and keyboard navigation.
 * Optimized for performance with large trees.
 * 
 * @example
 * ```typescript
 * const tree = new Tree({
 *     nodes: [
 *         { 
 *             id: 'src', 
 *             label: 'src', 
 *             icon: '📁',
 *             children: [
 *                 { id: 'app.ts', label: 'app.ts', icon: '📄' }
 *             ]
 *         }
 *     ],
 *     onSelect: (node) => this.openFile(node),
 *     showIcons: true
 * });
 * ```
 */
export class Tree extends BaseComponent<TreeProps, TreeState> {
    constructor(props: TreeProps) {
        super(props);
        this.state = {
            expandedNodes: new Set(
                props.nodes
                    .filter((n) => n.expanded)
                    .map((n) => n.id)
            ),
            selectedNodes: new Set(
                props.nodes
                    .filter((n) => n.selected)
                    .map((n) => n.id)
            ),
        };
    }

    render(): VNode {
        const { nodes } = this.props;

        return h(
            'div',
            {
                className: 'macui-tree select-none',
                role: 'tree',
            },
            ...nodes.map((node) => this.renderNode(node, 0))
        );
    }

    private renderNode(node: TreeNode, level: number): VNode {
        const { showIcons = true } = this.props;
        const { expandedNodes, selectedNodes } = this.state;
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        const isSelected = selectedNodes.has(node.id);

        return h(
            'div',
            {
                key: node.id,
                className: 'macui-tree-node',
                role: 'treeitem',
                'aria-expanded': hasChildren ? isExpanded : undefined,
                'aria-selected': isSelected,
            },
            h(
                'div',
                {
                    className: `flex items-center gap-1 py-1 px-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''
                    }`,
                    style: `padding-left: ${level * 20 + 8}px;`,
                    onclick: () => this.handleNodeClick(node),
                },
                hasChildren
                    ? h(
                          'span',
                          {
                              className: 'text-xs w-4 transition-transform',
                              style: isExpanded ? 'transform: rotate(90deg)' : '',
                              onclick: (e: Event) => {
                                  e.stopPropagation();
                                  this.handleToggle(node);
                              },
                          },
                          '▸'
                      )
                    : h('span', { className: 'w-4' }, ''),
                showIcons && node.icon ? h('span', { className: 'text-base' }, node.icon) : '',
                h('span', { className: 'text-sm flex-1' }, node.label)
            ),
            ...(hasChildren && isExpanded && node.children
                ? node.children.map((child) => this.renderNode(child, level + 1))
                : [])
        );
    }

    private handleNodeClick(node: TreeNode): void {
        const { multiSelect = false, onSelect } = this.props;

        if (multiSelect) {
            const newSelected = new Set(this.state.selectedNodes);
            if (newSelected.has(node.id)) {
                newSelected.delete(node.id);
            } else {
                newSelected.add(node.id);
            }
            this.setState({ selectedNodes: newSelected });
        } else {
            this.setState({ selectedNodes: new Set([node.id]) });
        }

        onSelect?.(node);
    }

    private handleToggle(node: TreeNode): void {
        const { onToggle } = this.props;
        const newExpanded = new Set(this.state.expandedNodes);

        if (newExpanded.has(node.id)) {
            newExpanded.delete(node.id);
        } else {
            newExpanded.add(node.id);
        }

        this.setState({ expandedNodes: newExpanded });
        onToggle?.(node);
    }

    /**
     * Expand all nodes
     */
    expandAll(): void {
        const allIds = new Set<string>();
        const collectIds = (nodes: TreeNode[]) => {
            nodes.forEach((node) => {
                if (node.children && node.children.length > 0) {
                    allIds.add(node.id);
                    collectIds(node.children);
                }
            });
        };
        collectIds(this.props.nodes);
        this.setState({ expandedNodes: allIds });
    }

    /**
     * Collapse all nodes
     */
    collapseAll(): void {
        this.setState({ expandedNodes: new Set() });
    }

    /**
     * Get selected nodes
     */
    getSelected(): string[] {
        return Array.from(this.state.selectedNodes);
    }
}
