# Session Restore Manual Testing Guide

## Overview
This guide provides steps to manually test the session restore functionality.

## Prerequisites
- Development server running on port 5173 (typically via `npm run dev`)
- Browser with localStorage enabled
- Browser DevTools open for console monitoring

## Test Scenarios

### Test 1: Basic Terminal Instance Restoration

**Steps:**
1. Open http://127.0.0.1:5173 in your browser
2. Open DevTools Console (F12)
3. Click on the Terminal icon in the dock
4. Click the "+" button to create 3 terminal instances
5. Switch to the second tab (Terminal 2)
6. Type a command in the terminal (e.g., `help`)
7. In Console, verify session is being saved:
   ```javascript
   SessionManager.saveAllSessions()
   // Should log: "SessionManager: Saved X instances..."
   ```
8. Reload the page (F5 or Ctrl+R)
9. Wait for app to load

**Expected Results:**
- ✅ 3 terminal tabs should be restored
- ✅ Terminal 2 should be the active tab (highlighted)
- ✅ Terminal modal should be visible
- ✅ Console shows: "SessionManager: Restored X instances"

### Test 2: Text Editor Instance Restoration

**Steps:**
1. Click on the Text Editor icon in the dock
2. Create 2 text editor instances via "+" button
3. In Editor 1, type: "Hello from Editor 1"
4. Switch to Editor 2 and type: "Hello from Editor 2"
5. Switch back to Editor 1 (make it active)
6. Reload the page

**Expected Results:**
- ✅ 2 text editor tabs should be restored
- ✅ Editor 1 should be active
- ✅ Content "Hello from Editor 1" should be visible
- ✅ Text editor modal should be visible

### Test 3: Modal State Restoration

**Steps:**
1. Open the Apple menu (top-left)
2. Click "About"
3. Open Settings modal (click Settings in dock)
4. In Console, check modal state:
   ```javascript
   localStorage.getItem('window-session')
   // Should show modalState with 'about-modal' and 'settings-modal'
   ```
5. Reload the page

**Expected Results:**
- ✅ Both About and Settings modals should be visible
- ✅ Z-index ordering preserved (Settings on top)
- ✅ Console shows no errors

### Test 4: Mixed Instance Types

**Steps:**
1. Create 2 terminals (switch to Terminal 2)
2. Create 1 text editor (make it active)
3. Open About modal
4. In Console:
   ```javascript
   SessionManager.saveAllSessions()
   ```
5. Reload the page

**Expected Results:**
- ✅ Terminal modal visible with 2 tabs, Terminal 2 active
- ✅ Text Editor modal visible with 1 tab
- ✅ About modal visible
- ✅ All instance managers have correct active instance

### Test 5: Empty Session (Fresh Start)

**Steps:**
1. In Console:
   ```javascript
   localStorage.clear()
   ```
2. Reload the page

**Expected Results:**
- ✅ App loads without errors
- ✅ No modals are open
- ✅ Console shows: "SessionManager: No saved sessions found"
- ✅ Dock is visible and functional

### Test 6: Transient Modal Exclusion

**Steps:**
1. In Console, inject a session with transient modal (uses example modal IDs):
   ```javascript
   // Note: 'program-info-modal' is a transient modal in this application
   // 'about-modal' is a persistent modal - adjust IDs based on your setup
   const sessionData = {
       version: '1.1',
       timestamp: Date.now(),
       sessions: {},
       modalState: {
           'program-info-modal': { visible: true, minimized: false, zIndex: '1001' },
           'about-modal': { visible: true, minimized: false, zIndex: '1000' }
       },
       tabState: {}
   };
   localStorage.setItem('window-session', JSON.stringify(sessionData));
   ```
2. Reload the page

**Expected Results:**
- ✅ About modal IS visible (persistent modal restored)
- ✅ Program Info modal is NOT visible (transient modal skipped, has hidden class)
- ✅ Console may show warning about skipping transient modal

### Test 7: Idempotency (Double Restore)

**Steps:**
1. Create 1 terminal instance
2. Reload the page
3. Verify 1 terminal instance exists
4. Immediately reload again without changing anything
5. Verify still only 1 terminal instance

**Expected Results:**
- ✅ After first reload: 1 instance
- ✅ After second reload: Still 1 instance (not 2)
- ✅ No duplicate instances created

### Test 8: Auto-Save Verification

**Steps:**
1. Create 2 terminal instances
2. Wait 30 seconds (auto-save interval)
3. In Console, check:
   ```javascript
   JSON.parse(localStorage.getItem('window-session'))
   // Should show updated timestamp and 2 terminal instances
   ```
4. Reload the page

**Expected Results:**
- ✅ Instances are restored (auto-save worked)
- ✅ Timestamp is within last 30 seconds
- ✅ Console shows: "SessionManager: Saved X instances..."

## Debugging Tips

### Check Session Data
```javascript
// View current session
JSON.parse(localStorage.getItem('window-session'))

// Check instance managers
TerminalInstanceManager.getInstanceCount()
TextEditorInstanceManager.getInstanceCount()

// Check active instances
TerminalInstanceManager.getActiveInstance()
TextEditorInstanceManager.getActiveInstance()

// Manual save
SessionManager.saveAllSessions()

// Manual restore
SessionManager.restoreAllSessions()
```

### Common Issues

**Issue:** No instances restored
- Check: Is session data in localStorage?
- Check: Are instance managers registered?
- Check: Console for errors during restore

**Issue:** Wrong tab is active
- Check: Was active instance set before save?
- Check: Tab state in session data
- Check: Tab controller refresh called after restore

**Issue:** Modal not visible
- Check: Is modal ID in modalState?
- Check: Is modal registered in WindowManager?
- Check: Console warnings about missing modals

## Console Monitoring

Look for these log messages:

**On Save:**
```
SessionManager: Saved X instances across Y types
```

**On Restore:**
```
SessionManager: Restored X instances
```

**Warnings (expected in some cases):**
```
SessionManager: No saved sessions found
SessionManager: No manager registered for type X
SessionManager: Modal "X" not found in DOM
```

**Errors (should not occur):**
```
SessionManager: Failed to save sessions: ...
SessionManager: Failed to restore sessions: ...
```

## Performance Check

For large sessions:
1. Create 5 terminals, 3 text editors, open 3 modals
2. Reload the page
3. Measure time to restore (should be < 500ms)
4. Check localStorage size:
   ```javascript
   const data = localStorage.getItem('window-session');
   console.log('Session size:', data.length, 'bytes');
   ```

**Expected:**
- ✅ Restore time < 500ms
- ✅ Session size < 50KB (typically 5-15KB)
- ✅ No UI lag or freezing

## Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ Instances restored correctly
- ✅ Active tabs preserved
- ✅ Modal visibility preserved
- ✅ Z-index ordering maintained
- ✅ Transient modals excluded
- ✅ Empty sessions handled gracefully
- ✅ Idempotent restore behavior

## Reporting Issues

If you find issues, please report:
1. Browser and version
2. Test scenario number
3. Console errors/warnings
4. Session data (from localStorage)
5. Expected vs actual behavior
