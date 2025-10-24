console.log('App.js loaded v2');
// ============================================================================
// HINWEIS: Viele Konstanten und Funktionen wurden in separate Module ausgelagert:
// - constants.js: Alle Konstanten (MODAL_IDS, Theme-Keys, etc.)
// - icons.js: Icon-Definitionen und SVG-Rendering
// - theme.js: Theme-Management (Dark/Light Mode)
// - dock.js: Dock-Magnification und -Verwaltung
// - menu.js: Menu-System und Menu-Definitionen
// 
// Diese Module exportieren über window.ModuleName.
// Wrapper-Funktionen unten ermöglichen einfachen Zugriff ohne window.* überall.
// WICHTIG: Keine const-Aliase für exportierte Werte, um Duplikate zu vermeiden!
// ============================================================================

// ===== Wrapper-Funktionen für Module =====

// Theme-System
function setThemePreference(pref) {
    if (window.ThemeSystem?.setThemePreference) {
        return window.ThemeSystem.setThemePreference(pref);
    }
}

function getThemePreference() {
    if (window.ThemeSystem?.getThemePreference) {
        return window.ThemeSystem.getThemePreference();
    }
    return 'system';
}

// Icon-System
function ensureSvgNamespace(svg) {
    if (window.IconSystem?.ensureSvgNamespace) {
        return window.IconSystem.ensureSvgNamespace(svg);
    }
    return svg;
}

function getMenuIconSvg(key) {
    if (window.IconSystem?.getMenuIconSvg) {
        return window.IconSystem.getMenuIconSvg(key);
    }
    return '';
}

function renderIconIntoElement(el, svg, key) {
    if (window.IconSystem?.renderIconIntoElement) {
        window.IconSystem.renderIconIntoElement(el, svg, key);
    }
}

// Dock-System
function getDockReservedBottom() {
    if (window.DockSystem?.getDockReservedBottom) {
        return window.DockSystem.getDockReservedBottom();
    }
    return 0;
}

function initDockMagnification() {
    if (window.DockSystem?.initDockMagnification) {
        window.DockSystem.initDockMagnification();
    }
}

// Menu-System
function renderApplicationMenu(modalId) {
    if (window.MenuSystem?.renderApplicationMenu) {
        window.MenuSystem.renderApplicationMenu(modalId);
    }
}

function handleMenuActionActivation(event) {
    if (window.MenuSystem?.handleMenuActionActivation) {
        window.MenuSystem.handleMenuActionActivation(event);
    }
}

// Desktop-System
function initDesktop() {
    if (window.DesktopSystem?.initDesktop) {
        window.DesktopSystem.initDesktop();
    }
}

function openDesktopItemById(itemId) {
    if (window.DesktopSystem?.openDesktopItemById) {
        return window.DesktopSystem.openDesktopItemById(itemId);
    }
    return false;
}

// System UI (WiFi, Bluetooth, Volume, etc.)
function initSystemStatusControls() {
    if (window.SystemUI?.initSystemStatusControls) {
        window.SystemUI.initSystemStatusControls();
    }
}

function updateAllSystemStatusUI() {
    if (window.SystemUI?.updateAllSystemStatusUI) {
        window.SystemUI.updateAllSystemStatusUI();
    }
}

function handleSystemToggle(toggleKey) {
    if (window.SystemUI?.handleSystemToggle) {
        window.SystemUI.handleSystemToggle(toggleKey);
    }
}

function setConnectedNetwork(network, options) {
    if (window.SystemUI?.setConnectedNetwork) {
        window.SystemUI.setConnectedNetwork(network, options);
    }
}

function setBluetoothDevice(deviceName, options) {
    if (window.SystemUI?.setBluetoothDevice) {
        window.SystemUI.setBluetoothDevice(deviceName, options);
    }
}

function setAudioDevice(deviceKey, options) {
    if (window.SystemUI?.setAudioDevice) {
        window.SystemUI.setAudioDevice(deviceKey, options);
    }
}

// Storage & Persistence
function readFinderState() {
    if (window.StorageSystem?.readFinderState) {
        return window.StorageSystem.readFinderState();
    }
    return null;
}

function writeFinderState(state) {
    if (window.StorageSystem?.writeFinderState) {
        window.StorageSystem.writeFinderState(state);
    }
}

function clearFinderState() {
    if (window.StorageSystem?.clearFinderState) {
        window.StorageSystem.clearFinderState();
    }
}

function saveOpenModals() {
    if (window.StorageSystem?.saveOpenModals) {
        window.StorageSystem.saveOpenModals();
    }
}

function restoreOpenModals() {
    if (window.StorageSystem?.restoreOpenModals) {
        window.StorageSystem.restoreOpenModals();
    }
}

function saveWindowPositions() {
    if (window.StorageSystem?.saveWindowPositions) {
        window.StorageSystem.saveWindowPositions();
    }
}

function restoreWindowPositions() {
    if (window.StorageSystem?.restoreWindowPositions) {
        window.StorageSystem.restoreWindowPositions();
    }
}

function getDialogWindowElement(modal) {
    if (window.StorageSystem?.getDialogWindowElement) {
        return window.StorageSystem.getDialogWindowElement(modal);
    }
    if (!modal) return null;
    return modal.querySelector('.autopointer') || modal;
}

function resetWindowLayout() {
    if (window.StorageSystem?.resetWindowLayout) {
        window.StorageSystem.resetWindowLayout();
    }
}

// ===== App.js Konfiguration =====

// Liste aller Modal-IDs, die von der Desktop-Shell verwaltet werden
var modalIds = window.APP_CONSTANTS?.MODAL_IDS || [
    "projects-modal", "about-modal", "settings-modal",
    "text-modal", "image-modal", "program-info-modal"
];
var transientModalIds = window.APP_CONSTANTS?.TRANSIENT_MODAL_IDS || new Set(["program-info-modal"]);

// Für zukünftige z‑Index‑Verwaltung reserviert
let topZIndex = window.APP_CONSTANTS?.BASE_Z_INDEX || 1000;
// Expose globally for use by storage module
window.topZIndex = topZIndex;

const appI18n = window.appI18n || {
    translate: (key) => key,
    applyTranslations: () => { },
    setLanguagePreference: () => { },
    getLanguagePreference: () => 'system',
    getActiveLanguage: () => 'en'
};

// Leichtgewichtige Übersetzungs-Hilfsfunktion (nutzt window.appI18n)
function translate(key, fallback) {
    if (!window.appI18n || typeof appI18n.translate !== 'function') {
        return fallback || key;
    }
    const result = appI18n.translate(key);
    if (result === key && fallback) return fallback;
    return result;
}
// Stelle sicher, dass die Funktion auch als globale Eigenschaft (window.translate) erreichbar ist
if (typeof window !== 'undefined') {
    window.translate = translate;
}

const programInfoDefinitions = {
    default: {
        programKey: 'programs.default',
        fallbackInfoModalId: 'program-info-modal',
        icon: './img/sucher.png'
    },
    "projects-modal": {
        programKey: 'programs.projects',
        icon: './img/sucher.png'
    },
    "settings-modal": {
        programKey: 'programs.settings',
        icon: './img/settings.png'
    },
    "text-modal": {
        programKey: 'programs.text',
        icon: './img/notepad.png'
    },
    "image-modal": {
        programKey: 'programs.image',
        icon: './img/imageviewer.png'
    },
    "about-modal": {
        programKey: 'programs.about',
        icon: './img/profil.jpg'
    }
};

