/**
 * Simple reactive store for global state management within the framework
 */

export type Listener<T> = (state: T) => void;

export class Store<T> {
    private state: T;
    private listeners: Set<Listener<T>> = new Set();

    constructor(initialState: T) {
        this.state = initialState;
    }

    /**
     * Get current state
     */
    getState(): T {
        return this.state;
    }

    /**
     * Update state and notify listeners
     */
    setState(newState: Partial<T>): void {
        this.state = { ...this.state, ...newState };
        this.notify();
    }

    /**
     * Subscribe to state changes
     * @returns Unsubscribe function
     */
    subscribe(listener: Listener<T>): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        this.listeners.forEach(listener => listener(this.state));
    }
}
