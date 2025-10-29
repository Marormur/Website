/**
 * src/ts/utils/auto-save-helper.ts
 * Shared utility for triggering auto-save via SessionManager
 */
/**
 * Triggers auto-save for a specific instance type via SessionManager
 * @param type - The instance type to save
 */
export function triggerAutoSave(type) {
    const w = window;
    const SessionManager = w.SessionManager;
    if (SessionManager && typeof SessionManager.saveInstanceType === 'function') {
        try {
            SessionManager.saveInstanceType(type);
        }
        catch (error) {
            console.warn('Failed to trigger auto-save:', error);
        }
    }
}
