import { describe, expect, it } from 'vitest';
import { createElement, h } from '../../../src/ts/core/vdom.ts';
import { buildAboutWindowContentVNode } from '../../../src/ts/apps/about/about-window.ts';
import { Button } from '../../../src/ts/framework/controls/button.ts';
import { AppShell } from '../../../src/ts/framework/layout/app-shell.ts';
import { Toolbar } from '../../../src/ts/framework/navigation/toolbar.ts';

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
                label: h('span', { 'data-i18n': 'modals.about.moreButton' }, 'Mehr Infos …'),
                variant: 'ghost',
                className: 'about-more-button',
                'data-action': 'openWindow',
                'data-window-id': 'settings-modal',
                'aria-label': 'Mehr Infos',
            }).render()
        ) as HTMLButtonElement;

        expect(button.type).toBe('button');
        expect(button.className).toContain('about-more-button');
        expect(button.getAttribute('data-action')).toBe('openWindow');
        expect(button.getAttribute('data-window-id')).toBe('settings-modal');
        expect(button.getAttribute('aria-label')).toBe('Mehr Infos');
        expect(button.querySelector('[data-i18n="modals.about.moreButton"]')?.textContent).toBe(
            'Mehr Infos …'
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
});
