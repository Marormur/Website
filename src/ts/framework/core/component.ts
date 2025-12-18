import { VNode, diff, patch, createElement } from '../../core/vdom.js';
import { ComponentConfig } from './types.js';

export abstract class BaseComponent<P extends ComponentConfig = any, S = any> {
    protected props: P;
    protected state: S;
    protected container: HTMLElement | null = null;
    protected element: HTMLElement | null = null;
    protected vTree: VNode | null = null;

    constructor(props: P) {
        this.props = props;
        this.state = {} as S;
    }

    /**
     * Updates the component state and triggers a re-render
     */
    protected setState(newState: Partial<S>): void {
        this.state = { ...this.state, ...newState };
        this.update();
    }

    /**
     * Main render method - must be implemented by subclasses
     */
    abstract render(): VNode;

    /**
     * Triggers a VDOM diff and patch. Optionally updates props.
     */
    update(newProps?: Partial<P>): void {
        if (newProps) {
            this.props = { ...this.props, ...newProps };
        }

        if (!this.element || !this.vTree) return;

        const newVTree = this.render();
        const patches = diff(this.vTree, newVTree);

        patch(this.element, patches);

        this.vTree = newVTree;
        this.onUpdate();
    }

    /**
     * Mounts the component into a DOM element (optional)
     */
    mount(container?: HTMLElement): HTMLElement {
        this.vTree = this.render();
        const dom = createElement(this.vTree);

        if (dom instanceof HTMLElement) {
            this.element = dom;
        } else {
            // Handle text node root if necessary, though rare for components
            const wrapper = document.createElement('span');
            wrapper.appendChild(dom);
            this.element = wrapper;
        }

        if (container) {
            this.container = container;
            container.appendChild(this.element);
        }

        this.onMount();
        return this.element;
    }

    /**
     * Unmounts the component and cleans up
     */
    unmount(): void {
        this.onDestroy();
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.container = null;
        this.vTree = null;
    }

    // Lifecycle Hooks
    onMount(): void {}
    onUpdate(): void {}
    onDestroy(): void {}
}
