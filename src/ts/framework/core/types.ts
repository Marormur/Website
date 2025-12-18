import { VNode as CoreVNode } from '../../core/vdom.js';

/**
 * Framework specific types, extending or re-exporting core VDOM types
 */

export type VNode = CoreVNode;

export type ComponentChild = VNode | string | null | undefined;

export interface ComponentConfig {
    id?: string;
    className?: string;
    [key: string]: any;
}
