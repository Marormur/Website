/**
 * Mini-VDOM Core Implementation
 *
 * A lightweight Virtual DOM system for state-preserving DOM updates.
 * Provides efficient diffing and patching of DOM trees with minimal overhead.
 *
 * Performance Targets:
 * - Diff Algorithm: < 10ms for 100 nodes
 * - Patch Application: < 20ms for 100 nodes
 * - Memory Overhead: < 100KB for typical app
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Virtual Node representation
 */
export interface VNode {
    /** Tag name or text content marker */
    type: string;
    /** Element attributes and properties */
    props: Record<string, unknown>;
    /** Child nodes (VNodes or text strings) */
    children: (VNode | string)[];
    /** Optional key for efficient list reconciliation */
    key?: string | number;
}

/**
 * Patch operation types
 */
export type PatchType = 'CREATE' | 'UPDATE' | 'REMOVE' | 'REPLACE' | 'REORDER';

/**
 * DOM patch instruction
 */
export interface Patch {
    /** Type of patch operation */
    type: PatchType;
    /** Virtual node for CREATE/REPLACE operations */
    node?: VNode;
    /** Properties to update for UPDATE operations */
    props?: Record<string, unknown>;
    /** Index in parent for operations */
    index?: number;
    /** Old node for REPLACE operations */
    oldNode?: VNode;
    /** New positions for REORDER operations */
    moves?: Array<{ from: number; to: number }>;
}

// ============================================================================
// Core VDOM Functions
// ============================================================================

/**
 * Creates a virtual node (JSX-alternative factory)
 *
 * @param type - Tag name (e.g., 'div', 'span')
 * @param props - Element properties/attributes
 * @param children - Child nodes or text content
 * @returns Virtual node
 *
 * @example
 * const vnode = h('div', { className: 'container' },
 *   h('span', {}, 'Hello'),
 *   h('span', {}, 'World')
 * );
 */
export function h(
    type: string,
    props: Record<string, unknown> | null,
    ...children: (VNode | string)[]
): VNode {
    const normalizedProps = props || {};
    const key = normalizedProps.key;

    // Remove key from props (it's metadata, not a DOM attribute)
    const filteredProps = { ...normalizedProps };
    delete filteredProps.key;

    return {
        type,
        props: filteredProps,
        children: children.flat(), // Flatten in case of array children
        key: key as string | number | undefined,
    };
}

/**
 * Compares two virtual trees and generates patches
 *
 * Uses key-based reconciliation for efficient list updates.
 * Time complexity: O(n) for balanced trees
 *
 * @param oldVTree - Previous virtual tree
 * @param newVTree - New virtual tree
 * @returns Array of patch operations
 */
export function diff(oldVTree: VNode | null, newVTree: VNode | null): Patch[] {
    const patches: Patch[] = [];

    // Case 1: Node removed
    if (!newVTree) {
        if (oldVTree) {
            patches.push({ type: 'REMOVE', index: 0 });
        }
        return patches;
    }

    // Case 2: Node created
    if (!oldVTree) {
        patches.push({ type: 'CREATE', node: newVTree, index: 0 });
        return patches;
    }

    // Case 3: Node replaced (different type or key)
    if (oldVTree.type !== newVTree.type || oldVTree.key !== newVTree.key) {
        patches.push({
            type: 'REPLACE',
            node: newVTree,
            oldNode: oldVTree,
            index: 0,
        });
        return patches;
    }

    // Case 4: Node updated (same type and key)
    const propsDiff = diffProps(oldVTree.props, newVTree.props);
    if (Object.keys(propsDiff).length > 0) {
        patches.push({
            type: 'UPDATE',
            props: propsDiff,
            index: 0,
        });
    }

    // Recursively diff children
    const childPatches = diffChildren(oldVTree.children, newVTree.children);
    patches.push(...childPatches);

    return patches;
}

/**
 * Diffs properties between old and new nodes
 *
 * @param oldProps - Previous properties
 * @param newProps - New properties
 * @returns Properties that changed (including removals as undefined)
 */
function diffProps(
    oldProps: Record<string, unknown>,
    newProps: Record<string, unknown>
): Record<string, unknown> {
    const changes: Record<string, unknown> = {};

    // Check for changed or new props
    for (const key in newProps) {
        if (oldProps[key] !== newProps[key]) {
            changes[key] = newProps[key];
        }
    }

    // Check for removed props
    for (const key in oldProps) {
        if (!(key in newProps)) {
            changes[key] = undefined;
        }
    }

    return changes;
}

