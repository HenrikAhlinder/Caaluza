# Play Mode and View Parameters

## Overview

The application now supports URL parameters that allow you to share maps with specific camera views and in "play mode" (viewer-only mode with UI hidden).

## URL Parameters

### `seed` - Map Configuration
The seed parameter contains the map data:
```
?seed=10-5-2-123456
```

### `mode` - Interaction Mode

**`edit` (default)**
- Full editing interface
- All controls visible (brick selector, view buttons, zoom, generate)
- Users can modify the map

**`play`**
- Viewer-only mode
- UI elements hidden for clean viewing experience
- Users can only view and navigate the map
- Perfect for sharing completed creations

### `view` - Initial Camera Position

Sets which camera angle the map loads with:
- `Top` - Bird's eye view from above
- `North` - View from north side
- `South` - View from south side
- `East` - View from east side
- `West` - View from west side

## Example URLs

### Basic Sharing
```
# Edit mode (default) - full controls
https://yourusername.github.io/Caaluza/?seed=10-5-2-123456

# Edit mode with specific starting view
https://yourusername.github.io/Caaluza/?seed=10-5-2-123456&view=North
```

### Play Mode (Viewer Only)
```
# Play mode with top view - clean presentation
https://yourusername.github.io/Caaluza/?seed=10-5-2-123456&mode=play&view=Top

# Play mode with north view
https://yourusername.github.io/Caaluza/?seed=10-5-2-123456&mode=play&view=North
```

## Use Cases

### For Creators (Edit Mode)
1. Generate a map
2. Click "Copy URL" button
3. Share the edit URL with collaborators
4. Recipients can view and modify

### For Viewers (Play Mode)
1. Generate/edit your map
2. Click "Copy Play URL" button
3. Share with viewers who just want to see your creation
4. Recipients see a clean view without editing controls

### For Presentations
Use play mode with specific views for:
- Portfolio showcases
- Tutorial walkthroughs
- Gallery presentations
- Social media sharing

## Share Buttons

The seed display now has sharing options:

1. **Copy Seed** - Copies just the seed string
   - Use: For manually creating custom URLs

2. **Copy URL** - Copies edit mode URL
   - Use: Share with people who can edit/modify

3. **Play Mode Buttons** - Five separate buttons for each view:
   - **Play: Top** - Copies play mode URL with Top view
   - **Play: North** - Copies play mode URL with North view
   - **Play: South** - Copies play mode URL with South view
   - **Play: East** - Copies play mode URL with East view
   - **Play: West** - Copies play mode URL with West view
   - Use: Share read-only view of your creation with specific camera angle

## How It Works

### On Page Load
1. URL parameters are parsed
2. `mode` parameter sets edit/play mode
3. `view` parameter sets initial camera position
4. `seed` parameter generates the map
5. UI elements show/hide based on mode

### Mode Behavior

**Edit Mode (`mode=edit` or no mode parameter)**
- Shows: Brick selector, view buttons, zoom controls, generate button
- Allows: Placing bricks, removing bricks, generating new maps
- Camera: Can be moved with middle mouse, switched with view buttons

**Play Mode (`mode=play`)**
- Hides: All editing UI elements
- Shows: Only the 3D canvas and placed bricks display button
- Camera: Can be moved with middle mouse (in top view) or touch
- Perfect for: Showcasing finished creations

## Implementation Details

### Files Modified
- `static/js/SeedSystem.js` - Added `getViewFromURL()`, `getModeFromURL()`
- `static/js/app.js` - Parse URL params and set `window.mode` and `window.selectedView`
- `index.html` - Added "Copy Play URL" button
- `README.md` - Documented URL parameters

### Global Variables Set
```javascript
window.mode = 'play' or 'edit'  // From URL or default 'edit'
window.selectedView = 'Top'      // From URL or null
```

### BrickEditor Integration
The existing `BrickEditor` class already supports play mode:
- Checks `window.mode` in constructor
- Calls `updateUIBasedOnMode()` to show/hide elements
- Disables editing interactions when `mode === 'play'`

## Testing

Try these examples locally:

```bash
# Start server
python3 -m http.server 8000

# Test URLs
http://localhost:8000/?seed=10-5-null-12345
http://localhost:8000/?seed=10-5-null-12345&view=North
http://localhost:8000/?seed=10-5-null-12345&mode=play&view=Top
```

## Future Enhancements

Potential additions:
- Custom view angles (not just preset views)
- Animation/rotation modes
- Screenshot capture button
- Embed code generator
- QR code generation for mobile sharing
- Social media preview images
