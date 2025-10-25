console.log('Logger loaded');

/**
 * Logging System
 * Zentrales Logging mit Levels und Kategorien
 * 
 * @example
 * // Development: Alle Logs
 * Logger.setLevel('TRACE');
 * 
 * // Production: Nur Errors
 * Logger.setLevel('ERROR');
 * 
 * // Kategorie-Filter
 * Logger.enableCategory('WindowManager');
 * Logger.disableCategory('Terminal');
 * 
 * // Logging verwenden
 * Logger.info('WindowManager', 'Window opened');
 * Logger.error('API', 'Failed to fetch data', error);
 * Logger.debug('Terminal', 'Command executed', { cmd: 'ls' });
 */
(function () {
    'use strict';

    const LOG_LEVELS = {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3,
        TRACE: 4
    };

    const LOG_COLORS = {
        ERROR: '#ff0000',
        WARN: '#ff9800',
        INFO: '#2196f3',
        DEBUG: '#9c27b0',
        TRACE: '#607d8b'
    };

    class Logger {
        constructor() {
            // Production: nur ERROR und WARN
            // Development: alles
            this.level = this.isDevelopment() ? LOG_LEVELS.TRACE : LOG_LEVELS.WARN;
            this.enabledCategories = new Set(['*']); // * = alle
            this.format = 'compact'; // 'compact' | 'detailed'
        }

        isDevelopment() {
            return location.hostname === 'localhost' || 
                   location.hostname === '127.0.0.1' ||
                   location.port !== '';
        }

        setLevel(level) {
            if (typeof level === 'string') {
                this.level = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
            } else {
                this.level = level;
            }
        }

        enableCategory(category) {
            if (category === '*') {
                this.enabledCategories.clear();
                this.enabledCategories.add('*');
            } else {
                this.enabledCategories.add(category);
            }
        }

        disableCategory(category) {
            this.enabledCategories.delete(category);
        }

        isCategoryEnabled(category) {
            return this.enabledCategories.has('*') || 
                   this.enabledCategories.has(category);
        }

        _log(level, category, message, ...args) {
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
                console.log(
                    `%c[${category}]`,
                    `color: ${color}`,
                    message,
                    ...args
                );
            }
        }

        // Public API
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

        // Helper für Gruppen
        group(category, title) {
            if (!this.isCategoryEnabled(category)) return;
            console.group(title);
        }

        groupEnd() {
            console.groupEnd();
        }

        // Performance-Messung
        time(label) {
            console.time(label);
        }

        timeEnd(label) {
            console.timeEnd(label);
        }
    }

    // Singleton
    const logger = new Logger();

    // Globaler Export
    if (typeof window !== 'undefined') {
        window.Logger = logger;
    }

    // CommonJS/ES Module Support
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = logger;
    }
})();
