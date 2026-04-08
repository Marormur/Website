/*
 * src/ts/menu.ts
 * Typed port of js/menu.js
 */

import logger from '../core/logger.js';
import type { MenuSection } from '../services/menu-registry.js';

type MenuHandler = (...args: unknown[]) => unknown;
const menuActionHandlers = new Map<string, MenuHandler>();
let menuActionIdCounter = 0;

type MenuContext = {
    modalId?: string;
    dialog?: {
        close?: () => void;
        minimize?: () => void;
        toggleMaximize?: () => void;
        center?: () => void;
    } | null;
} | null;

const MENU_REGISTRY_MODAL_TYPE_MAP: Record<string, string> = {
    'projects-modal': 'finder',
    'settings-modal': 'settings',
    'preview-modal': 'preview',
    'text-modal': 'text-editor',
    'image-modal': 'photos',
    'about-modal': 'about',
    'program-info-modal': 'program-info',
    terminal: 'terminal',
    'code-editor': 'code-editor',
};

export function registerMenuAction(handler: MenuHandler) {
    if (typeof handler !== 'function') return null;
    const actionId = `menu-action-${++menuActionIdCounter}`;
    menuActionHandlers.set(actionId, handler);
    return actionId;
}

export function normalizeMenuItems(items: unknown[], context: MenuContext) {
    if (!Array.isArray(items)) return [];
    const normalized: Record<string, unknown>[] = [];
    let previousWasSeparator = true;
    items.forEach(raw => {
        const item = raw as Record<string, unknown>;
        if (!item) return;
        if (item['type'] === 'separator') {
            if (previousWasSeparator) return;
            normalized.push({ type: 'separator' });
            previousWasSeparator = true;
            return;
        }
        const clone = Object.assign({}, item) as Record<string, unknown>;
        if (typeof item['disabled'] === 'function')
            clone['disabled'] = (item['disabled'] as (ctx: MenuContext) => boolean)(context);
        if (typeof item['label'] === 'function')
            clone['label'] = (item['label'] as (ctx: MenuContext) => string)(context);
        if (typeof item['shortcut'] === 'function')
            clone['shortcut'] = (item['shortcut'] as (ctx: MenuContext) => string)(context);
        normalized.push(clone);
        previousWasSeparator = false;
    });
    while (normalized.length && normalized[normalized.length - 1]?.type === 'separator')
        normalized.pop();
    return normalized;
}

function resolveRegistryMenuType(activeModalId?: string | null): string | undefined {
    return typeof activeModalId === 'string'
        ? MENU_REGISTRY_MODAL_TYPE_MAP[activeModalId]
        : undefined;
}

function getRegistryMenuSections(activeModalId?: string | null): MenuSection[] {
    const activeWindow = window.WindowRegistry?.getActiveWindow?.() ?? undefined;
    const activeType = activeWindow?.type;
    const explicitRegistryType = resolveRegistryMenuType(activeModalId);
    const registryMenuType = activeType || explicitRegistryType || 'finder';
    const menuRegistry = window.MenuRegistry;

    if (typeof menuRegistry?.getMenusForAppType !== 'function') {
        return [];
    }

    const sections = menuRegistry.getMenusForAppType(registryMenuType) || [];
    if (sections.length > 0) {
        return sections;
    }

    if (registryMenuType !== 'finder') {
        return menuRegistry.getMenusForAppType('finder') || [];
    }

    return [];
}

let currentMenuModalId: string | null = null;

