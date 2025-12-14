'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
/**
 * ActionBus - Declarative event system to wire UI actions via data-action attributes.
 *
 * Example:
 *   <button data-action="closeWindow" data-window-id="text-modal">Close</button>
 *   ActionBus.register('closeWindow', (params, el) => { ... })
 */
const helpers_js_1 = require('./actions/helpers.js');
const finder_js_1 = require('./actions/finder.js');
const preview_js_1 = require('./actions/preview.js');
const session_js_1 = require('./actions/session.js');
const windows_js_1 = require('./actions/windows.js');
console.log('ActionBus loaded');
(function () {
    'use strict';
    const actionHandlers = new Map();
    const eventDelegates = [];
    const ActionBus = {
        register(actionName, handler) {
            if (!actionName || typeof handler !== 'function') {
                console.error('Invalid action registration:', actionName);
                return;
            }
            actionHandlers.set(actionName, handler);
        },
        registerAll(actions) {
            Object.entries(actions).forEach(([name, handler]) => {
                this.register(name, handler);
            });
        },
        execute(actionName, params = {}, element = null) {
            const handler = actionHandlers.get(actionName);
            if (!handler) {
                console.warn(`No handler registered for action: ${actionName}`);
                return;
            }
            try {
                handler(params, element);
            } catch (error) {
                console.error(`Error executing action ${actionName}:`, error);
            }
        },
        init() {
            // Click-Events
            this.delegateEvent('click', '[data-action]', (element, event) => {
                const actionName = element.getAttribute('data-action');
                const params = (0, helpers_js_1.extractParams)(element.dataset);
                if (element.tagName === 'BUTTON' || element.tagName === 'A') {
                    event.preventDefault();
                }
                event.stopPropagation();
                this.execute(actionName, params, element);
            });
            this.delegateEvent('dblclick', '[data-action-dblclick]', (element, event) => {
                const actionName = element.getAttribute('data-action-dblclick');
                const params = (0, helpers_js_1.extractParams)(element.dataset);
                if (element.tagName === 'BUTTON' || element.tagName === 'A') {
                    event.preventDefault();
                }
                event.stopPropagation();
                this.execute(actionName, params, element);
            });
            this.delegateEvent('mouseenter', '[data-action-hover]', element => {
                const actionName = element.getAttribute('data-action-hover');
                const params = (0, helpers_js_1.extractParams)(element.dataset);
                this.execute(actionName, params, element);
            });
            console.log('ActionBus initialized');
        },
        delegateEvent(eventType, selector, handler) {
            const delegate = event => {
                const target = event.target;
                if (!(target instanceof Element)) return;
                const element = target.closest(selector);
                if (element) {
                    handler(element, event);
                }
            };
            document.addEventListener(eventType, delegate);
            eventDelegates.push({ eventType, delegate });
        },
        extractParams(element) {
            return (0, helpers_js_1.extractParams)(element.dataset);
        },
        destroy() {
            eventDelegates.forEach(({ eventType, delegate }) => {
                document.removeEventListener(eventType, delegate);
            });
            eventDelegates.length = 0;
            actionHandlers.clear();
        },
    };
    ActionBus.registerAll({
        ...(0, preview_js_1.getPreviewActions)(),
        ...(0, windows_js_1.getWindowActions)(),
        ...(0, finder_js_1.getFinderActions)(),
        ...(0, session_js_1.getSessionActions)(),
    });
    window.ActionBus = ActionBus;
})();
//# sourceMappingURL=action-bus.js.map
