/**
 * src/ts/utils/auto-save-helper.ts
 * Shared utility for triggering auto-save via SessionManager
 */

/**
 * Triggers auto-save for a specific instance type via SessionManager
 * @param type - The instance type to save
 */
export function triggerAutoSave(type: string): void {
    const w = window as unknown as Record<string, unknown>;
    const SessionManager = w.SessionManager as Record<string, unknown> | undefined;
    if (SessionManager && typeof SessionManager.saveInstanceType === 'function') {
        try {
            (SessionManager.saveInstanceType as (type: string) => void)(type);
        } catch (error) {
            console.warn('Failed to trigger auto-save:', error);
        }
    }
}
