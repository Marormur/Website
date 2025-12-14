'use strict';
(function () {
    'use strict';
    // Resolve Program Info via WindowManager or fallback
    function resolveProgramInfo(modalId) {
        const wm = window.WindowManager;
        if (wm && typeof wm.getProgramInfo === 'function') {
            return wm.getProgramInfo(modalId);
        }
        const translate = window.translate;
        const t = (k, fb) => (translate ? translate(k, fb) : fb || k);
        return {
            modalId: modalId || null,
            programLabel: t('programs.default.label'),
            infoLabel: t('programs.default.infoLabel'),
            fallbackInfoModalId: 'program-info-modal',
            icon: './img/sucher.png',
            about: {},
        };
    }
    function updateProgramLabel(newLabel) {
        const programLabel = document.getElementById('program-label');
        if (programLabel) programLabel.textContent = newLabel;
    }
    function getTopModal() {
        const wm = window.WindowManager;
        if (wm && typeof wm.getTopWindow === 'function') {
            return wm.getTopWindow();
        }
        let top = null;
        let highest = 0;
        document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
            const z = parseInt(getComputedStyle(modal).zIndex, 10) || 0;
            if (z > highest) {
                highest = z;
                top = modal;
            }
        });
        return top;
    }
    function updateProgramInfoMenu(info) {
        const infoLink = document.getElementById('about-program');
        if (!infoLink) return;
        const fallbackInfo = resolveProgramInfo(null);
        infoLink.textContent = info.infoLabel || fallbackInfo.infoLabel;
        const el = infoLink;
        if (info.fallbackInfoModalId) {
            el.dataset.fallbackInfoModalId = info.fallbackInfoModalId;
        } else if (el.dataset) {
            delete el.dataset.fallbackInfoModalId;
        }
    }
    function renderProgramInfo(info) {
        const modal = document.getElementById('program-info-modal');
        if (!modal) return;
        modal.dataset.infoTarget = info.modalId || '';
        const fallbackInfo = resolveProgramInfo(null);
        const about = info.about || fallbackInfo.about || {};
        const iconEl = modal.querySelector('#program-info-icon');
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
    function renderApplicationMenu(modalId) {
        const MenuSystem = window.MenuSystem;
        if (MenuSystem && typeof MenuSystem.renderApplicationMenu === 'function') {
            MenuSystem.renderApplicationMenu(modalId);
        }
    }
    function getProgramInfo(modalId) {
        return resolveProgramInfo(modalId);
    }
    function openProgramInfoDialog(event, infoOverride) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const hideMenus = window.hideMenuDropdowns;
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
        const dialogs = window.dialogs;
        const dialogInstance = dialogs && dialogs[fallbackId];
        if (dialogInstance && typeof dialogInstance.open === 'function') {
            dialogInstance.open();
        } else {
            const modalElement = document.getElementById(fallbackId);
            if (modalElement) {
                modalElement.classList.remove('hidden');
                const bringToFront = window.dialogs?.[fallbackId]?.bringToFront;
                if (bringToFront) bringToFront();
                updateProgramLabelByTopModal();
            }
        }
    }
    function openProgramInfoFromMenu(targetModalId) {
        const info = resolveProgramInfo(targetModalId || null);
        openProgramInfoDialog(null, info);
    }
    let currentProgramInfo = resolveProgramInfo(null);
    function updateProgramLabelByTopModal() {
        const topModal = getTopModal();
        const wm = window.WindowManager;
        if (topModal && wm) {
            const config = wm.getConfig(topModal.id);
            if (config && config.metadata && config.metadata.skipMenubarUpdate) {
                const all = Array.from(document.querySelectorAll('.modal:not(.hidden)'));
                const sorted = all.sort(
                    (a, b) =>
                        (parseInt(getComputedStyle(b).zIndex, 10) || 0) -
                        (parseInt(getComputedStyle(a).zIndex, 10) || 0)
                );
                let next = null;
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
        let info;
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
    const alreadyWired = window.__programMenuSyncWired;
    if (!alreadyWired) {
        window.__programMenuSyncWired = true;
    }
    if (!alreadyWired)
        window.addEventListener('languagePreferenceChange', () => {
            const info = updateProgramLabelByTopModal();
            const programInfoModal = document.getElementById('program-info-modal');
            if (programInfoModal && !programInfoModal.classList.contains('hidden')) {
                const ds = programInfoModal.dataset;
                const targetId = ds['infoTarget'] || (info ? info.modalId : null) || null;
                const infoForDialog = resolveProgramInfo(targetId);
                renderProgramInfo(infoForDialog);
                if (info && info.modalId === infoForDialog.modalId) {
                    currentProgramInfo = infoForDialog;
                }
            }
            const updateAllSystemStatusUI = window.updateAllSystemStatusUI;
            if (updateAllSystemStatusUI) updateAllSystemStatusUI();
        });
    if (!alreadyWired)
        window.addEventListener('themePreferenceChange', () => {
            const updateAllSystemStatusUI = window.updateAllSystemStatusUI;
            if (updateAllSystemStatusUI) updateAllSystemStatusUI();
        });
    // Export legacy globals for compatibility
    window.updateProgramLabelByTopModal = updateProgramLabelByTopModal;
    window.openProgramInfoFromMenu = openProgramInfoFromMenu;
})();
//# sourceMappingURL=program-menu-sync.js.map