/**
 * Diffs children arrays with key-based reconciliation
 *
 * @param oldChildren - Previous children
 * @param newChildren - New children
 * @returns Array of patches for children
 */
function diffChildren(oldChildren: (VNode | string)[], newChildren: (VNode | string)[]): Patch[] {
    const patches: Patch[] = [];
    const maxLength = Math.max(oldChildren.length, newChildren.length);

    // Build key maps for efficient reconciliation
    const oldKeyMap = buildKeyMap(oldChildren);
    const newKeyMap = buildKeyMap(newChildren);

    // Track which old nodes have been matched
    const matched = new Set<number>();

    // Process new children
    for (let i = 0; i < newChildren.length; i++) {
        const newChild = newChildren[i];
        if (!newChild) continue; // Skip undefined children

        const newKey = getNodeKey(newChild, i);

        // Try to find matching old node
        let oldIndex = -1;
        if (newKey !== undefined && oldKeyMap.has(newKey)) {
            oldIndex = oldKeyMap.get(newKey)!;
            matched.add(oldIndex);
        }

        if (oldIndex === -1) {
            // No match found - this is a new node
            if (typeof newChild === 'string') {
                patches.push({
                    type: 'CREATE',
                    node: h('#text', {}, newChild),
                    index: i + 1, // +1 because 0 is the parent
                });
            } else {
                patches.push({
                    type: 'CREATE',
                    node: newChild,
                    index: i + 1,
                });
            }
        } else {
            // Match found - recursively diff
            const oldChild = oldChildren[oldIndex];
            if (!oldChild) continue; // Skip if old child is undefined

            if (typeof newChild !== 'string' && typeof oldChild !== 'string') {
                const childDiff = diff(oldChild, newChild);
                // Adjust indices for child patches
                patches.push(
                    ...childDiff.map(p => ({
                        ...p,
                        index: (p.index || 0) + i + 1,
                    }))
                );
            } else if (oldChild !== newChild) {
                // Text content changed
                patches.push({
                    type: 'UPDATE',
                    props: { textContent: newChild },
                    index: i + 1,
                });
            }
        }
    }

    // Remove old children that weren't matched
    for (let i = 0; i < oldChildren.length; i++) {
        if (!matched.has(i)) {
            const oldChild = oldChildren[i];
            if (!oldChild) continue; // Skip undefined children

            const oldKey = getNodeKey(oldChild, i);
            if (oldKey === undefined || !newKeyMap.has(oldKey)) {
                patches.push({
                    type: 'REMOVE',
                    index: i + 1,
                });
            }
        }
    }

    return patches;
}

/**
 * Builds a map of keys to indices for efficient lookup
 */
function buildKeyMap(children: (VNode | string)[]): Map<string | number, number> {
    const map = new Map<string | number, number>();

    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child && typeof child !== 'string' && child.key !== undefined) {
            map.set(child.key, i);
        }
    }

    return map;
}

/**
 * Gets the key for a node (explicit key or index fallback)
 */
function getNodeKey(node: VNode | string, index: number): string | number | undefined {
    if (typeof node !== 'string' && node.key !== undefined) {
        return node.key;
    }
    return undefined; // Only use explicit keys
}

/**
 * Applies patches to a real DOM element
 *
 * Efficiently updates the DOM based on the diff results.
 * Uses event delegation for better performance.
 *
 * @param rootElement - DOM element to patch
 * @param patches - Array of patch operations
 * @param oldVTree - Previous virtual tree (for reference)
 * @returns Updated DOM element
 */
export function patch(
    rootElement: HTMLElement,
    patches: Patch[],
    oldVTree?: VNode | null
): HTMLElement {
    if (patches.length === 0) {
        return rootElement;
    }

    // Apply patches in order
    for (const patchOp of patches) {
        applyPatch(rootElement, patchOp);
    }

    return rootElement;
}

/**
 * Applies a single patch operation to the DOM
 */
