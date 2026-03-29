import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';
import {
    focusOrCreateWindowByType,
    showAndRegisterWindow,
} from '../../framework/controls/window-lifecycle.js';

export class AboutWindow extends BaseWindow {
    constructor(config?: Partial<WindowConfig>) {
        super({
            type: 'about',
            title: 'Über Marvin',
            position: {
                x: 140,
                y: 90,
                width: 420,
                height: 560,
            },
            ...config,
        });
    }

    createDOM(): HTMLElement {
        const modal = super.createDOM();

        modal.classList.add('about-window-shell');
        modal.classList.add('about-window');
        modal.setAttribute('data-no-resize', 'true');
        modal.style.minWidth = '360px';
        modal.style.minHeight = '460px';

        const tabBar = modal.querySelector<HTMLElement>(`#${this.id}-tabs`);
        tabBar?.classList.add('hidden');
        if (tabBar) {
            tabBar.style.display = 'none';
        }

        if (this.contentElement) {
            this.contentElement.className = 'flex-1 overflow-auto bg-white dark:bg-gray-800';

            const template = document.querySelector<HTMLElement>(
                '#about-modal .about-window-content'
            );
            if (template) {
                const clone = template.cloneNode(true) as HTMLElement;
                this.contentElement.replaceChildren(clone);
                window.appI18n?.applyTranslations?.(clone);
            }
        }

        return modal;
    }

    static create(config?: Partial<WindowConfig>): AboutWindow {
        const instance = new AboutWindow(config);
        return showAndRegisterWindow(instance);
    }

    static focusOrCreate(config?: Partial<WindowConfig>): AboutWindow {
        return focusOrCreateWindowByType<AboutWindow>({
            type: 'about',
            create: () => AboutWindow.create(config),
        });
    }
}

window.AboutWindow = AboutWindow;
