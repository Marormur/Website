import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement, h } from '../../../src/ts/core/vdom.ts';
import { buildAboutWindowContentVNode } from '../../../src/ts/apps/about/about-window.ts';
import { SettingsWindow } from '../../../src/ts/apps/settings/settings-window.ts';
import { Button } from '../../../src/ts/framework/controls/button.ts';
import { AppShell } from '../../../src/ts/framework/layout/app-shell.ts';
import { Toolbar } from '../../../src/ts/framework/navigation/toolbar.ts';
import { BaseWindow } from '../../../src/ts/windows/base-window.ts';

afterEach(() => {
    vi.restoreAllMocks();
    delete (window as Window & { SettingsSystem?: unknown }).SettingsSystem;
});

describe('window framework patterns', () => {
    it('keeps generic toolbars free of finder-specific classes by default', () => {
        const toolbar = createElement(
            new Toolbar({
                left: [h('span', {}, 'Left')],
            }).render()
        ) as HTMLElement;

        expect(toolbar.className).toContain('app-toolbar');
        expect(toolbar.className).not.toContain('finder-toolbar');
    });

    it('applies caller classes to app shells', () => {
        const shell = createElement(
            new AppShell({
                className: 'about-shell-test',
                content: h('div', {}, 'content'),
            }).render()
        ) as HTMLElement;

        expect(shell.className).toContain('about-shell-test');
    });

    it('forwards custom attrs through framework buttons', () => {
        const button = createElement(
            new Button({
                label: h('span', { 'data-i18n': 'modals.about.moreButton' }, 'More details…'),
                variant: 'ghost',
                className: 'about-more-button',
                'data-action': 'openWindow',
                'data-window-id': 'settings-modal',
                'aria-label': 'More details',
            }).render()
        ) as HTMLButtonElement;

        expect(button.type).toBe('button');
        expect(button.className).toContain('about-more-button');
        expect(button.getAttribute('data-action')).toBe('openWindow');
        expect(button.getAttribute('data-window-id')).toBe('settings-modal');
        expect(button.getAttribute('aria-label')).toBe('More details');
        expect(button.querySelector('[data-i18n="modals.about.moreButton"]')?.textContent).toBe(
            'More details…'
        );
    });

    it('renders about content directly from TypeScript structure', () => {
        const aboutContent = createElement(buildAboutWindowContentVNode()) as HTMLElement;

        expect(aboutContent.querySelector('.about-hero-image')).not.toBeNull();
        expect(
            aboutContent.querySelector('[data-i18n="modals.about.birth"]')?.textContent
        ).toBe('März 1999');
        expect(aboutContent.querySelectorAll('.about-fact-row')).toHaveLength(2);
        expect(
            aboutContent.querySelector<HTMLButtonElement>('.about-more-button')?.getAttribute(
                'data-window-id'
            )
        ).toBe('settings-modal');
    });

    it('only destroys the active settings mount owned by the window', () => {
        const ownedContainer = document.createElement('div');
        ownedContainer.id = 'settings-container';
        const contentElement = document.createElement('div');
        contentElement.appendChild(ownedContainer);

        const otherContainer = document.createElement('div');
        otherContainer.id = 'settings-container';
        const destroy = vi.fn();
        const baseDestroy = vi.spyOn(BaseWindow.prototype, 'destroy').mockImplementation(() => {});

        (
            window as Window & {
                SettingsSystem?: { container?: HTMLElement | null; destroy?: () => void };
            }
        ).SettingsSystem = {
            container: otherContainer,
            destroy,
        };

        SettingsWindow.prototype.destroy.call({ contentElement } as SettingsWindow);

        expect(destroy).not.toHaveBeenCalled();
        expect(baseDestroy).toHaveBeenCalledOnce();
    });

    it('destroys the settings system when the window owns the active mount', () => {
        const ownedContainer = document.createElement('div');
        ownedContainer.id = 'settings-container';
        const contentElement = document.createElement('div');
        contentElement.appendChild(ownedContainer);

        const destroy = vi.fn();

        (
            window as Window & {
                SettingsSystem?: { container?: HTMLElement | null; destroy?: () => void };
            }
        ).SettingsSystem = {
            container: ownedContainer,
            destroy,
        };

        vi.spyOn(BaseWindow.prototype, 'destroy').mockImplementation(() => {});

        SettingsWindow.prototype.destroy.call({ contentElement } as SettingsWindow);

        expect(destroy).toHaveBeenCalledOnce();
    });
});
