(function () {
    'use strict';

    const STORAGE_KEY = 'app.errorLogs';
    const MAX_LOGS = 100;

    function nowISO() {
        try {
            return new Date().toISOString();
        } catch (_e) {
            void _e;
            return String(Date.now());
        }
    }

    function safeStringify(obj) {
        try {
            return JSON.stringify(obj);
        } catch (_e) {
            void _e;
            return String(obj);
        }
    }

    function readLogs() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (_e) {
            void _e;
            return [];
        }
    }

    function writeLogs(logs) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOGS)));
        } catch (_e) {
            void _e;
            // ignore storage errors (quota, private mode, etc.)
        }
    }

    function toPlainError(err) {
        if (!err) return { name: 'Error', message: 'Unknown error' };
        const plain = {
            name: err.name || 'Error',
            message: err.message || String(err),
            stack: err.stack || undefined,
        };
        return plain;
    }

    const ErrorHandler = {
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
                (window.Logger || console).error('ErrorHandler', 'Failed to export logs');
            }
        },

        _record(entry) {
            const logs = readLogs();
            logs.push(entry);
            writeLogs(logs);
        },
    };

    function handleWindowError(message, source, lineno, colno, error) {
        if (!ErrorHandler.enabled) return false;
        const plain = toPlainError(error || { message });
        const entry = {
            type: 'error',
            time: nowISO(),
            message: String(message),
            source: String(source || ''),
            line: lineno || null,
            column: colno || null,
            error: plain,
        };
        (window.Logger || console).error('ErrorHandler', 'Unhandled error', entry);
        ErrorHandler._record(entry);
        // Let the browser continue its default handling
        return false;
    }

    function handleUnhandledRejection(event) {
        if (!ErrorHandler.enabled) return;
        const reason = event && (event.reason || event.detail || event);
        const plain = toPlainError(
            reason && reason instanceof Error ? reason : { message: safeStringify(reason) }
        );
        const entry = {
            type: 'unhandledrejection',
            time: nowISO(),
            reason: safeStringify(reason),
            error: plain,
        };
        (window.Logger || console).error('ErrorHandler', 'Unhandled promise rejection', entry);
        ErrorHandler._record(entry);
    }

    // Auto-enable in development; in production keep enabled to capture issues
    ErrorHandler.enabled = true;

    // Register global listeners
    window.addEventListener('error', function (e) {
        // Some browsers pass ErrorEvent, others invoke window.onerror
        if (e && e.error) {
            handleWindowError(e.message, e.filename, e.lineno, e.colno, e.error);
        }
    });
    window.onerror = handleWindowError;
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Expose
    window.ErrorHandler = ErrorHandler;
})();