function resolveProgramInfo(modalId) {
    const definition = Object.assign({}, programInfoDefinitions.default, modalId ? programInfoDefinitions[modalId] || {} : {});
    const programKey = definition.programKey || programInfoDefinitions.default.programKey || 'programs.default';
    const aboutFields = ['name', 'tagline', 'version', 'copyright'];
    const info = {
        modalId: modalId || null,
        programLabel: appI18n.translate(`${programKey}.label`),
        infoLabel: appI18n.translate(`${programKey}.infoLabel`),
        fallbackInfoModalId: definition.fallbackInfoModalId || 'program-info-modal',
        icon: definition.icon || programInfoDefinitions.default.icon,
        about: {}
    };
    aboutFields.forEach((field) => {
        info.about[field] = appI18n.translate(`${programKey}.about.${field}`);
    });
    return info;
}

let currentProgramInfo = resolveProgramInfo(null);
let currentMenuModalId = null;

// ============================================================================
// menuDefinitions, menuActionIdCounter, menuActionHandlers sind jetzt in menu.js
// System status (WiFi, Bluetooth, etc.) ist jetzt in system.js
// ============================================================================

function syncTopZIndexWithDOM() {
    let maxZ = Number.isFinite(topZIndex) ? topZIndex : 1000;
    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (!modal) return;
        const modalZ = parseInt(window.getComputedStyle(modal).zIndex, 10);
        if (!Number.isNaN(modalZ)) {
            maxZ = Math.max(maxZ, modalZ);
        }
        const windowEl = getDialogWindowElement(modal);
        if (windowEl) {
            const contentZ = parseInt(window.getComputedStyle(windowEl).zIndex, 10);
            if (!Number.isNaN(contentZ)) {
                maxZ = Math.max(maxZ, contentZ);
            }
        }
    });
    topZIndex = maxZ;
    window.topZIndex = maxZ; // Sync to global
}
// Expose globally for use by storage module
window.syncTopZIndexWithDOM = syncTopZIndexWithDOM;

function getMenuBarBottom() {
    const header = document.querySelector('body > header');
    if (!header) {
        return 0;
    }
    const rect = header.getBoundingClientRect();
    return rect.bottom;
}

// ============================================================================
// Dock-Funktionen sind jetzt in dock.js
// Aliase werden bereits oben definiert
// ============================================================================

function clampWindowToMenuBar(target) {
    if (!target) return;
    const minTop = getMenuBarBottom();
    if (minTop <= 0) return;
    const computed = window.getComputedStyle(target);
    if (computed.position === 'static') {
        target.style.position = 'fixed';
    }
    const currentTop = parseFloat(target.style.top);
    const numericTop = Number.isNaN(currentTop) ? parseFloat(computed.top) : currentTop;
    if (!Number.isNaN(numericTop) && numericTop < minTop) {
        target.style.top = `${minTop}px`;
    } else if (Number.isNaN(numericTop)) {
        const rect = target.getBoundingClientRect();
        if (rect.top < minTop) {
            if (!target.style.left) {
                target.style.left = `${rect.left}px`;
            }
            target.style.top = `${minTop}px`;
        }
    }
}
// Expose globally for use by storage module
window.clampWindowToMenuBar = clampWindowToMenuBar;

function computeSnapMetrics(side) {
    if (side !== 'left' && side !== 'right') return null;
    const minTop = Math.round(getMenuBarBottom());
    const viewportWidth = Math.max(window.innerWidth || 0, 0);
    const viewportHeight = Math.max(window.innerHeight || 0, 0);
    if (viewportWidth <= 0 || viewportHeight <= 0) return null;
    const minWidth = Math.min(320, viewportWidth);
    const halfWidth = Math.round(viewportWidth / 2);
    const width = Math.max(Math.min(halfWidth, viewportWidth), minWidth);
    const left = side === 'left' ? 0 : Math.max(0, viewportWidth - width);
    const top = minTop;
    const dockReserve = getDockReservedBottom();
    const height = Math.max(0, viewportHeight - top - dockReserve);
    return { left, top, width, height };
}

let snapPreviewElement = null;

function ensureSnapPreviewElement() {
    if (snapPreviewElement && snapPreviewElement.isConnected) {
        return snapPreviewElement;
    }
    if (!document || !document.body) {
        return null;
    }
    snapPreviewElement = document.getElementById('snap-preview-overlay');
    if (!snapPreviewElement) {
        snapPreviewElement = document.createElement('div');
        snapPreviewElement.id = 'snap-preview-overlay';
        snapPreviewElement.setAttribute('aria-hidden', 'true');
        document.body.appendChild(snapPreviewElement);
    }
    return snapPreviewElement;
}

function showSnapPreview(side) {
    const metrics = computeSnapMetrics(side);
    if (!metrics) {
        hideSnapPreview();
        return;
    }
    const el = ensureSnapPreviewElement();
    if (!el) return;
    el.style.left = `${metrics.left}px`;
    el.style.top = `${metrics.top}px`;
    el.style.width = `${metrics.width}px`;
    el.style.height = `${metrics.height}px`;
    el.setAttribute('data-side', side);
    el.classList.add('snap-preview-visible');
}

function hideSnapPreview() {
    if (!snapPreviewElement || !snapPreviewElement.isConnected) {
        return;
    }
    snapPreviewElement.classList.remove('snap-preview-visible');
    snapPreviewElement.removeAttribute('data-side');
}

// ============================================================================
// initDockMagnification ist jetzt in dock.js
// Alias wird bereits oben definiert
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {
    // Wenn auf einen sichtbaren Modalcontainer geklickt wird, hole das Fenster in den Vordergrund
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function (e) {
            // Verhindere, dass Klicks auf interaktive Elemente im Modal den Fokuswechsel stören.
            if (e.target === modal || modal.contains(e.target)) {
                hideMenuDropdowns();
                bringDialogToFront(modal.id);
                updateProgramLabelByTopModal();
            }
        });
    });

    window.dialogs = {};
    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (!modal) return;
        window.dialogs[id] = new Dialog(id);
    });

    syncTopZIndexWithDOM();
    restoreWindowPositions();
    restoreOpenModals();
    loadGithubRepos();
    initEventHandlers();
    initSystemStatusControls();
    initDesktop();

    if (window.dialogs["settings-modal"]) {
        window.dialogs["settings-modal"].loadIframe("./settings.html");
    }
    if (window.dialogs["text-modal"]) {
        // Lädt den Rich‑Text‑Editor in einem IFrame und registriert einen mousedown‑Handler
        // damit Klicks im Editorfenster das Modal in den Vordergrund holen.
        window.dialogs["text-modal"].loadIframe("./text.html");
    }
    initDockMagnification();
});

function bringDialogToFront(dialogId) {
    if (window.dialogs[dialogId]) {
        window.dialogs[dialogId].bringToFront();
    } else {
        console.error("Kein Dialog mit der ID " + dialogId + " gefunden.");
    }
}

// Zentrale Funktion zum Aktualisieren des Program-Menütexts
function updateProgramLabel(newLabel) {
    const programLabel = document.getElementById("program-label");
    if (programLabel) {
        programLabel.innerText = newLabel;
    }
}

