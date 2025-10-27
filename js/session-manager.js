console.log('SessionManager loaded');

/**
 * SessionManager - Manages window instance sessions
 *
 * Features:
 * - Auto-save instances to localStorage
 * - Restore instances on page load
 * - Export/import sessions
 * - Session templates
 */
(function () {
    'use strict';

    /**
     * Session Manager for persisting window instances
     */
    class SessionManager {
        /**
         * @param {Object} config
         * @param {number} config.autoSaveInterval - Auto-save interval in milliseconds (default: 30000 = 30s)
         * @param {boolean} config.autoSaveEnabled - Enable auto-save (default: true)
         * @param {string} config.storageKey - LocalStorage key prefix (default: 'window-session')
         */
        constructor(config = {}) {
            this.autoSaveInterval = config.autoSaveInterval || 30000; // 30 seconds
            this.autoSaveEnabled = config.autoSaveEnabled !== false;
            this.storageKey = config.storageKey || 'window-session';

            this.instanceManagers = new Map();
            this.autoSaveTimer = null;
            this.lastSaveTime = null;
        }

        /**
         * Register an instance manager for auto-save
         * @param {string} type - Instance type (e.g., 'terminal', 'text-editor')
         * @param {InstanceManager} manager - Instance manager
         */
        registerManager(type, manager) {
            this.instanceManagers.set(type, manager);
            console.log(`SessionManager: Registered manager for ${type}`);
        }

        /**
         * Unregister an instance manager
         * @param {string} type
         */
        unregisterManager(type) {
            this.instanceManagers.delete(type);
        }

        /**
         * Start auto-save
         */
        startAutoSave() {
            if (!this.autoSaveEnabled) return;

            this.stopAutoSave(); // Clear any existing timer

            this.autoSaveTimer = setInterval(() => {
                this.saveAllSessions();
            }, this.autoSaveInterval);

            console.log(`SessionManager: Auto-save started (interval: ${this.autoSaveInterval}ms)`);
        }

        /**
         * Stop auto-save
         */
        stopAutoSave() {
            if (this.autoSaveTimer) {
                clearInterval(this.autoSaveTimer);
                this.autoSaveTimer = null;
            }
        }

        /**
         * Save all sessions to localStorage
         */
        saveAllSessions() {
            const sessions = {};
            let totalInstances = 0;

            this.instanceManagers.forEach((manager, type) => {
                const serialized = manager.serializeAll();
                if (serialized.length > 0) {
                    sessions[type] = {
                        instances: serialized,
                        activeInstanceId: manager.activeInstanceId,
                    };
                    totalInstances += serialized.length;
                }
            });

            if (totalInstances > 0) {
                const sessionData = {
                    version: '1.0',
                    timestamp: Date.now(),
                    sessions,
                };

                try {
                    localStorage.setItem(this.storageKey, JSON.stringify(sessionData));
                    this.lastSaveTime = Date.now();
                    console.log(
                        `SessionManager: Saved ${totalInstances} instances across ${Object.keys(sessions).length} types`
                    );
                } catch (error) {
                    // Provide specific error messages based on error type
                    if (error.name === 'QuotaExceededError') {
                        console.error(
                            'SessionManager: Storage quota exceeded. Cannot save sessions. Consider clearing old data or reducing instance count.'
                        );
                    } else if (error.name === 'SecurityError') {
                        console.error(
                            'SessionManager: localStorage access denied. Sessions cannot be saved (private browsing mode?).'
                        );
                    } else if (error instanceof TypeError) {
                        console.error(
                            'SessionManager: Failed to serialize session data. Some instance state may not be JSON-serializable.'
                        );
                    } else {
                        console.error(
                            'SessionManager: Failed to save sessions:',
                            error.message || error
                        );
                    }
                    this.handleStorageError(error);
                }
            } else {
                // No instances to save, clear storage
                localStorage.removeItem(this.storageKey);
            }
        }

        /**
         * Restore all sessions from localStorage
         */
        restoreAllSessions() {
            try {
                const data = localStorage.getItem(this.storageKey);
                if (!data) {
                    console.log('SessionManager: No saved sessions found');
                    return;
                }

                const sessionData = JSON.parse(data);
                if (!sessionData.sessions) {
                    console.warn('SessionManager: Invalid session data');
                    return;
                }

                let totalRestored = 0;

                Object.entries(sessionData.sessions).forEach(([type, typeData]) => {
                    const manager = this.instanceManagers.get(type);
                    if (manager) {
                        manager.deserializeAll(typeData.instances);

                        // Restore active instance
                        if (typeData.activeInstanceId) {
                            manager.setActiveInstance(typeData.activeInstanceId);
                        }

                        totalRestored += typeData.instances.length;
                    } else {
                        console.warn(`SessionManager: No manager registered for type ${type}`);
                    }
                });

                console.log(`SessionManager: Restored ${totalRestored} instances`);
            } catch (error) {
                console.error('SessionManager: Failed to restore sessions:', error);
            }
        }

        /**
         * Export session as JSON
         * @returns {string} JSON string
         */
        exportSession() {
            const sessions = {};

            this.instanceManagers.forEach((manager, type) => {
                const serialized = manager.serializeAll();
                if (serialized.length > 0) {
                    sessions[type] = {
                        instances: serialized,
                        activeInstanceId: manager.activeInstanceId,
                    };
                }
            });

            return JSON.stringify(
                {
                    version: '1.0',
                    timestamp: Date.now(),
                    sessions,
                },
                null,
                2
            );
        }

        /**
         * Import session from JSON
         * @param {string} jsonString - JSON session data
         */
        importSession(jsonString) {
            try {
                const sessionData = JSON.parse(jsonString);

                if (!sessionData.sessions) {
                    throw new Error('Invalid session format');
                }

                // Clear existing instances first
                this.clearAllSessions();

                // Import new sessions
                Object.entries(sessionData.sessions).forEach(([type, typeData]) => {
                    const manager = this.instanceManagers.get(type);
                    if (manager) {
                        manager.deserializeAll(typeData.instances);

                        if (typeData.activeInstanceId) {
                            manager.setActiveInstance(typeData.activeInstanceId);
                        }
                    }
                });

                console.log('SessionManager: Session imported successfully');
            } catch (error) {
                console.error('SessionManager: Failed to import session:', error);
                throw error;
            }
        }

        /**
         * Clear all sessions
         */
        clearAllSessions() {
            this.instanceManagers.forEach(manager => {
                manager.destroyAllInstances();
            });
            localStorage.removeItem(this.storageKey);
            console.log('SessionManager: All sessions cleared');
        }

        /**
         * Save a template
         * @param {string} name - Template name
         * @param {string} description - Template description
         */
        saveAsTemplate(name, description = '') {
            const templateKey = `${this.storageKey}-template-${name}`;
            const sessionJson = this.exportSession();

            const templateData = {
                name,
                description,
                created: Date.now(),
                session: JSON.parse(sessionJson),
            };

            try {
                localStorage.setItem(templateKey, JSON.stringify(templateData));
                console.log(`SessionManager: Template "${name}" saved`);
            } catch (error) {
                console.error('SessionManager: Failed to save template:', error);
                throw error;
            }
        }

        /**
         * Load a template
         * @param {string} name - Template name
         */
        loadTemplate(name) {
            const templateKey = `${this.storageKey}-template-${name}`;

            try {
                const data = localStorage.getItem(templateKey);
                if (!data) {
                    throw new Error(`Template "${name}" not found`);
                }

                const templateData = JSON.parse(data);
                this.importSession(JSON.stringify(templateData.session));
                console.log(`SessionManager: Template "${name}" loaded`);
            } catch (error) {
                console.error('SessionManager: Failed to load template:', error);
                throw error;
            }
        }

        /**
         * Get all saved templates
         * @returns {Array<Object>}
         */
        getAllTemplates() {
            const templates = [];
            const prefix = `${this.storageKey}-template-`;

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(prefix)) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        templates.push({
                            name: data.name,
                            description: data.description,
                            created: data.created,
                        });
                    } catch (error) {
                        console.error(`Failed to parse template ${key}:`, error);
                    }
                }
            }

            return templates;
        }

        /**
         * Delete a template
         * @param {string} name - Template name
         */
        deleteTemplate(name) {
            const templateKey = `${this.storageKey}-template-${name}`;
            localStorage.removeItem(templateKey);
            console.log(`SessionManager: Template "${name}" deleted`);
        }

        /**
         * Handle storage quota errors
         * @private
         */
        handleStorageError(error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('SessionManager: Storage quota exceeded. Consider clearing old data.');
                // Could implement cleanup strategy here
            }
        }

        /**
         * Get storage usage info
         * @returns {Object}
         */
        getStorageInfo() {
            const sessionData = localStorage.getItem(this.storageKey);
            const sessionSize = sessionData ? sessionData.length : 0;

            let templateCount = 0;
            let templateSize = 0;
            const prefix = `${this.storageKey}-template-`;

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(prefix)) {
                    templateCount++;
                    const data = localStorage.getItem(key);
                    templateSize += data ? data.length : 0;
                }
            }

            return {
                sessionSize,
                templateCount,
                templateSize,
                totalSize: sessionSize + templateSize,
                lastSaveTime: this.lastSaveTime,
            };
        }

        /**
         * Destroy session manager
         */
        destroy() {
            this.stopAutoSave();
            this.instanceManagers.clear();
        }
    }

    // Create singleton instance
    const sessionManager = new SessionManager();

    // Export to global scope
    window.SessionManager = sessionManager;
})();
