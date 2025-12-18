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
    /** Nested patches for child nodes */
    patches?: Patch[];
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
    const updates: Patch[] = [];
    const creates: Patch[] = [];
    const removals: Patch[] = [];

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
        if (newKey !== undefined) {
            if (oldKeyMap.has(newKey)) {
                oldIndex = oldKeyMap.get(newKey)!;
                matched.add(oldIndex);
            }
        } else {
            // Match by position for keyless nodes of same type
            // Try same index first
            const potentialOldChild = oldChildren[i];
            if (
                potentialOldChild &&
                !matched.has(i) &&
                getNodeKey(potentialOldChild, i) === undefined
            ) {
                const sameType =
                    (typeof newChild === 'string' && typeof potentialOldChild === 'string') ||
                    (typeof newChild !== 'string' &&
                        typeof potentialOldChild !== 'string' &&
                        newChild.type === potentialOldChild.type);
                if (sameType) {
                    oldIndex = i;
                    matched.add(i);
                }
            }

            // If not matched at same index, find first available unmatched keyless node of same type
            if (oldIndex === -1) {
                for (let j = 0; j < oldChildren.length; j++) {
                    if (!matched.has(j)) {
                        const oldChild = oldChildren[j];
                        if (oldChild && getNodeKey(oldChild, j) === undefined) {
                            const sameType =
                                (typeof newChild === 'string' && typeof oldChild === 'string') ||
                                (typeof newChild !== 'string' &&
                                    typeof oldChild !== 'string' &&
                                    newChild.type === oldChild.type);
                            if (sameType) {
                                oldIndex = j;
                                matched.add(j);
                                break;
                            }
                        }
                    }
                }
            }
        }

        if (oldIndex === -1) {
            // No match found - this is a new node
            creates.push({
                type: 'CREATE',
                node: typeof newChild === 'string' ? h('#text', {}, newChild) : newChild,
                index: i + 1,
            });
        } else {
            // Match found - recursively diff
            const oldChild = oldChildren[oldIndex];
            if (!oldChild) continue; // Skip if old child is undefined

            if (typeof newChild !== 'string' && typeof oldChild !== 'string') {
                const childDiff = diff(oldChild, newChild);
                if (childDiff.length > 0) {
                    updates.push({
                        type: 'UPDATE',
                        index: oldIndex + 1,
                        patches: childDiff,
                    });
                }
            } else if (oldChild !== newChild) {
                // Text content changed
                updates.push({
                    type: 'UPDATE',
                    props: { textContent: newChild },
                    index: oldIndex + 1,
                });
            }
        }
    }

    // Remove old children that weren't matched
    for (let i = oldChildren.length - 1; i >= 0; i--) {
        if (!matched.has(i)) {
            const oldChild = oldChildren[i];
            if (!oldChild) continue;

            const oldKey = getNodeKey(oldChild, i);
            if (oldKey === undefined || !newKeyMap.has(oldKey)) {
                removals.push({
                    type: 'REMOVE',
                    index: i + 1,
                });
            }
        }
    }

    // Order is critical:
    // 1. UPDATE existing nodes (using old indices)
    // 2. REMOVE nodes (using old indices, in reverse order)
    // 3. CREATE new nodes (using new indices)
    return [...updates, ...removals, ...creates];
}

/**
 * Builds a map of keys to indices for efficient lookup
 *
 * Used internally by diffChildren to enable O(1) key-based node matching during reconciliation.
 * Only includes children with explicit keys; text nodes and keyless vnodes are skipped.
 *
 * @param children - Array of child nodes (VNodes or strings)
 * @returns Map from key to child index for O(1) lookup
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
 * Gets the key for a node (explicit key or undefined)
 *
 * Only returns the explicit key if present; does not fall back to index.
 * This ensures stable reconciliation - nodes without keys are always recreated.
 *
 * @param node - Virtual node or text string
 * @param index - Position in parent (unused, but kept for potential future use)
 * @returns Node's explicit key or undefined
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
 * @returns Updated DOM element
 */