function renderDropdownItems(
    dropdown: HTMLUListElement,
    items: Record<string, unknown>[],
    context: MenuContext
): void {
    items.forEach(item => {
        if (item.type === 'separator') {
            const separator = document.createElement('li');
            separator.className = 'menu-separator';
            separator.setAttribute('role', 'separator');
            separator.setAttribute('aria-hidden', 'true');
            dropdown.appendChild(separator);
            return;
        }

        const li = document.createElement('li');
        li.setAttribute('role', 'none');

        const submenuItems =
            Array.isArray(item.submenuItems) && item.submenuItems.length > 0
                ? normalizeMenuItems(item.submenuItems as unknown[], context)
                : [];
        const hasSubmenu = submenuItems.length > 0;
        if (hasSubmenu) {
            li.classList.add('menu-item-with-submenu');
        }

        const tagName = item.href ? 'a' : 'button';
        const actionEl = document.createElement(tagName) as HTMLButtonElement | HTMLAnchorElement;
        actionEl.className = 'menu-item';
        if (tagName === 'button') {
            actionEl.type = 'button';
        } else if (actionEl instanceof HTMLAnchorElement) {
            actionEl.href = (item.href as string) || '#';
            if (item.external) {
                actionEl.rel = 'noopener noreferrer';
                actionEl.target = '_blank';
            }
        }

        const itemLabel =
            item.label !== null
                ? typeof item.label === 'function'
                    ? item.label(context)
                    : item.label
                : '';
        const labelSpan = document.createElement('span');
        labelSpan.className = 'menu-item-label';
        if (item.icon && window.IconSystem) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'menu-item-icon';
            const iconSvg = window.IconSystem.getMenuIconSvg
                ? window.IconSystem.getMenuIconSvg(String(item.icon))
                : '';
            if (window.IconSystem.renderIconIntoElement)
                window.IconSystem.renderIconIntoElement(iconSpan, iconSvg, String(item.icon));
            labelSpan.appendChild(iconSpan);
        }
        labelSpan.appendChild(document.createTextNode(itemLabel));
        actionEl.appendChild(labelSpan);

        const trailingSpan = document.createElement('span');
        trailingSpan.className = 'menu-item-trailing';
        let hasTrailing = false;

        if (item.shortcut) {
            const shortcutSpan = document.createElement('span');
            shortcutSpan.className = 'menu-item-shortcut';
            shortcutSpan.textContent =
                typeof item.shortcut === 'function' ? item.shortcut() : item.shortcut;
            trailingSpan.appendChild(shortcutSpan);
            hasTrailing = true;
        }

        if (item.submenu || hasSubmenu) {
            const chevronSpan = document.createElement('span');
            chevronSpan.className = 'menu-item-chevron';
            chevronSpan.textContent = '›';
            chevronSpan.setAttribute('aria-hidden', 'true');
            trailingSpan.appendChild(chevronSpan);
            hasTrailing = true;
        }

        if (item.checked) {
            const checkmarkSpan = document.createElement('span');
            checkmarkSpan.className = 'menu-item-checkmark';
            checkmarkSpan.textContent = '✓';
            checkmarkSpan.setAttribute('aria-hidden', 'true');
            trailingSpan.appendChild(checkmarkSpan);
            hasTrailing = true;
        }

        if (item.trailingText) {
            const infoSpan = document.createElement('span');
            infoSpan.className = 'menu-item-trailing-text';
            infoSpan.textContent = String(item.trailingText);
            trailingSpan.appendChild(infoSpan);
            hasTrailing = true;
        }

        if (hasTrailing) {
            actionEl.appendChild(trailingSpan);
        }

        actionEl.setAttribute('role', 'menuitem');
        if (item.submenu || hasSubmenu) {
            actionEl.setAttribute('aria-haspopup', 'menu');
        }
        if (item.title) actionEl.title = String(item.title);

        const isDisabled = Boolean(item.disabled);
        if (isDisabled) {
            actionEl.setAttribute('aria-disabled', 'true');
            if (tagName === 'button' && actionEl instanceof HTMLButtonElement) {
                actionEl.disabled = true;
            }
        } else if (typeof item.action === 'function') {
            const actionId = registerMenuAction(item.action as MenuHandler);
            if (actionId) actionEl.dataset.menuAction = actionId;
        }

        if (item.href && typeof item.onClick === 'function') {
            actionEl.addEventListener('click', (event: Event) => {
                const result = (item.onClick as (e: Event) => boolean | void)(event);
                if (result === false) event.preventDefault();
            });
        }

        li.appendChild(actionEl);

        if (hasSubmenu && !isDisabled) {
            const submenu = document.createElement('ul');
            submenu.className = 'menu-dropdown menu-submenu';
            submenu.setAttribute('role', 'menu');
            renderDropdownItems(submenu, submenuItems, context);
            if (submenu.childElementCount > 0) {
                li.appendChild(submenu);
            }
        }

        dropdown.appendChild(li);
    });
}

