"use strict";
(function () {
    'use strict';
    function getEl(id) {
        return document.getElementById(id);
    }
    function applyTranslations(el) {
        const w = window;
        if (el && w.appI18n && typeof w.appI18n.applyTranslations === 'function') {
            w.appI18n.applyTranslations(el);
        }
    }
    function setPlaceholder(messageKey, params) {
        const placeholder = getEl('image-placeholder');
        if (!placeholder)
            return;
        if (typeof messageKey !== 'string' || messageKey.length === 0) {
            placeholder.removeAttribute('data-i18n');
            placeholder.removeAttribute('data-i18n-params');
            placeholder.textContent = '';
            placeholder.classList.add('hidden');
            state.placeholder = null;
            return;
        }
        placeholder.setAttribute('data-i18n', messageKey);
        if (params && Object.keys(params).length > 0) {
            placeholder.setAttribute('data-i18n-params', JSON.stringify(params));
        }
        else {
            placeholder.removeAttribute('data-i18n-params');
        }
        state.placeholder = { key: messageKey, params };
        applyTranslations(placeholder);
        placeholder.classList.remove('hidden');
    }
    function updateInfo(opts) {
        const infoEl = getEl('image-info');
        if (!infoEl)
            return;
        const parts = [];
        if (opts.repo)
            parts.push(opts.repo);
        if (opts.path)
            parts.push(opts.path);
        const meta = [];
        if (opts.dimensions)
            meta.push(opts.dimensions);
        if (typeof opts.size === 'number' && opts.size > 0) {
            const kb = (opts.size / 1024).toFixed(1);
            meta.push(`${kb} KB`);
        }
        const info = [parts.join(' / '), meta.join(' • ')].filter(Boolean).join(' — ');
        if (info) {
            infoEl.textContent = info;
            infoEl.classList.remove('hidden');
        }
        else {
            infoEl.textContent = '';
            infoEl.classList.add('hidden');
        }
    }
    const state = { placeholder: null };
    // Re-apply placeholder on language change
    const gw = window;
    if (!gw.__imageViewerUtilsWired) {
        gw.__imageViewerUtilsWired = true;
        window.addEventListener('languagePreferenceChange', () => {
            if (state.placeholder) {
                setPlaceholder(state.placeholder.key, state.placeholder.params);
            }
        });
    }
    const w = window;
    w.ImageViewerUtils = w.ImageViewerUtils || {};
    w.ImageViewerUtils.setPlaceholder = setPlaceholder;
    w.ImageViewerUtils.updateInfo = updateInfo;
    if (typeof w.setImagePlaceholder !== 'function')
        w.setImagePlaceholder = setPlaceholder;
    if (typeof w.updateImageInfo !== 'function')
        w.updateImageInfo = updateInfo;
})();
//# sourceMappingURL=image-viewer-utils.js.map