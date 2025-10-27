'use strict';
console.log('BaseWindowInstance loaded');
(function () {
    'use strict';
    class BaseWindowInstance {
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
        _generateId() {
            return `${this.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        _initializeState(initialState) {
            return {
                ...initialState,
                created: Date.now(),
                modified: Date.now(),
            };
        }
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
        render() {
            throw new Error('render() must be implemented by subclass');
        }
        attachEventListeners() {
            // To be implemented by subclasses
        }
        show() {
            if (this.container) {
                this.container.classList.remove('hidden');
                this.isVisible = true;
                this.emit('shown');
            }
        }
        hide() {
            if (this.container) {
                this.container.classList.add('hidden');
                this.isVisible = false;
                this.emit('hidden');
            }
        }
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
        updateState(updates) {
            const oldState = { ...this.state };
            this.state = {
                ...this.state,
                ...updates,
                modified: Date.now(),
            };
            this.emit('stateChanged', { oldState, newState: this.state });
        }
        getState() {
            return { ...this.state };
        }
        serialize() {
            return {
                instanceId: this.instanceId,
                type: this.type,
                title: this.title,
                state: this.getState(),
                metadata: this.metadata,
            };
        }
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
        emit(eventName, data) {
            const listeners = this.eventListeners.get(eventName) || [];
            listeners.forEach(callback => {
                try {
                    callback.call(this, data);
                } catch (error) {
                    console.error(`Error in event listener for ${eventName}:`, error);
                }
            });
        }
        on(eventName, callback) {
            if (!this.eventListeners.has(eventName)) {
                this.eventListeners.set(eventName, []);
            }
            this.eventListeners.get(eventName).push(callback);
        }
        off(eventName, callback) {
            if (!this.eventListeners.has(eventName)) return;
            const listeners = this.eventListeners.get(eventName);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
        removeAllEventListeners() {
            this.eventListeners.clear();
        }
        focus() {
            if (this.container && this.isVisible) {
                this.emit('focused');
            }
        }
        blur() {
            this.emit('blurred');
        }
    }
    window.BaseWindowInstance = BaseWindowInstance;
})();
//# sourceMappingURL=base-window-instance.js.map
