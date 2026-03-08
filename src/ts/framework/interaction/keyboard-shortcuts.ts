import logger from '../../core/logger.js';
/**
 * Keyboard Shortcuts Framework
 *
 * Centralized keyboard shortcut management with:
 * - Platform-aware key mappings (Cmd vs Ctrl)
 * - Scoping (global, window, component)
 * - Conflict detection
 * - Integration with UI components (tooltips, menus)
 */

export type ShortcutScope = 'global' | 'window' | 'component';
export type ShortcutCallback = (event: KeyboardEvent) => void | boolean;

export interface ShortcutRegistration {
    id: string;
    key: string;
    scope: ShortcutScope;
    description?: string;
    callback: ShortcutCallback;
    element?: HTMLElement;
}

/**
 * Keyboard Shortcuts Manager
 *
 * @example
 * ```typescript
 * const shortcuts = KeyboardShortcuts.getInstance();
 *
 * // Register global shortcut
 * shortcuts.register({
 *     id: 'save',
 *     key: 'Cmd+S',
 *     scope: 'global',
 *     description: 'Save file',
 *     callback: () => this.save()
 * });
 *
 * // Platform-aware
 * shortcuts.register({
 *     id: 'copy',
 *     key: 'Meta+C', // Cmd on Mac, Ctrl on Windows
 *     scope: 'global',
 *     callback: () => this.copy()
 * });
 * ```
 */
export class KeyboardShortcuts {
    private static instance: KeyboardShortcuts;
    private shortcuts: Map<string, ShortcutRegistration> = new Map();
    private isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);

    private constructor() {
        document.addEventListener('keydown', this.handleKeyDown);
    }

    static getInstance(): KeyboardShortcuts {
        if (!KeyboardShortcuts.instance) {
            KeyboardShortcuts.instance = new KeyboardShortcuts();
        }
        return KeyboardShortcuts.instance;
    }

    /**
     * Register a keyboard shortcut
     */
    register(registration: ShortcutRegistration): void {
        const normalizedKey = this.normalizeKey(registration.key);

        // Check for conflicts
        if (this.shortcuts.has(registration.id)) {
            logger.warn(
                'FRAMEWORK',
                `[KeyboardShortcuts] Shortcut '${registration.id}' already registered. Overwriting.`
            );
        }

        this.shortcuts.set(registration.id, {
            ...registration,
            key: normalizedKey,
        });
    }

    /**
     * Unregister a keyboard shortcut
     */
    unregister(id: string): void {
        this.shortcuts.delete(id);
    }

    /**
     * Get all registered shortcuts
     */
    getAll(): ShortcutRegistration[] {
        return Array.from(this.shortcuts.values());
    }

    /**
     * Get shortcut by ID
     */
    get(id: string): ShortcutRegistration | undefined {
        return this.shortcuts.get(id);
    }

    /**
     * Format shortcut key for display (converts Meta to Cmd/Ctrl)
     */
    formatKey(key: string): string {
        return key
            .replace(/Meta/g, this.isMac ? 'Cmd' : 'Ctrl')
            .replace(/Alt/g, this.isMac ? 'Option' : 'Alt')
            .replace(/\+/g, ' + ');
    }

    /**
     * Normalize key combination (Cmd -> Meta, etc.)
     */
    private normalizeKey(key: string): string {
        return key
            .replace(/Cmd/gi, 'Meta')
            .replace(/Command/gi, 'Meta')
            .replace(/Ctrl/gi, 'Control')
            .replace(/\s+/g, '')
            .toLowerCase();
    }

    /**
     * Convert KeyboardEvent to key string
     */
    private eventToKeyString(event: KeyboardEvent): string {
        const parts: string[] = [];

        if (event.ctrlKey || event.metaKey) {
            parts.push(event.metaKey ? 'meta' : 'control');
        }
        if (event.altKey) parts.push('alt');
        if (event.shiftKey) parts.push('shift');

        const key = event.key.toLowerCase();
        if (key !== 'control' && key !== 'alt' && key !== 'shift' && key !== 'meta') {
            parts.push(key);
        }

        return parts.join('+');
    }

    /**
     * Handle keydown events
     */
    private handleKeyDown = (event: KeyboardEvent): void => {
        const keyString = this.eventToKeyString(event);

        // Find matching shortcuts
        for (const shortcut of this.shortcuts.values()) {
            if (shortcut.key === keyString) {
                // Check scope
                if (shortcut.scope === 'component' && shortcut.element) {
                    // Only trigger if element is focused or contains active element
                    if (!shortcut.element.contains(document.activeElement)) {
                        continue;
                    }
                }

                // Execute callback
                const result = shortcut.callback(event);

                // Prevent default if callback returns false or undefined
                if (result !== true) {
                    event.preventDefault();
                    event.stopPropagation();
                }

                break;
            }
        }
    };

    /**
     * Cleanup
     */
    destroy(): void {
        document.removeEventListener('keydown', this.handleKeyDown);
        this.shortcuts.clear();
    }
}

// Singleton instance
export const keyboardShortcuts = KeyboardShortcuts.getInstance();