// Funktion, um das aktuell oberste Modal zu ermitteln
function getTopModal() {
    let topModal = null;
    let highestZ = 0;
    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (modal && !modal.classList.contains("hidden")) {
            const zIndex = parseInt(getComputedStyle(modal).zIndex, 10) || 0;
            if (zIndex > highestZ) {
                highestZ = zIndex;
                topModal = modal;
            }
        }
    });
    return topModal;
}

function getProgramInfo(modalId) {
    return resolveProgramInfo(modalId);
}

function updateProgramInfoMenu(info) {
    const infoLink = document.getElementById("about-program");
    if (!infoLink) return;
    const fallbackInfo = resolveProgramInfo(null);
    infoLink.innerText = info.infoLabel || fallbackInfo.infoLabel;
    if (info.fallbackInfoModalId) {
        infoLink.dataset.fallbackInfoModalId = info.fallbackInfoModalId;
    } else {
        delete infoLink.dataset.fallbackInfoModalId;
    }
}

function renderProgramInfo(info) {
    const modal = document.getElementById("program-info-modal");
    if (!modal) return;
    modal.dataset.infoTarget = info.modalId || "";
    const fallbackInfo = resolveProgramInfo(null);
    const about = info.about || fallbackInfo.about || {};
    const iconEl = modal.querySelector("#program-info-icon");
    if (iconEl) {
        if (info.icon) {
            iconEl.src = info.icon;
            iconEl.alt = about.name || info.programLabel || "Programm";
            iconEl.classList.remove("hidden");
        } else {
            iconEl.classList.add("hidden");
        }
    }
    const nameEl = modal.querySelector("#program-info-name");
    if (nameEl) {
        nameEl.textContent = about.name || info.programLabel || fallbackInfo.programLabel;
    }
    const taglineEl = modal.querySelector("#program-info-tagline");
    if (taglineEl) {
        const tagline = about.tagline || "";
        taglineEl.textContent = tagline;
        taglineEl.classList.toggle("hidden", !tagline);
    }
    const versionEl = modal.querySelector("#program-info-version");
    if (versionEl) {
        const version = about.version || "";
        versionEl.textContent = version;
        versionEl.classList.toggle("hidden", !version);
    }
    const copyrightEl = modal.querySelector("#program-info-copyright");
    if (copyrightEl) {
        const copyright = about.copyright || "";
        copyrightEl.textContent = copyright;
        copyrightEl.classList.toggle("hidden", !copyright);
    }
}

function openProgramInfoDialog(event, infoOverride) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    hideMenuDropdowns();
    const info = infoOverride || currentProgramInfo || getProgramInfo(null);
    currentProgramInfo = info;
    const infoEvent = new CustomEvent("programInfoRequested", {
        detail: {
            modalId: info.modalId,
            info
        },
        cancelable: true
    });
    const dispatchResult = window.dispatchEvent(infoEvent);
    if (!dispatchResult) {
        return;
    }
    const fallbackId = info.fallbackInfoModalId;
    if (!fallbackId) {
        return;
    }
    if (fallbackId === "program-info-modal") {
        renderProgramInfo(info);
    }
    const dialogInstance = window.dialogs && window.dialogs[fallbackId];
    if (dialogInstance && typeof dialogInstance.open === "function") {
        dialogInstance.open();
    } else {
        const modalElement = document.getElementById(fallbackId);
        if (modalElement) {
            modalElement.classList.remove("hidden");
            bringDialogToFront(fallbackId);
            updateProgramLabelByTopModal();
        } else {
            console.warn(`Kein Fallback-Info-Dialog für ${fallbackId} gefunden.`);
        }
    }
}

function createMenuContext(modalId) {
    const resolvedId = modalId || null;
    const dialog = resolvedId && window.dialogs ? window.dialogs[resolvedId] : null;
    return {
        modalId: resolvedId,
        dialog,
        info: resolveProgramInfo(resolvedId)
    };
}

function registerMenuAction(handler) {
    // Diese Funktion ist jetzt in menu.js, wird aber hier noch als Fallback benötigt
    if (window.MenuSystem && window.MenuSystem.registerMenuAction) {
        return window.MenuSystem.registerMenuAction(handler);
    }
    return null;
}

function normalizeMenuItems(items, context) {
    // Diese Funktion ist jetzt in menu.js
    if (window.MenuSystem && window.MenuSystem.normalizeMenuItems) {
        return window.MenuSystem.normalizeMenuItems(items, context);
    }
    return [];
}

// ============================================================================
// renderApplicationMenu und handleMenuActionActivation sind VOLLSTÄNDIG in menu.js
// Diese werden über Aliase (Zeile 31-32) aufgerufen: window.MenuSystem.renderApplicationMenu
// Die alten Implementierungen wurden entfernt, um Konflikte zu vermeiden
// ============================================================================

// ============================================================================
// MENU-HELPER-FUNKTIONEN sind jetzt in menu.js
// createWindowMenuSection, getWindowMenuItems, createHelpMenuSection
// wurden nach menu.js verschoben.
// ============================================================================

// ============================================================================
// MENU-DEFINITIONEN sind jetzt in menu.js
// Die Funktionen buildDefaultMenuDefinition, buildFinderMenuDefinition, etc.
// wurden nach menu.js verschoben.
// ============================================================================

function closeContextWindow(context) {
    const dialog = context && context.dialog;
    if (dialog && typeof dialog.close === 'function') {
        dialog.close();
    } else if (context && context.modalId) {
        const modal = document.getElementById(context.modalId);
        if (modal && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
            saveOpenModals();
            updateDockIndicators();
            updateProgramLabelByTopModal();
        }
    }
}

function hasAnyVisibleDialog() {
    if (!window.dialogs) return false;
    return Object.values(window.dialogs).some(dialog => dialog && dialog.modal && !dialog.modal.classList.contains('hidden'));
}

function bringAllWindowsToFront() {
    if (!window.dialogs) return;
    modalIds.forEach(id => {
        const dialog = window.dialogs[id];
        if (dialog && dialog.modal && !dialog.modal.classList.contains('hidden') && typeof dialog.bringToFront === 'function') {
            dialog.bringToFront();
        }
    });
}

function openProgramInfoFromMenu(targetModalId) {
    const info = resolveProgramInfo(targetModalId || null);
    openProgramInfoDialog(null, info);
}

function sendTextEditorMenuAction(command) {
    if (!command) return;
    postToTextEditor({
        type: 'textEditor:menuAction',
        command
    });
}

function getImageViewerState() {
    const viewer = document.getElementById('image-viewer');
    if (!viewer) {
        return { hasImage: false, src: '' };
    }
    const hidden = viewer.classList.contains('hidden');
    const src = viewer.getAttribute('src') || viewer.src || '';
    const hasImage = Boolean(src && src.trim() && !hidden);
    return { hasImage, src };
}

function openActiveImageInNewTab() {
    const state = getImageViewerState();
    if (!state.hasImage || !state.src) return;
    window.open(state.src, '_blank', 'noopener');
}

