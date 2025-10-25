console.log('BaseWindowInstance loaded');

/**
 * BaseWindowInstance - Wiederverwendbare Basis-Klasse für Fenster-Instanzen
 *
 * Ermöglicht mehrere Instanzen des gleichen Fenstertyps.
 * Jede Instanz hat ihren eigenen State, DOM-Container und Lifecycle.
 */
(function () {
    'use strict';

    /**
     * Base class for window instances
     */
    class BaseWindowInstance {
        /**
         * @param {Object} config - Instance configuration
         * @param {string} config.id - Unique instance ID
         * @param {string} config.type - Window type (e.g., 'finder', 'terminal', 'text-editor')
         * @param {string} config.title - Window title
         * @param {Object} config.initialState - Initial state for this instance
         */
        constructor(config) {
            this.instanceId = config.id || this._generateId();
            this.type = config.type || 'unknown';
            this.title = config.title || 'Untitled';
            this.container = null;
            this.windowElement = null;
            this.state = this._initializeState(config.initialState || {});
            this.eventListeners = new Map();
            this.isInitialized = false;
            this.isVisible = false;
            this.metadata = config.metadata || {};
        }

        /**
         * Generate unique instance ID
         * @private
         */
        _generateId() {
            return `${this.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        /**
         * Initialize instance state (override in subclasses)
         * @protected
         */
        _initializeState(initialState) {
            return {
                ...initialState,
                created: Date.now(),
                modified: Date.now(),
            };
        }

        /**
         * Initialize the instance (override in subclasses)
         * @param {HTMLElement} container - Container element
         */
        init(container) {
            if (this.isInitialized) {
                console.warn(`Instance ${this.instanceId} already initialized`);
                return;
            }

            this.container = container;
            this.render();
            this.attachEventListeners();
            this.isInitialized = true;
            this.emit('initialized');
        }

        /**
         * Render the instance UI (override in subclasses)
         * @protected
         */
        render() {
            // To be implemented by subclasses
            throw new Error('render() must be implemented by subclass');
        }

        /**
         * Attach event listeners (override in subclasses)
         * @protected
         */
        attachEventListeners() {
            // To be implemented by subclasses
        }

        /**
         * Show/open the instance
         */
        show() {
            if (this.container) {
                this.container.classList.remove('hidden');
                this.isVisible = true;
                this.emit('shown');
            }
        }

        /**
         * Hide/close the instance
         */
        hide() {
            if (this.container) {
                this.container.classList.add('hidden');
                this.isVisible = false;
                this.emit('hidden');
            }
        }

        /**
         * Destroy the instance and clean up resources
         */
        destroy() {
            this.emit('beforeDestroy');
            this.removeAllEventListeners();

            if (this.container) {
                this.container.innerHTML = '';
                this.container = null;
            }

            this.windowElement = null;
            this.isInitialized = false;
            this.emit('destroyed');
        }

        /**
         * Update instance state
         * @param {Object} updates - State updates
         */
        updateState(updates) {
            const oldState = { ...this.state };
            this.state = {
                ...this.state,
                ...updates,
                modified: Date.now(),
            };
            this.emit('stateChanged', { oldState, newState: this.state });
        }

        /**
         * Get current state
         * @returns {Object}
         */
        getState() {
            return { ...this.state };
        }

        /**
         * Serialize instance state for persistence
         * @returns {Object}
         */
        serialize() {
            return {
                instanceId: this.instanceId,
                type: this.type,
                title: this.title,
                state: this.getState(),
                metadata: this.metadata,
            };
        }

        /**
         * Restore instance from serialized data
         * @param {Object} data - Serialized data
         */
        deserialize(data) {
            if (data.state) {
                this.state = data.state;
            }
            if (data.title) {
                this.title = data.title;
            }
            if (data.metadata) {
                this.metadata = { ...this.metadata, ...data.metadata };
            }
            this.emit('deserialized');
        }

        /**
         * Event system - emit event
         * @param {string} eventName
         * @param {*} data
         */
        emit(eventName, data) {
            const listeners = this.eventListeners.get(eventName) || [];
            listeners.forEach((callback) => {
                try {
                    callback.call(this, data);
                } catch (error) {
                    console.error(
                        `Error in event listener for ${eventName}:`,
                        error,
                    );
                }
            });
        }

        /**
         * Event system - add listener
         * @param {string} eventName
         * @param {Function} callback
         */
        on(eventName, callback) {
            if (!this.eventListeners.has(eventName)) {
                this.eventListeners.set(eventName, []);
            }
            this.eventListeners.get(eventName).push(callback);
        }

        /**
         * Event system - remove listener
         * @param {string} eventName
         * @param {Function} callback
         */
        off(eventName, callback) {
            if (!this.eventListeners.has(eventName)) return;

            const listeners = this.eventListeners.get(eventName);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }

        /**
         * Event system - remove all listeners
         */
        removeAllEventListeners() {
            this.eventListeners.clear();
        }

        /**
         * Focus this instance
         */
        focus() {
            if (this.container && this.isVisible) {
                this.emit('focused');
            }
        }

        /**
         * Blur this instance
         */
        blur() {
            this.emit('blurred');
        }
    }

    // Export to global scope
    window.BaseWindowInstance = BaseWindowInstance;
})();
