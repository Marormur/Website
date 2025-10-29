/**
 * error-handler.ts
 * Global error handler with logging and export capabilities
 */

console.log('ErrorHandler loaded');

(() => {
    'use strict';

    const STORAGE_KEY = 'app.errorLogs';
    const MAX_LOGS = 100;

    // ===== Types =====

    interface PlainError {
        name: string;
        message: string;
        stack?: string;
    }

    interface ErrorLogEntry {
        type: 'error' | 'unhandledrejection';
        time: string;
        message?: string;
        source?: string;
        line?: number | null;
        column?: number | null;
        reason?: string;
        error: PlainError;
    }

    interface ErrorHandlerInstance {
        enabled: boolean;
        enable(): void;
        disable(): void;
        getLogs(): ErrorLogEntry[];
        clearLogs(): void;
        exportLogs(): void;
        _record(entry: ErrorLogEntry): void;
    }

    // ===== Helper Functions =====

    function nowISO(): string {
        try {
            return new Date().toISOString();
        } catch (_e) {
            void _e;
            return String(Date.now());
        }
    }

    function safeStringify(obj: unknown): string {
        try {
            return JSON.stringify(obj);
        } catch (_e) {
            void _e;
            return String(obj);
        }
    }

    function readLogs(): ErrorLogEntry[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? (JSON.parse(raw) as ErrorLogEntry[]) : [];
        } catch (_e) {
            void _e;
            return [];
        }
    }

    function writeLogs(logs: ErrorLogEntry[]): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOGS)));
        } catch (_e) {
            void _e;
            // ignore storage errors (quota, private mode, etc.)
        }
    }

    function toPlainError(err: unknown): PlainError {
        if (!err) return { name: 'Error', message: 'Unknown error' };
        const error = err as Partial<Error>;
        const plain: PlainError = {
            name: error.name || 'Error',
            message: error.message || String(err),
            stack: error.stack,
        };
        return plain;
    }

    // ===== ErrorHandler Instance =====

    const ErrorHandler: ErrorHandlerInstance = {
        enabled: true,

        enable() {
            if (this.enabled) return;
            this.enabled = true;
        },

        disable() {
            if (!this.enabled) return;
            this.enabled = false;
        },

        getLogs() {
            return readLogs();
        },

        clearLogs() {
            writeLogs([]);
        },

        exportLogs() {
            try {
                const logs = readLogs();
                const blob = new Blob([safeStringify(logs)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `error-logs-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (_e) {
                void _e;
                const logger = (window as typeof window & { Logger?: Console }).Logger || console;
                logger.error('ErrorHandler', 'Failed to export logs');
            }
        },

        _record(entry: ErrorLogEntry) {
            const logs = readLogs();
            logs.push(entry);
            writeLogs(logs);
        },
    };

    // ===== Error Handlers =====

    function handleWindowError(
        message: string | Event,
        source?: string,
        lineno?: number,
        colno?: number,
        error?: Error
    ): boolean {
        if (!ErrorHandler.enabled) return false;
        const plain = toPlainError(error || { message });
        const entry: ErrorLogEntry = {
            type: 'error',
            time: nowISO(),
            message: String(message),
            source: String(source || ''),
            line: lineno || null,
            column: colno || null,
            error: plain,
        };
        const logger = (window as typeof window & { Logger?: Console }).Logger || console;
        logger.error('ErrorHandler', 'Unhandled error', entry);
        ErrorHandler._record(entry);
        // Let the browser continue its default handling
        return false;
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent): void {
        if (!ErrorHandler.enabled) return;
        const reason = event?.reason;
        const plain = toPlainError(
            reason instanceof Error ? reason : { message: safeStringify(reason) }
        );
        const entry: ErrorLogEntry = {
            type: 'unhandledrejection',
            time: nowISO(),
            reason: safeStringify(reason),
            error: plain,
        };
        const logger = (window as typeof window & { Logger?: Console }).Logger || console;
        logger.error('ErrorHandler', 'Unhandled promise rejection', entry);
        ErrorHandler._record(entry);
    }

    // ===== Initialize =====

    // Auto-enable in development; in production keep enabled to capture issues
    ErrorHandler.enabled = true;

    // Register global listeners
    window.addEventListener('error', function (e: ErrorEvent) {
        // Some browsers pass ErrorEvent, others invoke window.onerror
        if (e?.error) {
            handleWindowError(e.message, e.filename, e.lineno, e.colno, e.error);
        }
    });
    window.onerror = handleWindowError;
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // ===== Global Export =====

    if (typeof window !== 'undefined') {
        (window as typeof window & { ErrorHandler: ErrorHandlerInstance }).ErrorHandler =
            ErrorHandler;
    }
})();

export {};