function downloadActiveImage() {
    const state = getImageViewerState();
    if (!state.hasImage || !state.src) return;
    const link = document.createElement('a');
    link.href = state.src;
    let fileName = 'bild';
    try {
        const url = new URL(state.src, window.location.href);
        fileName = url.pathname.split('/').pop() || fileName;
    } catch (err) {
        fileName = 'bild';
    }
    link.download = fileName || 'bild';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function updateProgramLabelByTopModal() {
    const topModal = getTopModal();
    let info;
    if (topModal && topModal.id === "program-info-modal" && currentProgramInfo && currentProgramInfo.modalId) {
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
// Expose globally for use by storage module
window.updateProgramLabelByTopModal = updateProgramLabelByTopModal;

window.addEventListener("languagePreferenceChange", () => {
    const info = updateProgramLabelByTopModal();
    const programInfoModal = document.getElementById("program-info-modal");
    if (programInfoModal && !programInfoModal.classList.contains("hidden")) {
        const targetId = programInfoModal.dataset.infoTarget || (info ? info.modalId : null) || null;
        const infoForDialog = resolveProgramInfo(targetId);
        renderProgramInfo(infoForDialog);
        // Wenn der Programminfo-Dialog das aktive Programm repräsentiert, synchronisieren wir den aktuellen Zustand
        if (info && info.modalId === infoForDialog.modalId) {
            currentProgramInfo = infoForDialog;
        }
    }
    // System status UI is now handled by SystemUI module
    updateAllSystemStatusUI();
});

window.addEventListener('themePreferenceChange', () => {
    // System UI module will handle dark mode state updates
    updateAllSystemStatusUI();
});

function hideMenuDropdowns() {
    document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
        if (!dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
        }
    });
    document.querySelectorAll('[data-menubar-trigger-button="true"]').forEach(button => {
        button.setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('[data-system-menu-trigger]').forEach(button => {
        button.setAttribute('aria-expanded', 'false');
    });
}
// Expose globally for use by SystemUI module
window.hideMenuDropdowns = hideMenuDropdowns;

// Close menus only when clicking outside of menubar triggers and dropdowns
function handleDocumentClickToCloseMenus(event) {
    // Guard against immediate re-closing right after we opened via trigger
    if (window.__lastMenuInteractionAt && (Date.now() - window.__lastMenuInteractionAt) < 200) {
        return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    // If the click is inside a menubar trigger or an open dropdown, do nothing
    if (target.closest('.menubar-trigger') || target.closest('.menu-dropdown')) {
        return;
    }
    hideMenuDropdowns();
}

function isAnyDropdownOpen() {
    return Boolean(document.querySelector('.menu-dropdown:not(.hidden)'));
}

function toggleMenuDropdown(trigger, options = {}) {
    if (!trigger) return;
    const menuId = trigger.getAttribute('aria-controls');
    if (!menuId) return;
    const menu = document.getElementById(menuId);
    if (!menu) return;
    const forceOpen = Boolean(options.forceOpen);
    const wasOpen = !menu.classList.contains('hidden');
    const shouldOpen = forceOpen || !wasOpen;
    hideMenuDropdowns();
    if (shouldOpen) {
        menu.classList.remove('hidden');
        trigger.setAttribute('aria-expanded', 'true');
    }
}

function bindDropdownTrigger(trigger, options = {}) {
    if (!trigger) return;
    const hoverRequiresExisting = options.hoverRequiresOpen !== undefined ? options.hoverRequiresOpen : true;
    let clickJustOccurred = false;

    trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        clickJustOccurred = true;
        // Note the time of this interaction so the document closer ignores it
        window.__lastMenuInteractionAt = Date.now();
        // Always force open on click to avoid focus->click toggle race on first interaction
        toggleMenuDropdown(trigger, { forceOpen: true });
        // Reset flag after a short delay to allow hover to work again
        setTimeout(() => {
            clickJustOccurred = false;
        }, 200);
    });
    trigger.addEventListener('mouseenter', () => {
        // Ignore mouseenter if click just occurred to prevent immediate close
        if (clickJustOccurred) {
            return;
        }
        window.__lastMenuInteractionAt = Date.now();
        if (hoverRequiresExisting && !isAnyDropdownOpen()) {
            return;
        }
        toggleMenuDropdown(trigger, { forceOpen: true });
    });
    trigger.addEventListener('focus', () => {
        window.__lastMenuInteractionAt = Date.now();
        toggleMenuDropdown(trigger, { forceOpen: true });
    });
}
// Expose globally for use by SystemUI module
window.bindDropdownTrigger = bindDropdownTrigger;

// Zentrale Event-Handler für Menü und Dropdowns
function initEventHandlers() {
    const appleMenuTrigger = document.getElementById('apple-menu-trigger');
    const programLabel = document.getElementById('program-label');
    const dropdownAbout = document.getElementById('dropdown-about');
    const aboutProgramLink = document.getElementById('about-program');
    const resetLayoutButton = document.getElementById('dropdown-reset-layout');
    const closeProgramButton = document.getElementById('program-close-current');
    const settingsButton = document.getElementById('dropdown-settings');

    bindDropdownTrigger(appleMenuTrigger, { hoverRequiresOpen: true });
    bindDropdownTrigger(programLabel, { hoverRequiresOpen: true });

    document.addEventListener('click', handleMenuActionActivation);
    document.addEventListener('click', handleDocumentClickToCloseMenus);

    // Close any open dropdown with Escape for accessibility
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            hideMenuDropdowns();
        }
    });

    if (dropdownAbout) {
        dropdownAbout.addEventListener('click', (event) => {
            // Öffne das eigentliche "Über"-Modal (wie das Desktop-Icon) statt des allgemeinen
            // Programm‑Info Dialogs. Das verhindert, dass das Programm‑Info Modal (program-info-modal)
            // angezeigt wird und sorgt dafür, dass der gleiche Inhalt wie beim Desktop-Icon erscheint.
            event.preventDefault();
            event.stopPropagation();
            hideMenuDropdowns();
            // Reuse openDesktopItemById which knows how to open modal by desktop item id 'about'
            if (typeof openDesktopItemById === 'function') {
                openDesktopItemById('about');
                return;
            }
            // Fallback: direkte Öffnung des about-modal
            const dialogInstance = window.dialogs && window.dialogs['about-modal'];
            if (dialogInstance && typeof dialogInstance.open === 'function') {
                dialogInstance.open();
            } else {
                const modalElement = document.getElementById('about-modal');
                if (modalElement) {
                    modalElement.classList.remove('hidden');
                    bringDialogToFront('about-modal');
                    updateProgramLabelByTopModal();
                }
            }
        });
    }

    if (aboutProgramLink) {
        aboutProgramLink.addEventListener('click', (event) => {
            openProgramInfoDialog(event);
        });
    }

    if (resetLayoutButton) {
        resetLayoutButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            resetWindowLayout();
        });
    }

    if (settingsButton) {
        settingsButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            hideMenuDropdowns();
            window.dialogs["settings-modal"].open();
            updateProgramLabelByTopModal();
        });
    }

    if (closeProgramButton) {
        closeProgramButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            hideMenuDropdowns();
            const topModal = getTopModal();
            if (!topModal) {
                return;
            }
            const dialogInstance = window.dialogs && window.dialogs[topModal.id];
            if (dialogInstance && typeof dialogInstance.close === 'function') {
                dialogInstance.close();
            } else {
                topModal.classList.add('hidden');
                saveOpenModals();
                updateDockIndicators();
                updateProgramLabelByTopModal();
            }
        });
    }

    // Vereinheitlichte Registrierung der Close-Button Event Listener:
    const closeMapping = {
        "close-projects-modal": "projects-modal",
        "close-about-modal": "about-modal",
        "close-settings-modal": "settings-modal",
        "close-text-modal": "text-modal",
        "close-image-modal": "image-modal",
        "close-program-info-modal": "program-info-modal"
    };
    Object.entries(closeMapping).forEach(([btnId, modalId]) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (window.dialogs[modalId]) {
                    window.dialogs[modalId].close();
                } else {
                    const modal = document.getElementById(modalId);
                    if (modal) modal.classList.add("hidden");
                    saveOpenModals();
                    updateDockIndicators();
                    updateProgramLabelByTopModal();
                }
            });
        }
    });
}

