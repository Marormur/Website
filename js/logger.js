'use strict';
/**
 * src/ts/logger.ts
 * Typed port of the legacy `js/logger.js`.
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.Logger = void 0;
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4,
};
const LOG_COLORS = {
    ERROR: '#ff0000',
    WARN: '#ff9800',
    INFO: '#2196f3',
    DEBUG: '#9c27b0',
    TRACE: '#607d8b',
};
class Logger {
    constructor() {
        this.level = this.isDevelopment() ? LOG_LEVELS.TRACE : LOG_LEVELS.WARN;
        this.enabledCategories = new Set(['*']);
        this.format = 'compact';
    }
    isDevelopment() {
        try {
            return (location.hostname === 'localhost' ||
                location.hostname === '127.0.0.1' ||
                location.port !== '');
        }
        catch {
            return false;
        }
    }
    setLevel(level) {
        if (typeof level === 'string') {
            this.level = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
        }
        else {
            this.level = level;
        }
    }
    enableCategory(category) {
        if (category === '*') {
            this.enabledCategories.clear();
            this.enabledCategories.add('*');
        }
        else {
            this.enabledCategories.add(category);
        }
    }
    disableCategory(category) {
        this.enabledCategories.delete(category);
    }
    isCategoryEnabled(category) {
        return this.enabledCategories.has('*') || this.enabledCategories.has(category);
    }
    _log(level, category, message, ...args) {
        if (LOG_LEVELS[level] > this.level)
            return;
        if (!this.isCategoryEnabled(category))
            return;
        const color = LOG_COLORS[level];
        const timestamp = new Date().toLocaleTimeString();
        if (this.format === 'detailed') {
            console.log(`%c[${timestamp}] [${level}] [${category}]`, `color: ${color}; font-weight: bold`, message, ...args);
        }
        else {
            console.log(`%c[${category}]`, `color: ${color}`, message, ...args);
        }
    }
    error(category, message, ...args) {
        this._log('ERROR', category, message, ...args);
    }
    warn(category, message, ...args) {
        this._log('WARN', category, message, ...args);
    }
    info(category, message, ...args) {
        this._log('INFO', category, message, ...args);
    }
    debug(category, message, ...args) {
        this._log('DEBUG', category, message, ...args);
    }
    trace(category, message, ...args) {
        this._log('TRACE', category, message, ...args);
    }
    group(category, title) {
        if (!this.isCategoryEnabled(category))
            return;
        console.group(title ?? category);
    }
    groupEnd() {
        console.groupEnd();
    }
    time(label) {
        console.time(label);
    }
    timeEnd(label) {
        console.timeEnd(label);
    }
}
exports.Logger = Logger;
const logger = new Logger();
exports.default = logger;
if (typeof window !== 'undefined') {
    window.Logger = logger;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = logger;
}
//# sourceMappingURL=logger.js.map