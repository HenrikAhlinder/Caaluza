# Bug Fixes for Client-Only Version

## Issues Fixed

### 1. Global Variables Not Accessible in ES6 Modules

**Problem:** BrickEditor and UIController are ES6 modules and couldn't access global variables (`colors`, `sizes`, `views`, etc.) that were defined in the inline script.

**Solution:** Changed all references to use `window.` prefix:
- `BrickEditor.js`: Changed `views` → `window.views`, `selectedView` → `window.selectedView`, `existingMap` → `window.existingMap`
- `UIController.js`: Changed `colors` → `window.colors`, `sizes` → `window.sizes`

**Files Modified:**
- `static/js/BrickEditor.js` (lines 86-87, 97)
- `static/js/UIController.js` (lines 23-24, 410-412)

### 2. Missing Buttons Causing Errors

**Problem:** UIController was trying to attach event listeners to save/load buttons that don't exist in the client-only version.

**Solution:** Added null checks before attaching event listeners:
```javascript
const saveBtn = document.getElementById('save-btn');
if (saveBtn) {
    // attach listener
}
```

**Files Modified:**
- `static/js/UIController.js` (setupSaveLoad method)

### 3. Missing Modal Elements

**Problem:** UIController expected a modal with id `prompt-modal` that doesn't exist in index.html (replaced by generator modal).

**Solution:** Added early return if modal doesn't exist:
```javascript
setupModal() {
    this.modal = document.getElementById('prompt-modal');
    if (!this.modal) {
        return; // Modal doesn't exist in client-only version
    }
    // ... rest of setup
}
```

**Files Modified:**
- `static/js/UIController.js` (setupModal method)

### 4. Function References in app.js

**Problem:** app.js was calling `showSeedDisplay()`, `hideSeedDisplay()`, and `closeGeneratorModal()` without the `window.` prefix.

**Solution:** Changed all function calls to use `window.` prefix since they're defined in the global scope.

**Files Modified:**
- `static/js/app.js` (lines 47, 95, 154)

## How to Test

1. Start a local web server:
   ```bash
   python3 -m http.server 8000
   ```

2. Open `http://localhost:8000/index.html`

3. Verify:
   - ✅ The 3D scene renders
   - ✅ Brick selector buttons are visible
   - ✅ View buttons (Top, North, South, etc.) are visible
   - ✅ Zoom controls are visible
   - ✅ Generate button opens modal
   - ✅ New button is visible
   - ✅ Can place bricks by clicking size buttons
   - ✅ Can generate maps with parameters
   - ✅ Seed is displayed after generation
   - ✅ URL updates with seed
   - ✅ Refreshing page with seed in URL regenerates the same map

## Known Limitations

These features from the Flask version are not available in the client-only version:

1. **Save/Load** - No buttons present (maps are seed-based instead)
2. **Database** - No persistent storage (use seeds for sharing)
3. **Map Browsing** - No gallery (could be added as static JSON file)
4. **User Accounts** - No authentication (not needed for static site)

## Common Issues and Solutions

### Issue: "Cannot read property 'name' of undefined"
**Cause:** `window.colors` or `window.sizes` not defined before module loads
**Solution:** Ensure inline `<script>` tags come before `<script type="module">`

### Issue: Buttons not showing
**Cause:** CSS might be hiding elements with `.ui-hidden` class
**Solution:** Check that `updateUIBasedOnMode()` is not hiding elements in edit mode

### Issue: Map doesn't generate
**Cause:** MapGenerator module has errors or seed is invalid
**Solution:** Check browser console for errors, verify seed format

### Issue: Generate modal doesn't open
**Cause:** Event listener not attached or function not global
**Solution:** Verify `window.openGeneratorModal` is defined

## File Structure

```
index.html              # Main HTML (sets up globals, includes all UI)
static/js/
├── app.js             # Main app logic (seed handling, initialization)
├── MapGenerator.js    # Map generation algorithm
├── SeedSystem.js      # Seed encode/decode
├── BrickEditor.js     # Main 3D editor (uses window.views, etc.)
├── UIController.js    # UI interactions (uses window.colors, etc.)
├── Brick.js           # 3D brick rendering
├── BrickManager.js    # Brick state management
├── CameraSystem.js    # Camera controls
├── EditorConfig.js    # Configuration constants
├── InteractionSystem.js  # Mouse/touch interactions
└── LightingSystem.js  # Scene lighting
```

## Debugging Tips

1. **Open Browser Console** (F12) to see errors
2. **Check Network Tab** to verify all JS files load
3. **Add console.logs** in app.js init() function:
   ```javascript
   console.log('Colors:', window.colors);
   console.log('Views:', window.views);
   console.log('Existing map:', window.existingMap);
   ```
4. **Verify Module Loading**: Check that all imports resolve correctly
5. **Check Three.js**: Verify Three.js CDN loads (check console for THREE object)

## Next Steps

If you encounter issues:

1. Check browser console for JavaScript errors
2. Verify all files are in the correct locations
3. Test with `python3 -m http.server` (don't open file:// directly)
4. Try different browsers (Chrome, Firefox recommended)
5. Clear browser cache if making changes

## Deploying to GitHub Pages

Once local testing works:

1. Commit all changes
2. Push to GitHub
3. Enable Pages in Settings
4. Your app will be live!