export function renderApplicationMenu(activeModalId?: string | null) {
    const container = document.getElementById('menubar-links');
    if (!container) return;

    if (document.documentElement.getAttribute('data-ui-mode') === 'mobile') {
        container.innerHTML = '';
        currentMenuModalId = activeModalId || null;
        return;
    }

    const context = createMenuContext(activeModalId || null);
    const sections = getRegistryMenuSections(activeModalId);
    container.innerHTML = '';
    menuActionHandlers.clear();
    menuActionIdCounter = 0;
    currentMenuModalId = activeModalId || null;
    if (!Array.isArray(sections) || sections.length === 0) return;
    sections.forEach((section: MenuSection, sectionIndex: number) => {
        if (!section) return;
        const items = normalizeMenuItems(
            Array.isArray(section.items) ? section.items : [],
            context
        );
        if (!items.length) return;
        const trigger = document.createElement('div');
        trigger.className = 'menubar-trigger';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'menubar-item';
        button.dataset.menubarTriggerButton = 'true';
        const label = typeof section.label === 'function' ? section.label() : section.label;
        button.textContent = label || '';
        const sectionId = section.id || `section-${sectionIndex}`;
        const buttonId = `menubar-menu-${sectionId}`;
        const dropdownId = `menu-dropdown-${sectionId}`;
        button.id = buttonId;
        button.setAttribute('aria-haspopup', 'menu');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', dropdownId);
        const dropdown = document.createElement('ul');
        dropdown.id = dropdownId;
        dropdown.className = 'menu-dropdown hidden';
        dropdown.setAttribute('role', 'menu');
        dropdown.setAttribute('aria-labelledby', buttonId);
        renderDropdownItems(dropdown, items, context);
        if (!dropdown.childElementCount) return;
        trigger.appendChild(button);
        trigger.appendChild(dropdown);
        container.appendChild(trigger);
        if (window.bindDropdownTrigger)
            window.bindDropdownTrigger(button, { hoverRequiresOpen: true });
    });
}

export function handleMenuActionActivation(event: Event) {
    const target =
        event.target instanceof Element
            ? (event.target as Element).closest('[data-menu-action]')
            : null;
    if (!target) return;
    const actionId = target.getAttribute('data-menu-action');
    const handler = actionId ? menuActionHandlers.get(actionId) : null;
    if (typeof handler !== 'function') return;
    event.preventDefault();
    event.stopPropagation();
    if (window.hideMenuDropdowns) window.hideMenuDropdowns();
    try {
        handler();
    } catch (err) {
        logger.error('UI', 'Error executing menu action:', err);
    }
}

function createMenuContext(modalId: string | null): MenuContext {
    // Allow external override but avoid self-recursion when this function is
    // hoisted onto window as a global in non-module script context.
    const extCreate = window.createMenuContext;
    if (extCreate && extCreate !== (createMenuContext as typeof extCreate)) {
        try {
            return extCreate(modalId) as MenuContext;
        } catch (e) {
            logger.warn('UI', '[Menu] createMenuContext override threw; falling back', e);
        }
    }
    return { modalId: modalId ?? undefined, dialog: null };
}

// translate() wird zentral aus i18n.ts importiert

export function refreshCurrentMenu() {
    renderApplicationMenu(currentMenuModalId);
}

window.MenuSystem = {
    renderApplicationMenu,
    handleMenuActionActivation,
    getCurrentMenuModalId: () => currentMenuModalId,
};
logger.debug('UI', '✅ MenuSystem loaded');

export default {};
