import { renderProgramIcon, resolveProgramIcon, WINDOW_ICONS } from '../windows/window-icons.js';

(function () {
    'use strict';

    type ProgramInfo = {
        modalId: string | null;
        programLabel: string;
        infoLabel: string;
        fallbackInfoModalId?: string;
        icon?: string;
        about?: { name?: string; tagline?: string; version?: string; copyright?: string };
    };

    // Resolve Program Info via WindowManager, WindowRegistry, or fallback
    function resolveProgramInfo(modalId: string | null): ProgramInfo {
        const translate = (window as unknown as { translate?: (k: string, fb?: string) => string })
            .translate;
        const t = (k: string, fb?: string) => (translate ? translate(k, fb) : fb || k);

        // First try WindowRegistry for multi-window apps
        const registry = (
            window as unknown as {
                WindowRegistry?: { getActiveWindow?: () => { type?: string; id?: string } | null };
            }
        ).WindowRegistry;
        if (registry && typeof registry.getActiveWindow === 'function' && !modalId) {
            const activeWindow = registry.getActiveWindow();
            if (activeWindow && activeWindow.type) {
                // Map window types to program info
                const typeMap: Record<string, ProgramInfo> = {
                    finder: {
                        modalId: null,
                        programLabel: t('programs.finder.label', 'Finder'),
                        infoLabel: t('programs.finder.infoLabel', 'Über Finder'),
                        fallbackInfoModalId: 'program-info-modal',
                        icon: resolveProgramIcon(WINDOW_ICONS.finder),
                        about: {
                            name: 'Finder',
                            tagline: t(
                                'programs.finder.about.tagline',
                                'der innovative Marvintosh-Schreibtisch'
                            ),
                            version: '1.0.0',
                            copyright: '© 2024-2026',
                        },
                    },
                    preview: {
                        modalId: null,
                        programLabel: t('programs.preview.label', 'Vorschau'),
                        infoLabel: t('programs.preview.infoLabel', 'Bildvorschau'),
                        fallbackInfoModalId: 'program-info-modal',
                        icon: resolveProgramIcon(WINDOW_ICONS.preview),
                        about: {
                            name: t('programs.preview.about.name', 'Vorschau'),
                            tagline: t('programs.preview.about.tagline', 'Schnelle Bildanzeige'),
                            version: t('programs.preview.about.version', '1.0'),
                            copyright: t('programs.preview.about.copyright', '© 2025 Marormur'),
                        },
                    },
                    terminal: {
                        modalId: null,
                        programLabel: t('programs.terminal.label', 'Terminal'),
                        infoLabel: t('programs.terminal.infoLabel', 'Über Terminal'),
                        fallbackInfoModalId: 'program-info-modal',
                        icon: resolveProgramIcon(WINDOW_ICONS.terminal),
                        about: {
                            name: 'Terminal',
                            tagline: t(
                                'programs.terminal.about.tagline',
                                'Kommandozeilen-Interface'
                            ),
                            version: '1.0.0',
                            copyright: '© 2024-2026',
                        },
                    },
                    calendar: {
                        modalId: null,
                        programLabel: t('programs.calendar.label', 'Kalender'),
                        infoLabel: t('programs.calendar.infoLabel', 'Über Kalender'),
                        fallbackInfoModalId: 'program-info-modal',
                        icon: resolveProgramIcon(WINDOW_ICONS.calendar),
                        about: {
                            name: t('programs.calendar.about.name', 'Kalender'),
                            tagline: t(
                                'programs.calendar.about.tagline',
                                'Plane Termine und Wochen im macOS-Stil.'
                            ),
                            version: t('programs.calendar.about.version', 'Version 1.0'),
                            copyright: t(
                                'programs.calendar.about.copyright',
                                '© Marvin Temmen. Alle Rechte vorbehalten.'
                            ),
                        },
                    },
                    'text-editor': {
                        modalId: null,
                        programLabel: t('programs.text.label', 'TextEdit'),
                        infoLabel: t('programs.text.infoLabel', 'Über TextEdit'),
                        fallbackInfoModalId: 'program-info-modal',
                        icon: resolveProgramIcon(WINDOW_ICONS.textEditor),
                        about: {
                            name: 'TextEdit',
                            tagline: t('programs.text.about.tagline', 'Einfacher Texteditor'),
                            version: '1.0.0',
                            copyright: '© 2024-2026',
                        },
                    },
                };

                const typeInfo = typeMap[activeWindow.type];
                if (typeInfo) {
                    return typeInfo;
                }
            }
        }

        // Then try WindowManager (legacy)
        const wm = (
            window as unknown as {
                WindowManager?: { getProgramInfo: (id: string | null) => ProgramInfo };
            }
        ).WindowManager;
        if (wm && typeof wm.getProgramInfo === 'function') {
            return wm.getProgramInfo(modalId);
        }

        // Fallback to default
        return {
            modalId: modalId || null,
            programLabel: t('programs.default.label'),
            infoLabel: t('programs.default.infoLabel'),
            fallbackInfoModalId: 'program-info-modal',
            icon: resolveProgramIcon(WINDOW_ICONS.default),
            about: {},
        };
    }

    function updateProgramLabel(newLabel: string): void {
        const programLabel = document.getElementById('program-label');
        if (programLabel) programLabel.textContent = newLabel;
    }

    function getTopModal(): HTMLElement | null {
        const wm = (
            window as unknown as { WindowManager?: { getTopWindow: () => HTMLElement | null } }
        ).WindowManager;
        if (wm && typeof wm.getTopWindow === 'function') {
            return wm.getTopWindow();
        }
        let top: HTMLElement | null = null;
        let highest = 0;
        document.querySelectorAll<HTMLElement>('.modal:not(.hidden)').forEach(modal => {
            const z = parseInt(getComputedStyle(modal).zIndex, 10) || 0;
            if (z > highest) {
                highest = z;
                top = modal;
            }
        });
        return top;
    }

    function updateProgramInfoMenu(info: ProgramInfo): void {
        const infoLink = document.getElementById('about-program');
        if (!infoLink) return;
        const fallbackInfo = resolveProgramInfo(null);
        infoLink.textContent = info.infoLabel || fallbackInfo.infoLabel;
        const el = infoLink as HTMLElement & { dataset: { fallbackInfoModalId?: string } };
        if (info.fallbackInfoModalId) {
            el.dataset.fallbackInfoModalId = info.fallbackInfoModalId;
        } else if (el.dataset) {
            delete el.dataset.fallbackInfoModalId;
        }
    }

    function renderProgramInfo(info: ProgramInfo): void {
        const modal = document.getElementById('program-info-modal');
        if (!modal) return;
        (modal as HTMLElement & { dataset: { infoTarget?: string } }).dataset.infoTarget =
            info.modalId || '';
        const fallbackInfo = resolveProgramInfo(null);
        const about = info.about || fallbackInfo.about || {};
        const iconEl = modal.querySelector('#program-info-icon') as HTMLElement | null;
        if (iconEl) {
            if (info.icon) {
                renderProgramIcon(iconEl, info.icon);
                iconEl.classList.remove('hidden');
            } else {
                iconEl.replaceChildren();
                iconEl.classList.add('hidden');
            }
        }
        const nameEl = modal.querySelector('#program-info-name');
        if (nameEl) {
            nameEl.textContent = about.name || info.programLabel || fallbackInfo.programLabel;
        }
        const taglineEl = modal.querySelector('#program-info-tagline');
        if (taglineEl) {
            const tagline = about.tagline || '';
            taglineEl.textContent = tagline;
            taglineEl.classList.toggle('hidden', !tagline);
        }
        const versionEl = modal.querySelector('#program-info-version');
        if (versionEl) {
            const version = about.version || '';
            versionEl.textContent = version;
            versionEl.classList.toggle('hidden', !version);
        }
        const copyrightEl = modal.querySelector('#program-info-copyright');
        if (copyrightEl) {
            const copyright = about.copyright || '';
            copyrightEl.textContent = copyright;
            copyrightEl.classList.toggle('hidden', !copyright);
        }
    }

    function renderApplicationMenu(modalId: string | null): void {
        const MenuSystem = (
            window as unknown as {
                MenuSystem?: { renderApplicationMenu?: (id: string | null) => void };
            }
        ).MenuSystem;
        if (MenuSystem && typeof MenuSystem.renderApplicationMenu === 'function') {
            MenuSystem.renderApplicationMenu(modalId);
        }
    }

    function getProgramInfo(modalId: string | null): ProgramInfo {
        return resolveProgramInfo(modalId);
    }

    function openProgramInfoDialog(event: Event | null, infoOverride?: ProgramInfo): void {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const hideMenus = (window as unknown as { hideMenuDropdowns?: () => void })
            .hideMenuDropdowns;
        if (hideMenus) hideMenus();
        const info = infoOverride || currentProgramInfo || getProgramInfo(null);
        currentProgramInfo = info;
        const infoEvent = new CustomEvent('programInfoRequested', {
            detail: { modalId: info.modalId, info },
            cancelable: true,
        });
        const dispatchResult = window.dispatchEvent(infoEvent);
        if (!dispatchResult) return;
        const fallbackId = info.fallbackInfoModalId;
        if (!fallbackId) return;
        if (fallbackId === 'program-info-modal') {
            renderProgramInfo(info);
        }
        const windowManager = (
            window as unknown as {
                WindowManager?: {
                    open?: (id: string) => void;
                    bringToFront?: (id: string) => void;
                };
            }
        ).WindowManager;
        if (windowManager?.open) {
            windowManager.open(fallbackId);
            return;
        }

        const modalElement = document.getElementById(fallbackId);
        if (modalElement) {
            modalElement.classList.remove('hidden');
            window.bringDialogToFront?.(fallbackId);
            updateProgramLabelByTopModal();
        }
    }

    function openProgramInfoFromMenu(targetModalId?: string | null): void {
        const info = resolveProgramInfo(targetModalId || null);
        openProgramInfoDialog(null, info);
    }

    let currentProgramInfo: ProgramInfo = resolveProgramInfo(null);

    function updateProgramLabelByTopModal(): ProgramInfo {
        const topModal = getTopModal();
        const wm = (
            window as unknown as {
                WindowManager?: {
                    getConfig: (
                        id: string
                    ) => { metadata?: { skipMenubarUpdate?: boolean } } | null;
                };
            }
        ).WindowManager;
        if (topModal && wm) {
            const config = wm.getConfig(topModal.id);
            if (config && config.metadata && config.metadata.skipMenubarUpdate) {
                const all = Array.from(
                    document.querySelectorAll<HTMLElement>('.modal:not(.hidden)')
                );
                const sorted = all.sort(
                    (a, b) =>
                        (parseInt(getComputedStyle(b).zIndex, 10) || 0) -
                        (parseInt(getComputedStyle(a).zIndex, 10) || 0)
                );
                let next: HTMLElement | null = null;
                for (const m of sorted) {
                    const mc = wm.getConfig(m.id);
                    if (!mc || !mc.metadata || !mc.metadata.skipMenubarUpdate) {
                        next = m;
                        break;
                    }
                }
                if (next) {
                    const info = getProgramInfo(next.id);
                    currentProgramInfo = info;
                    updateProgramLabel(info.programLabel);
                    updateProgramInfoMenu(info);
                    renderApplicationMenu(next.id);
                    return info;
                }
            }
        }
        let info: ProgramInfo;
        if (
            topModal &&
            topModal.id === 'program-info-modal' &&
            currentProgramInfo &&
            currentProgramInfo.modalId
        ) {
            info = resolveProgramInfo(currentProgramInfo.modalId);
            currentProgramInfo = info;
        } else {
            info = getProgramInfo(topModal ? topModal.id : null);
            currentProgramInfo = info;
        }
        updateProgramLabel(info.programLabel);
        updateProgramInfoMenu(info);
        renderApplicationMenu(topModal ? topModal.id : null);
        return info;
    }

    // React to language/theme changes similar to legacy
    // Avoid double-binding if legacy already wired these listeners
    const alreadyWired = (window as unknown as { __programMenuSyncWired?: boolean })
        .__programMenuSyncWired;
    if (!alreadyWired) {
        (window as unknown as { __programMenuSyncWired?: boolean }).__programMenuSyncWired = true;
    }

    if (!alreadyWired)
        window.addEventListener('languagePreferenceChange', () => {
            const info = updateProgramLabelByTopModal();
            const programInfoModal = document.getElementById(
                'program-info-modal'
            ) as HTMLElement | null;
            if (programInfoModal && !programInfoModal.classList.contains('hidden')) {
                const ds: DOMStringMap = programInfoModal.dataset;
                const targetId = ds['infoTarget'] || (info ? info.modalId : null) || null;
                const infoForDialog = resolveProgramInfo(targetId);
                renderProgramInfo(infoForDialog);
                if (info && info.modalId === infoForDialog.modalId) {
                    currentProgramInfo = infoForDialog;
                }
            }
            const updateAllSystemStatusUI = (
                window as unknown as { updateAllSystemStatusUI?: () => void }
            ).updateAllSystemStatusUI;
            if (updateAllSystemStatusUI) updateAllSystemStatusUI();
        });
    if (!alreadyWired)
        window.addEventListener('themePreferenceChange', () => {
            const updateAllSystemStatusUI = (
                window as unknown as { updateAllSystemStatusUI?: () => void }
            ).updateAllSystemStatusUI;
            if (updateAllSystemStatusUI) updateAllSystemStatusUI();
        });
    if (!alreadyWired)
        window.addEventListener('iconThemeChange', () => {
            const info = updateProgramLabelByTopModal();
            const programInfoModal = document.getElementById('program-info-modal');
            if (programInfoModal && !programInfoModal.classList.contains('hidden')) {
                renderProgramInfo(resolveProgramInfo(info?.modalId || null));
            }
        });

    // Export legacy globals for compatibility
    (
        window as unknown as { updateProgramLabelByTopModal: typeof updateProgramLabelByTopModal }
    ).updateProgramLabelByTopModal = updateProgramLabelByTopModal;
    (
        window as unknown as { openProgramInfoFromMenu: typeof openProgramInfoFromMenu }
    ).openProgramInfoFromMenu = openProgramInfoFromMenu;
})();
