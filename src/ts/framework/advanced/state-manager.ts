/**
 * Enhanced State Management
 * 
 * Advanced state management with selectors, middleware, and computed values.
 * Inspired by Redux/Zustand patterns but optimized for the MacUI framework.
 */

export type Selector<S, R> = (state: S) => R;
export type Middleware<S> = (state: S, action: string, payload: any) => S | void;
export type StateListener<S> = (state: S, prevState: S) => void;
export type ComputedValue<S, R> = (state: S) => R;

export interface StateManagerConfig<S> {
    initialState: S;
    middleware?: Middleware<S>[];
    debug?: boolean;
}

/**
 * State Manager
 * 
 * Centralized state management with advanced features.
 * 
 * @example
 * ```typescript
 * interface AppState {
 *     user: { name: string; email: string } | null;
 *     theme: 'light' | 'dark';
 *     count: number;
 * }
 * 
 * const stateManager = new StateManager<AppState>({
 *     initialState: { user: null, theme: 'light', count: 0 },
 *     middleware: [loggingMiddleware, persistenceMiddleware],
 *     debug: true
 * });
 * 
 * // Subscribe to state changes
 * stateManager.subscribe((state, prev) => {
 *     console.log('State changed:', state);
 * });
 * 
 * // Create selector
 * const userNameSelector = stateManager.createSelector(
 *     (state) => state.user?.name ?? 'Guest'
 * );
 * 
 * // Use selector
 * const userName = userNameSelector();
 * 
 * // Dispatch action
 * stateManager.dispatch('SET_USER', { name: 'John', email: 'john@example.com' });
 * ```
 */
export class StateManager<S = any> {
    private state: S;
    private listeners: Set<StateListener<S>> = new Set();
    private middleware: Middleware<S>[];
    private debug: boolean;
    private computedCache: Map<Selector<S, any>, any> = new Map();

    constructor(config: StateManagerConfig<S>) {
        this.state = config.initialState;
        this.middleware = config.middleware || [];
        this.debug = config.debug || false;
    }

    /**
     * Get current state
     */
    getState(): S {
        return this.state;
    }

    /**
     * Set state (use dispatch instead for tracked changes)
     */
    setState(newState: Partial<S> | ((prev: S) => S)): void {
        const prevState = this.state;

        if (typeof newState === 'function') {
            this.state = (newState as (prev: S) => S)(this.state);
        } else {
            this.state = { ...this.state, ...newState };
        }

        this.notifyListeners(prevState);
        this.invalidateComputed();
    }

    /**
     * Dispatch action through middleware chain
     */
    dispatch(action: string, payload?: any): void {
        if (this.debug) {
            console.log(`[StateManager] Action: ${action}`, payload);
        }

        const prevState = this.state;
        let newState = this.state;

        // Run through middleware
        for (const mw of this.middleware) {
            const result = mw(newState, action, payload);
            if (result) {
                newState = result;
            }
        }

        this.state = newState;
        this.notifyListeners(prevState);
        this.invalidateComputed();
    }

    /**
     * Subscribe to state changes
     */
    subscribe(listener: StateListener<S>): () => void {
        this.listeners.add(listener);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Create selector with memoization
     */
    createSelector<R>(selector: Selector<S, R>): () => R {
        return () => {
            if (this.computedCache.has(selector)) {
                return this.computedCache.get(selector);
            }

            const result = selector(this.state);
            this.computedCache.set(selector, result);
            return result;
        };
    }

    /**
     * Create computed value (auto-updates)
     */
    createComputed<R>(compute: ComputedValue<S, R>): () => R {
        let cached: R;
        let initialized = false;

        this.subscribe(() => {
            cached = compute(this.state);
            initialized = true;
        });

        return () => {
            if (!initialized) {
                cached = compute(this.state);
                initialized = true;
            }
            return cached;
        };
    }

    private notifyListeners(prevState: S): void {
        this.listeners.forEach((listener) => {
            listener(this.state, prevState);
        });
    }

    private invalidateComputed(): void {
        this.computedCache.clear();
    }

    /**
     * Reset to initial state
     */
    reset(initialState: S): void {
        const prevState = this.state;
        this.state = initialState;
        this.notifyListeners(prevState);
        this.invalidateComputed();
    }

    /**
     * Get listener count (for debugging)
     */
    getListenerCount(): number {
        return this.listeners.size;
    }
}

/**
 * Common middleware examples
 */

/**
 * Logging middleware
 */
export const loggingMiddleware = <S>(state: S, action: string, payload: any): void => {
    console.group(`Action: ${action}`);
    console.log('Payload:', payload);
    console.log('State:', state);
    console.groupEnd();
};

/**
 * Persistence middleware
 */
export const createPersistenceMiddleware = <S>(key: string) => {
    return (state: S, action: string, payload: any): S => {
        localStorage.setItem(key, JSON.stringify(state));
        return state;
    };
};

/**
 * Validation middleware
 */
export const createValidationMiddleware = <S>(validator: (state: S) => boolean) => {
    return (state: S, action: string, payload: any): S => {
        if (!validator(state)) {
            console.warn(`[StateManager] Invalid state after action: ${action}`);
        }
        return state;
    };
};