function applyPatch(rootElement: HTMLElement, patchOp: Patch): void {
    const { type, node, props, index } = patchOp;

    switch (type) {
        case 'CREATE':
            if (node) {
                const newElement = createElement(node);
                if (index === 0) {
                    // Replace root
                    if (rootElement.parentNode) {
                        rootElement.parentNode.replaceChild(newElement, rootElement);
                    }
                } else {
                    // Append to root
                    rootElement.appendChild(newElement);
                }
            }
            break;

        case 'UPDATE':
            if (props) {
                if (index === 0) {
                    updateElement(rootElement, props);
                } else {
                    const targetIndex = (index || 1) - 1;
                    const target = rootElement.childNodes[targetIndex] as HTMLElement;
                    if (target) {
                        updateElement(target, props);
                    }
                }
            }
            break;

        case 'REMOVE':
            if (index === 0) {
                // Remove root
                if (rootElement.parentNode) {
                    rootElement.parentNode.removeChild(rootElement);
                }
            } else {
                const targetIndex = (index || 1) - 1;
                const target = rootElement.childNodes[targetIndex];
                if (target) {
                    rootElement.removeChild(target);
                }
            }
            break;

        case 'REPLACE':
            if (node) {
                const newElement = createElement(node);
                if (index === 0) {
                    // Replace root
                    if (rootElement.parentNode) {
                        rootElement.parentNode.replaceChild(newElement, rootElement);
                    }
                } else {
                    const targetIndex = (index || 1) - 1;
                    const target = rootElement.childNodes[targetIndex];
                    if (target) {
                        rootElement.replaceChild(newElement, target);
                    }
                }
            }
            break;
    }
}

/**
 * Creates a real DOM element from a virtual node
 */
function createElement(vnode: VNode): HTMLElement | Text {
    // Handle text nodes
    if (vnode.type === '#text') {
        const textContent = vnode.children[0];
        return document.createTextNode(typeof textContent === 'string' ? textContent : '');
    }

    // Create element
    const element = document.createElement(vnode.type);

    // Set properties
    updateElement(element, vnode.props);

    // Create children
    for (const child of vnode.children) {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(createElement(child));
        }
    }

    return element;
}

/**
 * Updates element properties/attributes
 */
function updateElement(element: HTMLElement | Text, props: Record<string, unknown>): void {
    if (element instanceof Text) {
        if ('textContent' in props) {
            element.textContent = String(props.textContent);
        }
        return;
    }

    for (const [key, value] of Object.entries(props)) {
        if (value === undefined || value === null) {
            // Remove attribute
            element.removeAttribute(key);
            if (key in element) {
                (element as any)[key] = undefined;
            }
        } else if (key.startsWith('on') && typeof value === 'function') {
            // Event handler
            const eventName = key.substring(2).toLowerCase();
            element.addEventListener(eventName, value as EventListener);
        } else if (key === 'className') {
            element.className = String(value);
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key in element) {
            // Set as property
            (element as any)[key] = value;
        } else {
            // Set as attribute
            element.setAttribute(key, String(value));
        }
    }
}

// ============================================================================
// Event Delegation System
// ============================================================================

/**
 * Central event delegation handler
 * Manages events at the root level for better performance
 */
export class EventDelegator {
    private rootElement: HTMLElement;
    private handlers: Map<string, EventListener>;

    constructor(rootElement: HTMLElement) {
        this.rootElement = rootElement;
        this.handlers = new Map();
    }

    /**
     * Register a delegated event handler
     */
    on(eventType: string, handler: EventListener): void {
        if (!this.handlers.has(eventType)) {
            const delegatedHandler = (e: Event) => {
                handler(e);
            };
            this.handlers.set(eventType, delegatedHandler);
            this.rootElement.addEventListener(eventType, delegatedHandler);
        }
    }

    /**
     * Unregister a delegated event handler
     */
    off(eventType: string): void {
        const handler = this.handlers.get(eventType);
        if (handler) {
            this.rootElement.removeEventListener(eventType, handler);
            this.handlers.delete(eventType);
        }
    }

    /**
     * Remove all delegated handlers
     */
    destroy(): void {
        for (const [eventType, handler] of this.handlers.entries()) {
            this.rootElement.removeEventListener(eventType, handler);
        }
        this.handlers.clear();
    }
}

// ============================================================================
// Performance Utilities
// ============================================================================

/**
 * Measures execution time of a function
 */
export function measurePerf<T>(fn: () => T, label?: string): { result: T; time: number } {
    const start = performance.now();
    const result = fn();
    const time = performance.now() - start;

    if (label && typeof console !== 'undefined') {
        console.log(`[VDOM] ${label}: ${time.toFixed(2)}ms`);
    }

    return { result, time };
}

// ============================================================================
// Module Export
// ============================================================================

export const VDOM = {
    h,
    diff,
    patch,
    EventDelegator,
    measurePerf,
};

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    (window as any).VDOM = VDOM;
}
