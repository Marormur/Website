(function () {
    'use strict';

    type PlaceholderState = { key: string; params?: Record<string, unknown> } | null;

    function getEl(id: string): HTMLElement | null {
        return document.getElementById(id);
    }

    function applyTranslations(el: HTMLElement | null): void {
        const w = window as unknown as { appI18n?: { applyTranslations: (n?: Element) => void } };
        if (el && w.appI18n && typeof w.appI18n.applyTranslations === 'function') {
            w.appI18n.applyTranslations(el);
        }
    }

    function setPlaceholder(messageKey: string, params?: Record<string, unknown>): void {
        const placeholder = getEl('image-placeholder');
        if (!placeholder) return;
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
        } else {
            placeholder.removeAttribute('data-i18n-params');
        }
        state.placeholder = { key: messageKey, params };
        applyTranslations(placeholder);
        placeholder.classList.remove('hidden');
    }

    function updateInfo(opts: { repo?: string; path?: string; dimensions?: string; size?: number }): void {
        const infoEl = getEl('image-info');
        if (!infoEl) return;
        const parts: string[] = [];
        if (opts.repo) parts.push(opts.repo);
        if (opts.path) parts.push(opts.path);
        const meta: string[] = [];
        if (opts.dimensions) meta.push(opts.dimensions);
        if (typeof opts.size === 'number' && opts.size > 0) {
            const kb = (opts.size / 1024).toFixed(1);
            meta.push(`${kb} KB`);
        }
        const info = [parts.join(' / '), meta.join(' • ')].filter(Boolean).join(' — ');
        if (info) {
            infoEl.textContent = info;
            infoEl.classList.remove('hidden');
        } else {
            infoEl.textContent = '';
            infoEl.classList.add('hidden');
        }
    }

    const state: { placeholder: PlaceholderState } = { placeholder: null };

    // Re-apply placeholder on language change
    const gw = window as unknown as Window & { __imageViewerUtilsWired?: boolean };
    if (!gw.__imageViewerUtilsWired) {
        gw.__imageViewerUtilsWired = true;
        window.addEventListener('languagePreferenceChange', () => {
            if (state.placeholder) {
                setPlaceholder(state.placeholder.key, state.placeholder.params);
            }
        });
    }

    // Export as globals (namespaced + legacy aliases if free)
    type ImageViewerGlobal = Window & {
        ImageViewerUtils?: { setPlaceholder?: typeof setPlaceholder; updateInfo?: typeof updateInfo };
        setImagePlaceholder?: typeof setPlaceholder;
        updateImageInfo?: typeof updateInfo;
    };
    const w = window as unknown as ImageViewerGlobal;
    w.ImageViewerUtils = w.ImageViewerUtils || {};
    w.ImageViewerUtils.setPlaceholder = setPlaceholder;
    w.ImageViewerUtils.updateInfo = updateInfo;
    if (typeof w.setImagePlaceholder !== 'function') w.setImagePlaceholder = setPlaceholder;
    if (typeof w.updateImageInfo !== 'function') w.updateImageInfo = updateInfo;
})();