// ============================================================================
// Persistence functions are now in storage.js (window.StorageSystem)
// ============================================================================

// Lädt GitHub-Repositories und cached sie im LocalStorage
function loadGithubRepos() {
    const username = "Marormur";
    const cacheKey = `githubRepos_${username}`;
    const cacheTimestampKey = `githubReposTimestamp_${username}`;
    const cacheDuration = 1000 * 60 * 60; // 1 Stunde
    const list = document.getElementById("repo-list");
    const fileList = document.getElementById("repo-files");
    const breadcrumbs = document.getElementById("finder-breadcrumbs");
    const finderMain = document.getElementById("finder-main");
    const finderPlaceholder = document.getElementById("finder-placeholder");
    const imageViewer = document.getElementById("image-viewer");
    const imageInfo = document.getElementById("image-info");
    const imagePlaceholder = document.getElementById("image-placeholder");
    if (!list || !fileList || !breadcrumbs || !finderMain || !finderPlaceholder || !imageViewer || !imageInfo || !imagePlaceholder) return;

    const supportsAbortController = typeof window.AbortController === "function";

    const state = {
        repos: [],
        selectedRepo: null,
        selectedPath: "",
        contentCache: {},
        repoButtons: new Map(),
        imageAbortController: null
    };

    let pendingFinderState = readFinderState();
    const RATE_LIMIT_ERROR = 'RATE_LIMIT';
    const NOT_FOUND_ERROR = 'NOT_FOUND';
    const githubHeaders = { Accept: 'application/vnd.github+json' };
    const withGithubOptions = (options = {}) => {
        const merged = Object.assign({}, options);
        const optionHeaders = options.headers || {};
        merged.headers = Object.assign({}, githubHeaders, optionHeaders);
        return merged;
    };
    const createRateLimitError = () => {
        const error = new Error("GitHub API rate limit reached");
        error.code = RATE_LIMIT_ERROR;
        return error;
    };
    const createNotFoundError = () => {
        const error = new Error("Requested GitHub resource was not found");
        error.code = NOT_FOUND_ERROR;
        return error;
    };
    const isRateLimitResponse = (res) => {
        if (!res) return false;
        if (res.status !== 403) return false;
        const remaining = res.headers ? res.headers.get('x-ratelimit-remaining') : null;
        return remaining === '0';
    };
    const assertGithubResponseOk = (res) => {
        if (res.ok) return res;
        if (res.status === 404) {
            throw createNotFoundError();
        }
        if (isRateLimitResponse(res)) {
            throw createRateLimitError();
        }
        const error = new Error(`GitHub API antwortete mit Status ${res.status}`);
        error.status = res.status;
        throw error;
    };
    const isRateLimitError = (error) => Boolean(error && error.code === RATE_LIMIT_ERROR);
    const isNotFoundError = (error) => Boolean(error && error.code === NOT_FOUND_ERROR);

    const textFileExtensions = [
        ".txt", ".md", ".markdown", ".mdx", ".json", ".jsonc", ".csv", ".tsv", ".yaml", ".yml",
        ".xml", ".html", ".htm", ".css", ".scss", ".sass", ".less",
        ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".vue",
        ".c", ".h", ".cpp", ".hpp", ".cc", ".cxx", ".hh", ".ino",
        ".java", ".kt", ".kts", ".swift", ".cs", ".py", ".rb", ".php", ".rs", ".go",
        ".sh", ".bash", ".zsh", ".fish", ".ps1", ".bat", ".cmd",
        ".ini", ".cfg", ".conf", ".config", ".env", ".gitignore", ".gitattributes",
        ".log", ".sql"
    ];

    const imageFileExtensions = [
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".svg", ".tiff", ".tif", ".heic", ".heif", ".avif"
    ];

    const isProbablyTextFile = (name) => {
        if (!name || typeof name !== "string") return false;
        const lower = name.toLowerCase();
        return textFileExtensions.some(ext => lower.endsWith(ext));
    };

    const isImageFile = (name) => {
        if (!name || typeof name !== "string") return false;
        const lower = name.toLowerCase();
        return imageFileExtensions.some(ext => lower.endsWith(ext));
    };

    const getTextEditorIframe = () => {
        const dialog = window.dialogs ? window.dialogs["text-modal"] : null;
        if (!dialog || !dialog.modal) return null;
        return dialog.modal.querySelector("iframe");
    };

    const postToTextEditor = (message, attempt = 0) => {
        if (!message || typeof message !== "object") {
            return;
        }
        const iframe = getTextEditorIframe();
        if (iframe && iframe.contentWindow) {
            let targetOrigin = '*';
            if (window.location && typeof window.location.origin === 'string' && window.location.origin !== 'null') {
                targetOrigin = window.location.origin;
            }
            iframe.contentWindow.postMessage(message, targetOrigin);
            return;
        }
        if (attempt < 10) {
            setTimeout(() => postToTextEditor(message, attempt + 1), 120);
        } else {
            console.warn("Texteditor iframe nicht verfügbar, Nachricht konnte nicht gesendet werden.", message);
        }
    };

    const decodeBase64ToText = (input) => {
        if (typeof input !== "string") return null;
        try {
            const cleaned = input.replace(/\s/g, "");
            if (typeof window.atob !== "function") {
                console.warn("window.atob ist nicht verfügbar.");
                return null;
            }
            const binary = window.atob(cleaned);
            if (typeof window.TextDecoder === "function") {
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i += 1) {
                    bytes[i] = binary.charCodeAt(i);
                }
                return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
            }
            // Fallback für sehr alte Browser
            const percentEncoded = Array.prototype.map.call(binary, (char) => {
                return `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`;
            }).join("");
            return decodeURIComponent(percentEncoded);
        } catch (err) {
            console.error("Konnte Base64-Inhalt nicht dekodieren:", err);
            return null;
        }
    };

    const ensureTextEditorOpen = () => {
        const dialog = window.dialogs ? window.dialogs["text-modal"] : null;
        if (dialog && typeof dialog.open === "function") {
            dialog.open();
            return dialog;
        }
        if (typeof showTab === "function") {
            showTab("text");
        }
        return null;
    };

    const ensureImageViewerOpen = () => {
        const dialog = window.dialogs ? window.dialogs["image-modal"] : null;
        if (dialog && typeof dialog.open === "function") {
            dialog.open();
            return dialog;
        }
        if (typeof showTab === "function") {
            showTab("image");
        }
        return null;
    };

    let imagePlaceholderState = null;
    const setImagePlaceholder = (messageKey, params) => {
        if (!imagePlaceholder) return;
        if (typeof messageKey !== "string" || messageKey.length === 0) {
            imagePlaceholder.removeAttribute("data-i18n");
            imagePlaceholder.removeAttribute("data-i18n-params");
            imagePlaceholder.textContent = "";
            imagePlaceholder.classList.add("hidden");
            imagePlaceholderState = null;
            return;
        }
        imagePlaceholder.setAttribute("data-i18n", messageKey);
        if (params && Object.keys(params).length > 0) {
            imagePlaceholder.setAttribute("data-i18n-params", JSON.stringify(params));
        } else {
            imagePlaceholder.removeAttribute("data-i18n-params");
        }
        imagePlaceholderState = { key: messageKey, params: params || undefined };
        appI18n.applyTranslations(imagePlaceholder);
        imagePlaceholder.classList.remove("hidden");
    };

    window.addEventListener("languagePreferenceChange", () => {
        if (imagePlaceholderState) {
            setImagePlaceholder(imagePlaceholderState.key, imagePlaceholderState.params);
        }
    });

    const updateImageInfo = ({ repo, path, dimensions, size }) => {
        if (!imageInfo) return;
        const parts = [];
        if (repo) parts.push(repo);
        if (path) parts.push(path);
        const meta = [];
        if (dimensions) meta.push(dimensions);
        if (typeof size === "number" && size > 0) {
            const kb = (size / 1024).toFixed(1);
            meta.push(`${kb} KB`);
        }
        const info = [
            parts.join(" / "),
            meta.join(" • ")
        ].filter(Boolean).join(" — ");
        if (info) {
            imageInfo.textContent = info;
            imageInfo.classList.remove("hidden");
        } else {
            imageInfo.textContent = "";
            imageInfo.classList.add("hidden");
        }
    };

    const openImageFileInViewer = (repoName, path, entry) => {
        if (!entry || !entry.name) return;
        const viewerDialog = ensureImageViewerOpen();
        const filePath = path ? `${path}/${entry.name}` : entry.name;

        if (supportsAbortController && state.imageAbortController) {
            state.imageAbortController.abort();
        }
        state.imageAbortController = supportsAbortController ? new AbortController() : null;

        if (imageViewer) {
            imageViewer.src = "";
            imageViewer.classList.add("hidden");
        }
        updateImageInfo({ repo: repoName, path: filePath, size: entry.size });
        setImagePlaceholder("finder.loadingImage", { name: entry.name });

        const finalize = (src) => {
            if (!imageViewer) return;
            imageViewer.onload = () => {
                const natural = `${imageViewer.naturalWidth} × ${imageViewer.naturalHeight}px`;
                updateImageInfo({ repo: repoName, path: filePath, size: entry.size, dimensions: natural });
                setImagePlaceholder("");
                imageViewer.classList.remove("hidden");
                renderApplicationMenu('image-modal');
                if (viewerDialog && typeof viewerDialog.bringToFront === "function") {
                    viewerDialog.bringToFront();
                }
            };
            imageViewer.onerror = () => {
                setImagePlaceholder("finder.imageLoadError");
                imageViewer.classList.add("hidden");
                renderApplicationMenu('image-modal');
            };
            imageViewer.src = src;
        };

        const downloadUrl = entry.download_url;
        if (downloadUrl) {
            finalize(downloadUrl);
            return;
        }

        const fetchOptions = supportsAbortController && state.imageAbortController
            ? withGithubOptions({ signal: state.imageAbortController.signal })
            : withGithubOptions();

        fetch(repoPathToUrl(repoName, filePath), fetchOptions)
            .then(res => {
                assertGithubResponseOk(res);
                return res.json();
            })
            .then(data => {
                if (!data || typeof data !== "object" || data.type !== "file") {
                    throw new Error("Unerwartetes Antwortformat beim Laden einer Bilddatei.");
                }
                if (typeof data.download_url === "string") {
                    finalize(data.download_url);
                    return;
                }
                if (data.encoding === "base64" && typeof data.content === "string") {
                    const cleaned = data.content.replace(/\s/g, "");
                    finalize(`data:${data.content_type || "image/*"};base64,${cleaned}`);
                    return;
                }
                throw new Error("Keine Quelle für das Bild verfügbar.");
            })
            .catch(err => {
                if (err.name === "AbortError") {
                    return;
                }
                if (isRateLimitError(err)) {
                    setImagePlaceholder("finder.rateLimit");
                } else {
                    console.error("Fehler beim Laden der Bilddatei:", err);
                    setImagePlaceholder("finder.imageLoadErrorRetry");
                }
            });
    };

    const openTextFileInEditor = (repoName, path, entry) => {
        if (!entry || !entry.name) return;
        const textDialog = ensureTextEditorOpen();
        const filePath = path ? `${path}/${entry.name}` : entry.name;
        const payloadBase = {
            repo: repoName,
            path: filePath,
            fileName: entry.name,
            size: entry.size
        };
        postToTextEditor({
            type: "textEditor:showLoading",
            payload: payloadBase
        });

        const fetchContent = () => {
            if (entry.download_url) {
                return fetch(entry.download_url).then(res => {
                    if (!res.ok) {
                        throw new Error(`Download-URL antwortete mit Status ${res.status}`);
                    }
                    return res.text();
                });
            }
            return fetch(repoPathToUrl(repoName, filePath), withGithubOptions())
                .then(res => {
                    assertGithubResponseOk(res);
                    return res.json();
                })
                .then(fileData => {
                    if (!fileData || typeof fileData !== "object" || fileData.type !== "file") {
                        throw new Error("Unerwartetes Antwortformat beim Laden einer Datei.");
                    }
                    if (fileData.encoding === "base64" && typeof fileData.content === "string") {
                        const decoded = decodeBase64ToText(fileData.content);
                        if (decoded === null) {
                            throw new Error("Base64-Inhalt konnte nicht dekodiert werden.");
                        }
                        return decoded;
                    }
                    if (typeof fileData.download_url === "string") {
                        return fetch(fileData.download_url).then(res => {
                            if (!res.ok) {
                                throw new Error(`Download-URL antwortete mit Status ${res.status}`);
                            }
                            return res.text();
                        });
                    }
                    throw new Error("Keine gültige Quelle für den Dateiinhalt gefunden.");
                });
        };

        fetchContent()
            .then(content => {
                postToTextEditor({
                    type: "textEditor:loadRemoteFile",
                    payload: Object.assign({}, payloadBase, {
                        content
                    })
                });
                if (textDialog && typeof textDialog.bringToFront === "function") {
                    textDialog.bringToFront();
                }
            })
            .catch(err => {
                console.error("Fehler beim Laden der Datei für den Texteditor:", err);
                const messageKey = isRateLimitError(err) ? "textEditor.status.rateLimit" : "finder.fileLoadError";
                postToTextEditor({
                    type: "textEditor:loadError",
                    payload: Object.assign({}, payloadBase, {
                        message: appI18n.translate(messageKey)
                    })
                });
            });
    };

    const showPlaceholder = () => {
        finderPlaceholder.classList.remove("hidden");
        finderMain.classList.add("hidden");
        breadcrumbs.textContent = "";
        fileList.innerHTML = "";
    };

    const renderFileMessage = (messageKey, params) => {
        fileList.innerHTML = "";
        const item = document.createElement("li");
        item.className = "px-4 py-3 text-sm text-gray-500 dark:text-gray-400";
        item.setAttribute("data-i18n", messageKey);
        if (params && Object.keys(params).length > 0) {
            item.setAttribute("data-i18n-params", JSON.stringify(params));
        }
        appI18n.applyTranslations(item);
        fileList.appendChild(item);
    };

    const renderEmptySidebarState = (messageKey) => {
        list.innerHTML = "";
        const item = document.createElement("li");
        item.className = "px-4 py-3 text-sm text-gray-500 dark:text-gray-400";
        item.setAttribute("data-i18n", messageKey);
        appI18n.applyTranslations(item);
        list.appendChild(item);
        showPlaceholder();
    };

    const updateSidebarHighlight = () => {
        state.repoButtons.forEach((button, repoName) => {
            if (repoName === state.selectedRepo) {
                button.classList.add("bg-blue-100", "dark:bg-blue-900/40", "border-l-blue-500", "dark:border-l-blue-400");
            } else {
                button.classList.remove("bg-blue-100", "dark:bg-blue-900/40", "border-l-blue-500", "dark:border-l-blue-400");
            }
        });
    };

    const renderBreadcrumbs = (repoName, path) => {
        breadcrumbs.innerHTML = "";
        const elements = [];

        const createCrumbButton = (label, targetPath) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "text-blue-600 dark:text-blue-400 hover:underline";
            button.textContent = label;
            button.addEventListener("click", () => loadRepoPath(repoName, targetPath));
            return button;
        };

        elements.push(createCrumbButton(repoName, ""));

        if (path) {
            const segments = path.split("/").filter(Boolean);
            let cumulative = "";
            segments.forEach(segment => {
                cumulative = cumulative ? `${cumulative}/${segment}` : segment;
                elements.push(createCrumbButton(segment, cumulative));
            });
        }

        elements.forEach((element, index) => {
            if (index > 0) {
                breadcrumbs.appendChild(document.createTextNode(" / "));
            }
            breadcrumbs.appendChild(element);
        });
    };

    const parentPath = (path) => {
        if (!path) return "";
        const parts = path.split("/").filter(Boolean);
        parts.pop();
        return parts.join("/");
    };

    const storeCacheEntry = (repoName, path, contents) => {
        const normalized = path || "";
        if (!state.contentCache[repoName]) {
            state.contentCache[repoName] = {};
        }
        state.contentCache[repoName][normalized] = contents;
    };

    const readCacheEntry = (repoName, path) => {
        const normalized = path || "";
        return state.contentCache[repoName] ? state.contentCache[repoName][normalized] : undefined;
    };

    const renderFiles = (contents, repoName, path) => {
        fileList.innerHTML = "";
        if (!Array.isArray(contents) || contents.length === 0) {
            renderFileMessage("finder.emptyDirectory");
            return;
        }

        if (path) {
            const li = document.createElement("li");
            const button = document.createElement("button");
            button.type = "button";
            button.className = "w-full text-left px-4 py-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700";
            const backWrapper = document.createElement("span");
            backWrapper.className = "flex items-center gap-2";
            const backIcon = document.createElement("span");
            backIcon.textContent = "◀︎";
            const backLabel = document.createElement("span");
            backLabel.className = "font-medium";
            backLabel.setAttribute("data-i18n", "finder.back");
            appI18n.applyTranslations(backLabel);
            backWrapper.appendChild(backIcon);
            backWrapper.appendChild(backLabel);
            button.appendChild(backWrapper);
            button.addEventListener("click", () => loadRepoPath(repoName, parentPath(path)));
            li.appendChild(button);
            fileList.appendChild(li);
        }

        const sorted = contents.slice().sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name, "de", { sensitivity: "base" });
            }
            return a.type === "dir" ? -1 : 1;
        });

        sorted.forEach(entry => {
            const li = document.createElement("li");
            if (entry.type === "dir") {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition";
                const label = document.createElement("span");
                label.className = "flex items-center gap-2 text-gray-700 dark:text-gray-200";
                const folderIcon = document.createElement("span");
                folderIcon.textContent = "📁";
                const folderName = document.createElement("span");
                folderName.className = "font-medium";
                folderName.textContent = entry.name;
                label.appendChild(folderIcon);
                label.appendChild(folderName);
                const chevron = document.createElement("span");
                chevron.className = "text-gray-400";
                chevron.textContent = "›";
                button.appendChild(label);
                button.appendChild(chevron);
                button.addEventListener("click", () => {
                    const nextPath = path ? `${path}/${entry.name}` : entry.name;
                    loadRepoPath(repoName, nextPath);
                });
                li.appendChild(button);
            } else if (isImageFile(entry.name)) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "w-full text-left px-4 py-3 flex items-center justify-between gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition";
                const label = document.createElement("span");
                label.className = "flex items-center gap-2";
                const fileIcon = document.createElement("span");
                fileIcon.textContent = "🖼️";
                const fileName = document.createElement("span");
                fileName.textContent = entry.name;
                label.appendChild(fileIcon);
                label.appendChild(fileName);
                button.appendChild(label);
                const openHint = document.createElement("span");
                openHint.className = "text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider";
                openHint.setAttribute("data-i18n", "finder.imageViewer");
                appI18n.applyTranslations(openHint);
                button.appendChild(openHint);
                button.addEventListener("click", () => openImageFileInViewer(repoName, path, entry));
                li.appendChild(button);
            } else if (isProbablyTextFile(entry.name)) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "w-full text-left px-4 py-3 flex items-center justify-between gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition";
                const label = document.createElement("span");
                label.className = "flex items-center gap-2";
                const fileIcon = document.createElement("span");
                fileIcon.textContent = "📄";
                const fileName = document.createElement("span");
                fileName.textContent = entry.name;
                label.appendChild(fileIcon);
                label.appendChild(fileName);
                button.appendChild(label);
                const openHint = document.createElement("span");
                openHint.className = "text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider";
                openHint.setAttribute("data-i18n", "finder.textEditor");
                appI18n.applyTranslations(openHint);
                button.appendChild(openHint);
                button.addEventListener("click", () => openTextFileInEditor(repoName, path, entry));
                li.appendChild(button);
            } else {
                const link = document.createElement("a");
                link.href = entry.html_url || entry.download_url || "#";
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.className = "block px-4 py-3 flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition";
                const fileIcon = document.createElement("span");
                fileIcon.textContent = "📄";
                const fileName = document.createElement("span");
                fileName.textContent = entry.name;
                link.appendChild(fileIcon);
                link.appendChild(fileName);
                li.appendChild(link);
            }
            fileList.appendChild(li);
        });
    };

    const repoPathToUrl = (repoName, path) => {
        const encodedSegments = path ? path.split("/").filter(Boolean).map(encodeURIComponent).join("/") : "";
        return `https://api.github.com/repos/${username}/${repoName}/contents${encodedSegments ? "/" + encodedSegments : ""}`;
    };

    const loadRepoPath = (repoName, path = "") => {
        pendingFinderState = null;
        state.selectedRepo = repoName;
        state.selectedPath = path;
        finderPlaceholder.classList.add("hidden");
        finderMain.classList.remove("hidden");
        updateSidebarHighlight();
        renderBreadcrumbs(repoName, path);
        if (repoName) {
            writeFinderState({ repo: repoName, path });
        } else {
            clearFinderState();
        }

        const cached = readCacheEntry(repoName, path);
        if (cached) {
            renderFiles(cached, repoName, path);
            return;
        }

        renderFileMessage("finder.loadingFiles");
        fetch(repoPathToUrl(repoName, path), withGithubOptions())
            .then(res => {
                assertGithubResponseOk(res);
                return res.json();
            })
            .then(contents => {
                if (!Array.isArray(contents)) {
                    throw new Error("Unerwartetes Antwortformat der GitHub API");
                }
                storeCacheEntry(repoName, path, contents);
                renderFiles(contents, repoName, path);
            })
            .catch(err => {
                if (isRateLimitError(err)) {
                    renderFileMessage("finder.rateLimit");
                } else if (isNotFoundError(err)) {
                    renderFileMessage("finder.pathNotFound");
                    if (state.selectedRepo === repoName && state.selectedPath === path) {
                        writeFinderState({ repo: repoName, path: "" });
                    }
                } else {
                    console.error("Fehler beim Laden der Repo-Inhalte:", err);
                    renderFileMessage("finder.filesLoadError");
                }
            });
    };

    const renderRepos = (repos) => {
        list.innerHTML = "";
        state.repoButtons.clear();
        state.repos = Array.isArray(repos) ? repos.slice() : [];
        if (!Array.isArray(repos) || repos.length === 0) {
            clearFinderState();
            renderEmptySidebarState("finder.noRepositories");
            return;
        }

        const locale = appI18n.getActiveLanguage ? appI18n.getActiveLanguage() : "de";
        state.repos
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: "base" }))
            .forEach(repo => {
                const item = document.createElement("li");
                const button = document.createElement("button");
                button.type = "button";
                button.className = "w-full px-4 py-3 text-left flex flex-col gap-1 border-l-4 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition";
                const name = document.createElement("span");
                name.className = "font-semibold text-gray-800 dark:text-gray-100 truncate";
                if (repo.name) {
                    name.textContent = repo.name;
                    name.removeAttribute("data-i18n");
                } else {
                    name.setAttribute("data-i18n", "finder.repoUnnamed");
                    appI18n.applyTranslations(name);
                }
                const description = document.createElement("span");
                description.className = "text-sm text-gray-500 dark:text-gray-400 truncate";
                if (repo.description) {
                    description.textContent = repo.description;
                    description.removeAttribute("data-i18n");
                } else {
                    description.setAttribute("data-i18n", "finder.repoDescriptionMissing");
                    appI18n.applyTranslations(description);
                }
                button.appendChild(name);
                button.appendChild(description);
                item.appendChild(button);
                list.appendChild(item);
                if (repo.name) {
                    button.addEventListener("click", () => loadRepoPath(repo.name, ""));
                    state.repoButtons.set(repo.name, button);
                } else {
                    button.disabled = true;
                }
            });

        updateSidebarHighlight();

        if (pendingFinderState && typeof pendingFinderState.repo === "string") {
            if (state.repoButtons.has(pendingFinderState.repo)) {
                const target = pendingFinderState;
                pendingFinderState = null;
                loadRepoPath(target.repo, target.path || "");
                return;
            }
            pendingFinderState = null;
            clearFinderState();
        }

        if (state.selectedRepo && state.repoButtons.has(state.selectedRepo)) {
            return;
        }
        if (state.selectedRepo && !state.repoButtons.has(state.selectedRepo)) {
            clearFinderState();
            state.selectedRepo = null;
            state.selectedPath = "";
        }
        showPlaceholder();
    };

    const tryRenderCachedRepos = () => {
        const cachedRepos = localStorage.getItem(cacheKey);
        const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
        if (!cachedRepos || !cachedTimestamp) {
            return { served: false, fresh: false };
        }
        try {
            const parsed = JSON.parse(cachedRepos);
            if (!Array.isArray(parsed)) {
                return { served: false, fresh: false };
            }
            renderRepos(parsed);
            const age = Date.now() - parseInt(cachedTimestamp, 10);
            const isFresh = Number.isFinite(age) && age < cacheDuration;
            return { served: true, fresh: isFresh };
        } catch (err) {
            console.warn("Konnte Cache nicht lesen:", err);
            return { served: false, fresh: false };
        }
    };

    const cacheStatus = tryRenderCachedRepos();
    if (cacheStatus.fresh) {
        return;
    }

    fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, withGithubOptions())
        .then(res => {
            assertGithubResponseOk(res);
            return res.json();
        })
        .then(repos => {
            if (!Array.isArray(repos)) {
                throw new Error("Unerwartetes Antwortformat der GitHub API");
            }
            localStorage.setItem(cacheKey, JSON.stringify(repos));
            localStorage.setItem(cacheTimestampKey, Date.now().toString());
            renderRepos(repos);
        })
        .catch(err => {
            console.error("Fehler beim Laden der Repos:", err);
            if (!cacheStatus.served) {
                if (isRateLimitError(err)) {
                    clearFinderState();
                    renderEmptySidebarState("finder.rateLimit");
                } else {
                    renderEmptySidebarState("finder.repositoriesError");
                }
            }
        });
}

