console.log('KeyboardShortcuts loaded');

/**
 * KeyboardShortcuts - Global keyboard shortcut manager
 *
 * Handles keyboard shortcuts for multi-instance window management:
 * - Cmd/Ctrl+N: New instance
 * - Cmd/Ctrl+W: Close instance
 * - Cmd/Ctrl+Tab: Next tab
 * - Cmd/Ctrl+Shift+Tab: Previous tab
 * - Cmd/Ctrl+1-9: Jump to specific tab
 */
(function () {
    'use strict';

    /**
     * Keyboard Shortcut Manager
     */
    class KeyboardShortcutManager {
        constructor() {
            this.shortcuts = new Map();
            this.enabled = true;
            this.isInitialized = false;
            // Optional: resolve current context dynamically (e.g., which modal is active)
            /** @type {(() => string)|null} */
            this.contextResolver = null;

            // Shortcuts that should work even when typing in input fields
            this.inputFieldAllowlist = [
                'ctrl+w', // Close tab
                'ctrl+tab', // Next tab
                'ctrl+shift+tab', // Previous tab
            ];
        }

        /**
         * Initialize keyboard shortcuts
         */
        init() {
            if (this.isInitialized) {
                console.warn('KeyboardShortcutManager already initialized');
                return;
            }

            // Global keyboard listener
            document.addEventListener('keydown', (e) => {
                if (!this.enabled) return;
                this.handleKeyDown(e);
            });

            this.isInitialized = true;
            console.log('KeyboardShortcutManager initialized');
        }

        /**
         * Register a keyboard shortcut
         * @param {Object} config
         * @param {string} config.key - Key to press (e.g., 'n', 'w', 'Tab')
         * @param {boolean} config.ctrl - Requires Ctrl/Cmd key
         * @param {boolean} config.shift - Requires Shift key
         * @param {boolean} config.alt - Requires Alt/Option key
         * @param {Function} config.handler - Function to call when shortcut is pressed
         * @param {string} config.description - Description of the shortcut
         * @param {string} config.context - Context where shortcut is active (default: 'global')
         */
        register(config) {
            const key = this.normalizeKey(config.key);
            const shortcutId = this.getShortcutId({
                key,
                ctrl: config.ctrl || false,
                shift: config.shift || false,
                alt: config.alt || false,
            });

            this.shortcuts.set(shortcutId, {
                key,
                ctrl: config.ctrl || false,
                shift: config.shift || false,
                alt: config.alt || false,
                handler: config.handler,
                description: config.description || '',
                context: config.context || 'global',
            });

            console.log(
                `Registered shortcut: ${shortcutId} - ${config.description}`,
            );
        }

        /**
         * Unregister a keyboard shortcut
         * @param {Object} config
         */
        unregister(config) {
            const key = this.normalizeKey(config.key);
            const shortcutId = this.getShortcutId({
                key,
                ctrl: config.ctrl || false,
                shift: config.shift || false,
                alt: config.alt || false,
            });

            this.shortcuts.delete(shortcutId);
        }

        /**
         * Handle keydown event
         * @param {KeyboardEvent} e
         */
        handleKeyDown(e) {
            // Don't handle shortcuts when typing in input fields (unless explicitly allowed)
            if (
                this.isInputElement(e.target) &&
                !e.target.dataset.allowShortcuts
            ) {
                // Check if this shortcut is in the allowlist for input fields
                const shortcutId = this.getShortcutId({
                    key: this.normalizeKey(e.key),
                    ctrl: e.metaKey || e.ctrlKey,
                    shift: e.shiftKey,
                    alt: e.altKey,
                });

                if (!this.inputFieldAllowlist.includes(shortcutId)) {
                    return;
                }
            }

            const shortcutId = this.getShortcutId({
                key: this.normalizeKey(e.key),
                ctrl: e.metaKey || e.ctrlKey,
                shift: e.shiftKey,
                alt: e.altKey,
            });

            const shortcut = this.shortcuts.get(shortcutId);
            if (shortcut) {
                // Context filtering: only run when the active context matches
                const currentContext = this.getCurrentContext();
                const shortcutContext = shortcut.context || 'global';
                if (
                    shortcutContext !== 'global' &&
                    shortcutContext !== currentContext
                ) {
                    return; // different context, ignore
                }
                e.preventDefault();
                e.stopPropagation();

                try {
                    shortcut.handler(e);
                } catch (error) {
                    console.error(
                        `Error executing shortcut ${shortcutId}:`,
                        error,
                    );
                }
            }
        }

        /**
         * Set a resolver function that returns the current context string
         * @param {() => string} resolver
         */
        setContextResolver(resolver) {
            if (typeof resolver === 'function') {
                this.contextResolver = resolver;
            }
        }

        /**
         * Determine the current context.
         * Tries custom resolver; falls back to active modal via WindowManager/MultiInstanceIntegration.
         * @returns {string} context key like 'terminal' | 'text-editor' | 'finder' | 'global'
         */
        getCurrentContext() {
            // 1) Custom resolver (set by integrations)
            if (typeof this.contextResolver === 'function') {
                try {
                    const ctx = this.contextResolver();
                    if (ctx) return ctx;
                } catch {
                    /* noop */
                }
            }

            // 2) Derive from top window (WindowManager + MultiInstanceIntegration)
            try {
                const wm = window.WindowManager;
                const top = wm && typeof wm.getTopWindow === 'function' ? wm.getTopWindow() : null;
                const topId = top?.id || '';

                // Use MultiInstanceIntegration map if available
                const mi = window.MultiInstanceIntegration;
                if (mi && mi.integrations && typeof mi.integrations.forEach === 'function') {
                    let found = null;
                    mi.integrations.forEach((val, key) => {
                        if (!found && val && val.modalId === topId) found = key;
                    });
                    if (found) return found;
                }

                // Fallback heuristic based on known modal IDs
                if (topId === 'terminal-modal') return 'terminal';
                if (topId === 'text-modal') return 'text-editor';
                if (topId === 'finder-modal') return 'finder';
            } catch {
                /* noop */
            }

            return 'global';
        }

        /**
         * Generate unique shortcut ID
         * @param {Object} config
         * @returns {string}
         */
        getShortcutId(config) {
            const parts = [];
            if (config.ctrl) parts.push('ctrl');
            if (config.shift) parts.push('shift');
            if (config.alt) parts.push('alt');
            parts.push(config.key.toLowerCase());
            return parts.join('+');
        }

        /**
         * Normalize key name
         * @param {string} key
         * @returns {string}
         */
        normalizeKey(key) {
            // Normalize key names
            const keyMap = {
                Control: 'ctrl',
                Meta: 'cmd',
                Command: 'cmd',
                Option: 'alt',
                Alt: 'alt',
                Shift: 'shift',
            };

            return keyMap[key] || key.toLowerCase();
        }

        /**
         * Check if element is an input element
         * @param {HTMLElement} element
         * @returns {boolean}
         */
        isInputElement(element) {
            if (!element) return false;

            const tagName = element.tagName.toLowerCase();
            return (
                tagName === 'input' ||
                tagName === 'textarea' ||
                tagName === 'select' ||
                element.contentEditable === 'true'
            );
        }

        /**
         * Enable shortcuts
         */
        enable() {
            this.enabled = true;
        }

        /**
         * Disable shortcuts
         */
        disable() {
            this.enabled = false;
        }

        /**
         * Get all registered shortcuts
         * @returns {Array}
         */
        getAllShortcuts() {
            return Array.from(this.shortcuts.entries()).map(([id, config]) => ({
                id,
                ...config,
            }));
        }

        /**
         * Get formatted shortcut string for display
         * @param {Object} config
         * @returns {string}
         */
        getShortcutDisplay(config) {
            const parts = [];
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

            if (config.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
            if (config.shift) parts.push(isMac ? '⇧' : 'Shift');
            if (config.alt) parts.push(isMac ? '⌥' : 'Alt');

            // Capitalize key
            let keyDisplay = config.key;
            if (config.key === 'tab') keyDisplay = 'Tab';
            else if (config.key.length === 1)
                keyDisplay = config.key.toUpperCase();

            parts.push(keyDisplay);

            return parts.join(isMac ? '' : '+');
        }
    }

    // Create singleton instance
    const keyboardShortcuts = new KeyboardShortcutManager();

    // Export to global scope
    window.KeyboardShortcuts = keyboardShortcuts;

    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            keyboardShortcuts.init();
        });
    } else {
        keyboardShortcuts.init();
    }
})();
