import { BaseTab, TabConfig } from '../../windows/base-tab.js';
import { BaseComponent } from './component.js';
import { ComponentConfig } from './types.js';

/**
 * FrameworkTab - A bridge between the legacy BaseTab system and the new MacUI Framework.
 * It automates the mounting and updating of a BaseComponent-based UI.
 */
export abstract class FrameworkTab<P extends ComponentConfig = any, S = any> extends BaseTab {
    protected ui: BaseComponent<P, S> | null = null;

    constructor(config: TabConfig) {
        super(config);
    }

    /**
     * Subclasses must implement this to return the root UI component.
     * This is called during createDOM().
     */
    abstract createUI(): BaseComponent<P, S>;

    /**
     * Creates the DOM by mounting the UI component.
     */
    createDOM(): HTMLElement {
        this.ui = this.createUI();
        this.element = this.ui.mount();

        // Ensure standard tab classes
        this.element.id = `${this.id}-container`;
        this.element.classList.add('tab-content', 'w-full', 'h-full');
        if (!this.isVisible) {
            this.element.classList.add('hidden');
        }

        return this.element;
    }

    /**
     * Updates the UI component with new props.
     */
    updateUI(props: Partial<P>): void {
        if (this.ui) {
            this.ui.update(props);
        }
    }

    /**
     * Lifecycle hook: when tab is shown, we might want to trigger a re-render or focus.
     */
    protected onShow(): void {
        super.onShow();
        // Optional: this.ui?.update();
    }

    /**
     * Cleanup when tab is destroyed.
     */
    destroy(): void {
        if (this.ui) {
            this.ui.unmount();
            this.ui = null;
        }
        super.destroy();
    }
}