// Hilfsfunktionen für das Laden des Parent-Dialogs
function loaded(node) {
    const dialogId = recursiveParentSearch(node);
    if (!dialogId) return null;
    if (window.dialogs && window.dialogs[dialogId]) {
        return window.dialogs[dialogId];
    }
    const dialog = new Dialog(dialogId);
    if (!window.dialogs) {
        window.dialogs = {};
    }
    window.dialogs[dialogId] = dialog;
    return dialog;
}

function recursiveParentSearch(node) {
    if (node.classList != undefined && node.classList.contains("modal")) {
        return node.id.toString();
    }
    else if (node.parentNode == null)
        return null;
    else return recursiveParentSearch(node.parentNode);
}

function updateDockIndicators() {
    // Definiere hier, welche Modale mit welchen Indikatoren verbunden werden sollen.
    const indicatorMappings = [
        { modalId: "projects-modal", indicatorId: "projects-indicator" },
        { modalId: "settings-modal", indicatorId: "settings-indicator" },
        { modalId: "text-modal", indicatorId: "text-indicator" },
        { modalId: "image-modal", indicatorId: "image-indicator" }
    ];
    indicatorMappings.forEach(mapping => {
        const modal = document.getElementById(mapping.modalId);
        const indicator = document.getElementById(mapping.indicatorId);
        if (modal && indicator) {
            // Dot anzeigen, wenn Fenster sichtbar ODER minimiert ist
            const minimized = modal.dataset && modal.dataset.minimized === 'true';
            if (!modal.classList.contains("hidden") || minimized) {
                indicator.classList.remove("hidden");
            } else {
                indicator.classList.add("hidden");
            }
        }
    });
}
// Expose globally for use by storage module
window.updateDockIndicators = updateDockIndicators;

// Blendet alle Sektionen der Einstellungen aus und zeigt nur die gewünschte an
function showSettingsSection(section) {
    const allSections = ["settings-general", "settings-display", "settings-about", "settings-network", "settings-battery"];
    allSections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add("hidden");
        }
    });
    const target = document.getElementById(`settings-${section}`);
    if (target) {
        target.classList.remove("hidden");
    }
}

// Dialog-Klasse wurde nach js/dialog.js extrahiert und steht global als window.Dialog zur Verfügung.
