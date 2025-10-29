/**
 * Debug script to test window focus restoration
 * Run this in the browser console after opening two windows
 */

console.log('=== Window Focus Restoration Debug ===');

// 1. Check if __zIndexManager exists
console.log('1. __zIndexManager exists:', typeof window.__zIndexManager !== 'undefined');
if (window.__zIndexManager) {
    console.log('   - getWindowStack:', typeof window.__zIndexManager.getWindowStack);
    console.log('   - restoreWindowStack:', typeof window.__zIndexManager.restoreWindowStack);
    console.log('   - bringToFront:', typeof window.__zIndexManager.bringToFront);
}

// 2. Check if SessionManager exists
console.log('2. SessionManager exists:', typeof window.SessionManager !== 'undefined');
if (window.SessionManager) {
    console.log('   - saveAll:', typeof window.SessionManager.saveAll);
    console.log('   - restoreSession:', typeof window.SessionManager.restoreSession);
}

// 3. Open two windows for testing
console.log('\n3. Opening test windows...');
window.API.window.open('about-modal');
setTimeout(() => {
    window.API.window.open('settings-modal');

    setTimeout(() => {
        // 4. Check initial window stack
        console.log('\n4. Initial window stack:');
        const stack1 = window.__zIndexManager.getWindowStack();
        console.log('   Stack:', JSON.stringify(stack1));
        console.log('   Expected: ["about-modal", "settings-modal"]');
        console.log('   Top window (Settings):', stack1[stack1.length - 1]);

        // 5. Click on About modal to bring it to front
        console.log('\n5. Bringing About modal to front...');
        const aboutDialog = window.dialogs['about-modal'];
        if (aboutDialog) {
            aboutDialog.bringToFront();

            setTimeout(() => {
                const stack2 = window.__zIndexManager.getWindowStack();
                console.log('   Stack after bringToFront:', JSON.stringify(stack2));
                console.log('   Expected: ["settings-modal", "about-modal"]');
                console.log('   Top window (About):', stack2[stack2.length - 1]);

                // 6. Save session
                console.log('\n6. Saving session...');
                window.SessionManager.saveAll({ immediate: true });

                // 7. Check localStorage
                const sessionData = localStorage.getItem('windowInstancesSession');
                if (sessionData) {
                    const parsed = JSON.parse(sessionData);
                    console.log('   windowStack in session:', JSON.stringify(parsed.windowStack));
                    console.log('   Expected: ["settings-modal", "about-modal"]');

                    if (parsed.windowStack && parsed.windowStack.length > 0) {
                        console.log('\n✅ SUCCESS: windowStack is saved correctly!');
                        console.log('   Now reload the page (F5) and run this check:');
                        console.log('   window.__zIndexManager.getWindowStack()');
                        console.log('   Expected result: ["settings-modal", "about-modal"]');
                    } else {
                        console.error('\n❌ FAIL: windowStack is empty or undefined!');
                    }
                } else {
                    console.error('\n❌ FAIL: No session data in localStorage!');
                }
            }, 100);
        } else {
            console.error('   ❌ Could not find about-modal dialog instance');
        }
    }, 300);
}, 300);
