(function () {
    'use strict';

    type EditorMessage = { type: string; command?: string; payload?: unknown };
    type GlobalWindow = {
        dialogs?: Record<string, { modal?: HTMLElement | null } | undefined>;
        postToTextEditor?: (msg: EditorMessage) => void;
        getImageViewerState?: () => { hasImage: boolean; src: string };
        openActiveImageInNewTab?: () => void;
        downloadActiveImage?: () => void;
        sendTextEditorMenuAction?: (command: string) => void;
    } & Window;

    const gw = (window as unknown as GlobalWindow);

    // --- Text Editor Menu Action Bridge ---
    function getTextEditorIframe(): HTMLIFrameElement | null {
        const dialogs = gw.dialogs;
        const dialog = dialogs ? dialogs['text-modal'] : null;
        if (!dialog || !dialog.modal) return null;
        return dialog.modal.querySelector('iframe');
    }

    function postToTextEditor(message: EditorMessage, attempt = 0): void {
        if (!message || typeof message !== 'object') return;
        // Prefer legacy global if available
        const legacy = gw.postToTextEditor;
        if (typeof legacy === 'function') {
            legacy(message);
            return;
        }
        const iframe = getTextEditorIframe();
        if (iframe && iframe.contentWindow) {
            let targetOrigin = '*';
            if (
                window.location &&
                typeof window.location.origin === 'string' &&
                window.location.origin !== 'null'
            ) {
                targetOrigin = window.location.origin;
            }
            iframe.contentWindow.postMessage(message, targetOrigin);
            return;
        }
        if (attempt < 10) {
            setTimeout(() => postToTextEditor(message, attempt + 1), 120);
        } else {
            console.warn('Texteditor iframe nicht verfügbar, Nachricht verworfen.', message);
        }
    }

    function sendTextEditorMenuAction(command: string): void {
        if (!command) return;
        postToTextEditor({ type: 'textEditor:menuAction', command });
    }

    // --- Image Viewer Helpers ---
    function getImageViewerState(): { hasImage: boolean; src: string } {
        const viewer = document.getElementById('image-viewer') as HTMLImageElement | null;
        if (!viewer) return { hasImage: false, src: '' };
        const hidden = viewer.classList.contains('hidden');
        const src = viewer.getAttribute('src') || viewer.src || '';
        const hasImage = Boolean(src && src.trim() && !hidden);
        return { hasImage, src };
    }

    function openActiveImageInNewTab(): void {
        const state = getImageViewerState();
        if (!state.hasImage || !state.src) return;
        window.open(state.src, '_blank', 'noopener');
    }

    function downloadActiveImage(): void {
        const state = getImageViewerState();
        if (!state.hasImage || !state.src) return;
        const link = document.createElement('a');
        link.href = state.src;
        let fileName = 'bild';
        try {
            const url = new URL(state.src, window.location.href);
            fileName = url.pathname.split('/').pop() || fileName;
        } catch {
            fileName = 'bild';
        }
        link.download = fileName || 'bild';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Export globals (do not override if already present)
    if (typeof gw.getImageViewerState !== 'function') gw.getImageViewerState = getImageViewerState;
    if (typeof gw.openActiveImageInNewTab !== 'function') gw.openActiveImageInNewTab = openActiveImageInNewTab;
    if (typeof gw.downloadActiveImage !== 'function') gw.downloadActiveImage = downloadActiveImage;
    if (typeof gw.sendTextEditorMenuAction !== 'function') gw.sendTextEditorMenuAction = sendTextEditorMenuAction;
})();
