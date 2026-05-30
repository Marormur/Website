import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';
import { createElement, h, type VNode } from '../../core/vdom.js';
import { Button } from '../../framework/controls/button.js';
import {
    focusOrCreateWindowByType,
    showAndRegisterWindow,
} from '../../framework/controls/window-lifecycle.js';

interface AboutWindowGlobal {
    appI18n?: { applyTranslations: (container?: HTMLElement) => void };
}

export function buildAboutWindowContentVNode(): VNode {
    return h(
        'div',
        { className: 'about-window-content' },
        h(
            'div',
            { className: 'about-hero-image-wrap', 'aria-hidden': 'true' },
            h('img', {
                src: './src/ts/apps/about/profil.jpg',
                alt: 'Bild',
                className: 'about-hero-image',
            })
        ),
        h('h3', { className: 'about-person-name' }, 'Marvin Temmen'),
        h('p', { className: 'about-person-meta', 'data-i18n': 'modals.about.birth' }, 'März 1999'),
        h(
            'div',
            { className: 'about-facts', role: 'list' },
            h(
                'p',
                { className: 'about-fact-row', role: 'listitem' },
                h('strong', { 'data-i18n': 'modals.about.locationLabel' }, 'Wohnort'),
                h('span', { 'data-i18n': 'modals.about.locationValue' }, 'Deutschland')
            ),
            h(
                'p',
                { className: 'about-fact-row', role: 'listitem' },
                h('strong', { 'data-i18n': 'modals.about.jobLabel' }, 'Beruf'),
                h('span', { 'data-i18n': 'modals.about.jobValue' }, 'Softwareentwickler')
            )
        ),
        new Button({
            label: h('span', { 'data-i18n': 'modals.about.moreButton' }, 'Mehr Infos …'),
            variant: 'ghost',
            className: 'about-more-button',
            'data-action': 'openWindow',
            'data-window-id': 'settings-modal',
        }).render(),
        h(
            'p',
            { className: 'about-copyright' },
            h(
                'span',
                { 'data-i18n': 'modals.about.copyright' },
                '© 2025 Marvin T. — Alle Rechte vorbehalten.'
            )
        )
    );
}

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
            resizable: false,
            disableMinimize: true,
            disableMaximize: true,
        });
    }

    createDOM(): HTMLElement {
        const modal = super.createDOM();

        modal.classList.add('about-window-shell');
        modal.classList.add('about-window');
        modal.style.minWidth = '360px';
        modal.style.minHeight = '460px';

        const tabBar = modal.querySelector<HTMLElement>(`#${this.id}-tabs`);
        tabBar?.classList.add('hidden');
        if (tabBar) {
            tabBar.style.display = 'none';
        }

        if (this.contentElement) {
            // The modal shell already owns the glass background, so the inner content stays
            // transparent to avoid stacking an extra white/dark surface inside the window.
            this.contentElement.className = 'flex-1 overflow-auto bg-transparent';
            const content = createElement(buildAboutWindowContentVNode());
            this.contentElement.replaceChildren(content);
            const globalWindow = window as unknown as AboutWindowGlobal;
            globalWindow.appI18n?.applyTranslations?.(this.contentElement);
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
