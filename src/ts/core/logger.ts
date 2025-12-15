/**
 * src/ts/logger.ts
 * Typed port of the legacy `js/logger.js`.
 */

export type LogLevelName = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE';

const LOG_LEVELS: Record<LogLevelName, number> = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4,
};

const LOG_COLORS: Record<LogLevelName, string> = {
    ERROR: '#ff0000',
    WARN: '#ff9800',
    INFO: '#2196f3',
    DEBUG: '#9c27b0',
    TRACE: '#607d8b',
};

export class Logger {
    level: number;
    enabledCategories: Set<string>;
    format: 'compact' | 'detailed';

    constructor() {
        this.level = this.isDevelopment() ? LOG_LEVELS.TRACE : LOG_LEVELS.WARN;
        this.enabledCategories = new Set(['*']);
        this.format = 'compact';
    }

    isDevelopment(): boolean {
        try {
            return (
                location.hostname === 'localhost' ||
                location.hostname === '127.0.0.1' ||
                location.port !== ''
            );
        } catch {
            return false;
        }
    }

    setLevel(level: LogLevelName | number) {
        if (typeof level === 'string') {
            this.level = LOG_LEVELS[level.toUpperCase() as LogLevelName] ?? LOG_LEVELS.INFO;
        } else {
            this.level = level;
        }
    }

    enableCategory(category: string) {
        if (category === '*') {
            this.enabledCategories.clear();
            this.enabledCategories.add('*');
        } else {
            this.enabledCategories.add(category);
        }
    }

    disableCategory(category: string) {
        this.enabledCategories.delete(category);
    }

    isCategoryEnabled(category: string) {
        return this.enabledCategories.has('*') || this.enabledCategories.has(category);
    }

    private _log(level: LogLevelName, category: string, message?: unknown, ...args: unknown[]) {
        if (LOG_LEVELS[level] > this.level) return;
        if (!this.isCategoryEnabled(category)) return;

        const color = LOG_COLORS[level];
        const timestamp = new Date().toLocaleTimeString();

        if (this.format === 'detailed') {
            console.log(
                `%c[${timestamp}] [${level}] [${category}]`,
                `color: ${color}; font-weight: bold`,
                message,
                ...args
            );
        } else {
            console.log(`%c[${category}]`, `color: ${color}`, message, ...args);
        }
    }

    error(category: string, message?: unknown, ...args: unknown[]) {
        this._log('ERROR', category, message, ...args);
    }

    warn(category: string, message?: unknown, ...args: unknown[]) {
        this._log('WARN', category, message, ...args);
    }

    info(category: string, message?: unknown, ...args: unknown[]) {
        this._log('INFO', category, message, ...args);
    }

    debug(category: string, message?: unknown, ...args: unknown[]) {
        this._log('DEBUG', category, message, ...args);
    }

    trace(category: string, message?: unknown, ...args: unknown[]) {
        this._log('TRACE', category, message, ...args);
    }

    group(category: string, title?: string) {
        if (!this.isCategoryEnabled(category)) return;
        console.group(title ?? category);
    }

    groupEnd() {
        console.groupEnd();
    }

    time(label: string) {
        console.time(label);
    }

    timeEnd(label: string) {
        console.timeEnd(label);
    }
}

const logger = new Logger();

export default logger;

declare global {
    interface Window {
        Logger?: Logger;
    }
}

if (typeof window !== 'undefined') {
    window.Logger = logger;
}