export function patch(rootElement: HTMLElement, patches: Patch[]): HTMLElement {
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
 *
 * Performs the actual DOM mutation based on patch type:
 * - CREATE: Appends new element
 * - UPDATE: Modifies element properties
 * - REMOVE: Removes element from parent
 * - REPLACE: Replaces element with new one
 *
 * @param rootElement - Root DOM element to patch
 * @param patchOp - Patch operation to apply
 */
function applyPatch(rootElement: HTMLElement, patchOp: Patch): void {
    const { type, node, props, index, patches } = patchOp;

    switch (type) {
        case 'CREATE':
            if (node) {
                const newElement = createElement(node);
                if (index === 0 || index === undefined) {
                    rootElement.appendChild(newElement);
                } else {
                    const targetIndex = index - 1;
                    const beforeNode = rootElement.childNodes[targetIndex];
                    if (beforeNode) {
                        rootElement.insertBefore(newElement, beforeNode);
                    } else {
                        rootElement.appendChild(newElement);
                    }
                }
            }
            break;

        case 'UPDATE':
            let target: HTMLElement | null = null;
            if (index === 0) {
                target = rootElement;
            } else {
                const targetIndex = (index || 1) - 1;
                target = rootElement.childNodes[targetIndex] as HTMLElement;
            }

            if (target) {
                if (props) {
                    updateElement(target, props);
                }
                if (patches && patches.length > 0) {
                    for (const subPatch of patches) {
                        applyPatch(target, subPatch);
                    }
                }
            }
            break;

        case 'REMOVE':
            if (index === 0) {
                rootElement.innerHTML = '';
            } else {
                const targetIndex = (index || 1) - 1;
                const targetNode = rootElement.childNodes[targetIndex];
                if (targetNode) {
                    rootElement.removeChild(targetNode);
                }
            }
            break;

        case 'REPLACE':
            if (node) {
                const newElement = createElement(node);
                if (index === 0) {
                    rootElement.innerHTML = '';
                    rootElement.appendChild(newElement);
                } else {
                    const targetIndex = (index || 1) - 1;
                    const targetNode = rootElement.childNodes[targetIndex];
                    if (targetNode) {
                        rootElement.replaceChild(newElement, targetNode);
                    }
                }
            }
            break;
    }
}

/**
 * Creates a real DOM element from a virtual node
 *
 * Recursively creates DOM tree from virtual tree.
 * Handles text nodes, element properties, and event handlers.
 *
 * @param vnode - Virtual node to convert
 * @returns DOM element or text node
 *
 * @example
 * const vnode = h('div', { className: 'card' },
 *   h('h2', {}, 'Title'),
 *   h('p', {}, 'Content')
 * );
 * const domElement = createElement(vnode);
 * container.appendChild(domElement);
 */
export function createElement(vnode: VNode): HTMLElement | Text {
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
 *
 * Handles special cases:
 * - Event handlers (on* props): addEventListener
 * - className: mapped to element.className
 * - style objects: merged with element.style
 * - Properties vs attributes: sets as property if it exists on element, otherwise as attribute
 * - null/undefined values: removes attribute/property
 *
 * @param element - DOM element or text node to update
 * @param props - Properties to set
 */
function updateElement(element: HTMLElement | Text, props: Record<string, unknown>): void {
    if (element.nodeType === 3) {
        // Text node
        if ('textContent' in props) {
            element.textContent = String(props.textContent);
        }
        return;
    }

    const el = element as HTMLElement;
    for (const [key, value] of Object.entries(props)) {
        if (value === undefined || value === null) {
            // Remove attribute
            el.removeAttribute(key);
            if (key in el) {
                (el as any)[key] = undefined;
            }
        } else if (key.startsWith('on') && typeof value === 'function') {
            // Event handler
            const eventName = key.substring(2).toLowerCase();
            el.addEventListener(eventName, value as EventListener);
        } else if (key === 'className') {
            el.className = String(value);
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(el.style, value);
        } else if (key in el) {
            // Set as property
            (el as any)[key] = value;
        } else {
            // Set as attribute
            el.setAttribute(key, String(value));
        }
    }
}

// ============================================================================
// Event Delegation System
// ============================================================================

/**
 * Central event delegation handler
 *
 * Manages events at the root level for better performance with many elements.
 * Instead of attaching listeners to each element, delegates to a parent.
 *
 * Benefits:
 * - Fewer event listeners (better memory usage)
 * - Works with dynamically added elements
 * - Simplified cleanup
 *
 * @example
 * const delegator = new EventDelegator(document.getElementById('app'));
 * delegator.on('click', (e) => {
 *   console.log('Clicked:', e.target);
 * });
 * // Later: cleanup
 * delegator.destroy();
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
     *
     * Attaches a single listener to the root element that handles all events
     * of the specified type from child elements.
     *
     * @param eventType - Event type (e.g., 'click', 'input', 'change')
     * @param handler - Event handler function
     *
     * @example
     * delegator.on('click', (e) => {
     *   if (e.target.matches('.button')) {
     *     handleButtonClick(e);
     *   }
     * });
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
     *
     * Removes the listener for the specified event type.
     *
     * @param eventType - Event type to remove listener for
     *
     * @example
     * delegator.off('click');
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
     *
     * Cleans up all event listeners and clears the internal handlers map.
     * Call this when destroying a component to prevent memory leaks.
     *
     * @example
     * class MyComponent {
     *   private delegator: EventDelegator;
     *
     *   destroy(): void {
     *     this.delegator.destroy();
     *   }
     * }
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
    createElement,
    EventDelegator,
    measurePerf,
};

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    (window as any).VDOM = VDOM;
}
