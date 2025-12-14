/**
 * ActionBus - Declarative event system to wire UI actions via data-action attributes.
 *
 * Example:
 *   <button data-action="closeWindow" data-window-id="text-modal">Close</button>
 *   ActionBus.register('closeWindow', (params, el) => { ... })
 */
import { extractParams, type Handler, type Params } from './actions/helpers.js';
import { getFinderActions } from './actions/finder.js';
import { getPreviewActions } from './actions/preview.js';
import { getSessionActions } from './actions/session.js';
import { getWindowActions } from './actions/windows.js';

console.log('ActionBus loaded');

(function () {
    'use strict';

    const actionHandlers = new Map<string, Handler>();
    const eventDelegates: Array<{ eventType: string; delegate: (e: Event) => void }> = [];

    const ActionBus = {
        register(actionName: string, handler: Handler) {
            if (!actionName || typeof handler !== 'function') {
                console.error('Invalid action registration:', actionName);
                return;
            }
            actionHandlers.set(actionName, handler);
        },

        registerAll(actions: Record<string, Handler>) {
            Object.entries(actions).forEach(([name, handler]) => {
                this.register(name, handler);
            });
        },

        execute(actionName: string, params: Params = {}, element: HTMLElement | null = null) {
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
                const actionName = element.getAttribute('data-action') as string;
                const params = extractParams(element.dataset);

                if (element.tagName === 'BUTTON' || element.tagName === 'A') {
                    event.preventDefault();
                }
                event.stopPropagation();

                this.execute(actionName, params, element);
            });

            this.delegateEvent('dblclick', '[data-action-dblclick]', (element, event) => {
                const actionName = element.getAttribute('data-action-dblclick') as string;
                const params = extractParams(element.dataset);
                if (element.tagName === 'BUTTON' || element.tagName === 'A') {
                    event.preventDefault();
                }
                event.stopPropagation();
                this.execute(actionName, params, element);
            });

            this.delegateEvent('mouseenter', '[data-action-hover]', element => {
                const actionName = element.getAttribute('data-action-hover') as string;
                const params = extractParams(element.dataset);
                this.execute(actionName, params, element);
            });

            console.log('ActionBus initialized');
        },

        delegateEvent(
            eventType: string,
            selector: string,
            handler: (element: HTMLElement, event: Event) => void
        ) {
            const delegate = (event: Event) => {
                const target = event.target;
                if (!(target instanceof Element)) return;

                const element = target.closest(selector) as HTMLElement | null;
                if (element) {
                    handler(element, event);
                }
            };

            document.addEventListener(eventType, delegate as EventListener);
            eventDelegates.push({ eventType, delegate });
        },

        extractParams(element: HTMLElement): Params {
            return extractParams(element.dataset);
        },

        destroy() {
            eventDelegates.forEach(({ eventType, delegate }) => {
                document.removeEventListener(eventType, delegate as EventListener);
            });
            eventDelegates.length = 0;
            actionHandlers.clear();
        },
    } as const;

    ActionBus.registerAll({
        ...getPreviewActions(),
        ...getWindowActions(),
        ...getFinderActions(),
        ...getSessionActions(),
    });

    (window as unknown as { ActionBus: typeof ActionBus }).ActionBus = ActionBus;
})();
