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

    // Resolve Program Info via WindowManager or fallback
    function resolveProgramInfo(modalId: string | null): ProgramInfo {
        const wm = (window as unknown as { WindowManager?: { getProgramInfo: (id: string | null) => ProgramInfo } }).WindowManager;
        if (wm && typeof wm.getProgramInfo === 'function') {
            return wm.getProgramInfo(modalId);
        }
        const translate = (window as unknown as { translate?: (k: string, fb?: string) => string }).translate;
        const t = (k: string, fb?: string) => (translate ? translate(k, fb) : fb || k);
        return {
            modalId: modalId || null,
            programLabel: t('programs.default.label'),
            infoLabel: t('programs.default.infoLabel'),
            fallbackInfoModalId: 'program-info-modal',
            icon: './img/sucher.png',
            about: {},
        };
    }

    function updateProgramLabel(newLabel: string): void {
        const programLabel = document.getElementById('program-label');
        if (programLabel) programLabel.textContent = newLabel;
    }

    function getTopModal(): HTMLElement | null {
        const wm = (window as unknown as { WindowManager?: { getTopWindow: () => HTMLElement | null } }).WindowManager;
        if (wm && typeof wm.getTopWindow === 'function') {
            return wm.getTopWindow();
        }
        let top: HTMLElement | null = null;
        let highest = 0;
        document.querySelectorAll<HTMLElement>('.modal:not(.hidden)').forEach((modal) => {
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
        (modal as HTMLElement & { dataset: { infoTarget?: string } }).dataset.infoTarget = info.modalId || '';
        const fallbackInfo = resolveProgramInfo(null);
        const about = info.about || fallbackInfo.about || {};
        const iconEl = modal.querySelector('#program-info-icon') as HTMLImageElement | null;
        if (iconEl) {
            if (info.icon) {
                iconEl.src = info.icon;
                iconEl.alt = about.name || info.programLabel || 'Programm';
                iconEl.classList.remove('hidden');
            } else {
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
        const MenuSystem = (window as unknown as { MenuSystem?: { renderApplicationMenu?: (id: string | null) => void } }).MenuSystem;
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
        const hideMenus = (window as unknown as { hideMenuDropdowns?: () => void }).hideMenuDropdowns;
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
        const dialogs = (window as unknown as { dialogs?: Record<string, { open?: () => void }> }).dialogs;
        const dialogInstance = dialogs && dialogs[fallbackId];
        if (dialogInstance && typeof dialogInstance.open === 'function') {
            dialogInstance.open();
        } else {
            const modalElement = document.getElementById(fallbackId);
            if (modalElement) {
                modalElement.classList.remove('hidden');
                const bringToFront = (window as unknown as { dialogs?: Record<string, { bringToFront?: () => void }> }).dialogs?.[fallbackId]?.bringToFront;
                if (bringToFront) bringToFront();
                updateProgramLabelByTopModal();
            }
        }
    }

    function openProgramInfoFromMenu(targetModalId?: string | null): void {
        const info = resolveProgramInfo(targetModalId || null);
        openProgramInfoDialog(null, info);
    }

    let currentProgramInfo: ProgramInfo = resolveProgramInfo(null);

    function updateProgramLabelByTopModal(): ProgramInfo {
        const topModal = getTopModal();
        const wm = (window as unknown as { WindowManager?: { getConfig: (id: string) => { metadata?: { skipMenubarUpdate?: boolean } } | null } }).WindowManager;
        if (topModal && wm) {
            const config = wm.getConfig(topModal.id);
            if (config && config.metadata && config.metadata.skipMenubarUpdate) {
                const all = Array.from(document.querySelectorAll<HTMLElement>('.modal:not(.hidden)'));
                const sorted = all.sort((a, b) => (parseInt(getComputedStyle(b).zIndex, 10) || 0) - (parseInt(getComputedStyle(a).zIndex, 10) || 0));
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
        if (topModal && topModal.id === 'program-info-modal' && currentProgramInfo && currentProgramInfo.modalId) {
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
    const alreadyWired = (window as unknown as { __programMenuSyncWired?: boolean }).__programMenuSyncWired;
    if (!alreadyWired) {
        (window as unknown as { __programMenuSyncWired?: boolean }).__programMenuSyncWired = true;
    }

    if (!alreadyWired) window.addEventListener('languagePreferenceChange', () => {
        const info = updateProgramLabelByTopModal();
        const programInfoModal = document.getElementById('program-info-modal') as HTMLElement | null;
        if (programInfoModal && !programInfoModal.classList.contains('hidden')) {
            const ds: DOMStringMap = programInfoModal.dataset;
            const targetId = ds['infoTarget'] || (info ? info.modalId : null) || null;
            const infoForDialog = resolveProgramInfo(targetId);
            renderProgramInfo(infoForDialog);
            if (info && info.modalId === infoForDialog.modalId) {
                currentProgramInfo = infoForDialog;
            }
        }
        const updateAllSystemStatusUI = (window as unknown as { updateAllSystemStatusUI?: () => void }).updateAllSystemStatusUI;
        if (updateAllSystemStatusUI) updateAllSystemStatusUI();
    });
    if (!alreadyWired) window.addEventListener('themePreferenceChange', () => {
        const updateAllSystemStatusUI = (window as unknown as { updateAllSystemStatusUI?: () => void }).updateAllSystemStatusUI;
        if (updateAllSystemStatusUI) updateAllSystemStatusUI();
    });

    // Export legacy globals for compatibility
    (window as unknown as { updateProgramLabelByTopModal: typeof updateProgramLabelByTopModal }).updateProgramLabelByTopModal = updateProgramLabelByTopModal;
    (window as unknown as { openProgramInfoFromMenu: typeof openProgramInfoFromMenu }).openProgramInfoFromMenu = openProgramInfoFromMenu;
})();
