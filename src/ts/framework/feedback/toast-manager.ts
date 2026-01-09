import { Toast, ToastType } from './toast.js';

export interface ToastOptions {
    type?: ToastType;
    message: string;
    duration?: number; // ms, 0 = permanent
    action?: {
        label: string;
        onClick: () => void;
    };
}

/**
 * ToastManager
 *
 * Singleton class for managing toast notifications.
 * Provides methods for showing different types of toasts.
 *
 * @example
 * ```typescript
 * import { toast } from './toast-manager.js';
 *
 * // Simple notification
 * toast.success('File saved!');
 * toast.error('Failed to load');
 *
 * // With action button
 * toast.show({
 *     type: 'info',
 *     message: 'File deleted',
 *     action: {
 *         label: 'Undo',
 *         onClick: () => this.undoDelete()
 *     }
 * });
 * ```
 */
export class ToastManager {
    private toasts: Map<string, Toast> = new Map();
    private container: HTMLElement;
    private nextId = 0;

    constructor() {
        this.container = document.createElement('div');
        this.container.className =
            'macui-toast-container fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
        this.container.style.pointerEvents = 'none';
        document.body.appendChild(this.container);
    }

    /**
     * Show a toast notification
     */
    show(options: ToastOptions): string {
        const id = `toast-${this.nextId++}`;
        const type = options.type || 'info';

        const toast = new Toast({
            type,
            message: options.message,
            action: options.action,
            onDismiss: () => this.remove(id),
        });

        this.toasts.set(id, toast);
        const element = toast.mount();
        element.style.pointerEvents = 'auto';
        this.container.appendChild(element);

        // Auto-dismiss
        if (options.duration !== 0) {
            const duration = options.duration || (type === 'error' ? 5000 : 3000);
            setTimeout(() => this.remove(id), duration);
        }

        return id;
    }

    /**
     * Remove a toast by ID
     */
    remove(id: string): void {
        const toast = this.toasts.get(id);
        if (toast) {
            toast.unmount();
            this.toasts.delete(id);
        }
    }

    /**
     * Show a success toast
     */
    success(message: string, duration?: number): string {
        return this.show({ type: 'success', message, duration });
    }

    /**
     * Show an error toast
     */
    error(message: string, duration?: number): string {
        return this.show({ type: 'error', message, duration });
    }

    /**
     * Show a warning toast
     */
    warning(message: string, duration?: number): string {
        return this.show({ type: 'warning', message, duration });
    }

    /**
     * Show an info toast
     */
    info(message: string, duration?: number): string {
        return this.show({ type: 'info', message, duration });
    }

    /**
     * Clear all toasts
     */
    clearAll(): void {
        this.toasts.forEach((toast, id) => {
            this.remove(id);
        });
    }
}

// Singleton instance
export const toast = new ToastManager();
