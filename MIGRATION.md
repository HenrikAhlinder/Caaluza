# Migration Guide: Flask Backend to Client-Only

This document explains the changes made to convert Caaluza from a Flask-based application to a fully client-side application suitable for GitHub Pages.

## Summary of Changes

The application has been converted from a Flask backend + JavaScript frontend architecture to a pure client-side application that runs entirely in the browser.

### Key Features After Migration

1. **No Backend Required**: All functionality runs in the browser
2. **Seed-Based Map Sharing**: Maps are encoded as URL parameters instead of being stored in a database
3. **GitHub Pages Compatible**: Can be deployed to any static hosting service
4. **Deterministic Generation**: Same seed always generates the same map

## Files Added

### New JavaScript Modules

1. **`static/js/MapGenerator.js`**
   - JavaScript port of `Mapgenerator/Mapgenerator.py`
   - Implements the same brick placement algorithm
   - Includes seeded random number generation for reproducibility
   - Exports: `generateMap()`, `Config`, `BrickDef`, `Point`, `brickDefsToMapData()`

2. **`static/js/SeedSystem.js`**
   - Seed encoding/decoding system
   - URL parameter management
   - Format: `{nrBricks}-{maxHeight}-{minHeight}-{randomSeed}`
   - Exports: `encodeToSeed()`, `decodeFromSeed()`, `isValidSeed()`, etc.

3. **`static/js/app.js`**
   - Main application entry point
   - Replaces Flask routing logic
   - Handles initialization, seed parsing, map generation
   - Integrates all modules

### Updated Files

1. **`index.html`**
   - New standalone HTML file replacing `templates/edit.html`
   - Includes generator modal UI
   - Seed display component
   - Removed Flask Jinja2 templating
   - Added inline JavaScript for configuration

2. **`README.md`**
   - Updated with client-only documentation
   - GitHub Pages deployment instructions
   - Usage guide for seed-based sharing

### GitHub Pages Files

1. **`.nojekyll`**
   - Empty file to prevent Jekyll processing on GitHub Pages

## Files Deprecated (Still in Repo)

These files are no longer used by the client-only version but remain in the repository:

- `Controller.py` - Flask application
- `Storage.py` - SQLite database layer
- `Brick.py` - Python data models (ported to JavaScript)
- `Mapgenerator/Mapgenerator.py` - Python generation logic (ported to JavaScript)
- `templates/*.html` - Flask templates
- All Python-related files

## Architecture Changes

### Before (Flask Backend)

```
┌─────────────────────────────────────────┐
│  Browser (Client)                       │
│  ├─ Three.js 3D Editor                  │
│  ├─ Brick.js (Client-side models)       │
│  └─ edit.js (UI Controller)             │
└──────────────┬──────────────────────────┘
               │ HTTP Requests
               │ (Save/Load/Generate)
               ▼
┌─────────────────────────────────────────┐
│  Flask Server (Backend)                 │
│  ├─ Controller.py (Routes)              │
│  ├─ Storage.py (SQLite)                 │
│  ├─ Brick.py (Data models)              │
│  └─ Mapgenerator/ (Algorithm)           │
└─────────────────────────────────────────┘
```

### After (Client-Only)

```
┌─────────────────────────────────────────┐
│  Browser (Client) - Everything Here!    │
│  ├─ Three.js 3D Editor                  │
│  ├─ Brick.js (3D rendering)             │
│  ├─ BrickEditor.js (Main editor)        │
│  ├─ MapGenerator.js (Algorithm)         │
│  ├─ SeedSystem.js (Persistence)         │
│  └─ app.js (Application logic)          │
└─────────────────────────────────────────┘
         │
         │ URL Parameters (Seeds)
         │ Example: ?seed=10-5-2-123456
         ▼
    Shareable Links
```

## Functional Changes

### Map Storage

**Before:**
- Maps saved to SQLite database
- Each map had a unique ID
- Required server for persistence

**After:**
- Maps encoded as URL seeds
- No database needed
- Sharing via URL

### Map Generation

**Before:**
```python
# Python endpoint
@app.route('/generate')
def generate_map():
    config = Config(nr_pieces, max_height, min_height)
    map_data = generate_map(config)
    return jsonify(map_data)
```

**After:**
```javascript
// Client-side generation
const config = new Config(nrBricks, maxHeight, minHeight);
const brickDefs = generateMap(config, randomSeed);
const seed = encodeToSeed(nrBricks, maxHeight, minHeight);
updateURLWithSeed(seed);
```

### Map Sharing

**Before:**
- Share map ID: `"my-awesome-map"`
- Requires server to load: `GET /map/my-awesome-map`

**After:**
- Share URL with seed: `?seed=15-8-3-456789`
- Browser decodes and regenerates map
- No server needed

## Seed Format

Seeds encode all information needed to recreate a map:

```
Format: {nrBricks}-{maxHeight}-{minHeight}-{randomSeed}

Examples:
- "10-null-null-123456" - 10 bricks, no height limits
- "15-8-3-789012" - 15 bricks, max height 8, min height 3
- "20-10-null-345678" - 20 bricks, max height 10, no min
```

The `randomSeed` ensures the same configuration always generates the same map.

## Deployment Steps

### GitHub Pages Deployment

1. **Prepare Repository**
   ```bash
   # Ensure all files are committed
   git add .
   git commit -m "Convert to client-only application"
   git push origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Select source branch (main)
   - Select root directory
   - Save

3. **Access Your Site**
   - URL: `https://{username}.github.io/{repo-name}/`
   - Example: `https://henktron.github.io/Caaluza/`

### Local Testing

```bash
# Using Python
cd /path/to/Caaluza
python -m http.server 8000

# Using Node.js
npx http-server

# Visit: http://localhost:8000
```

## Breaking Changes

1. **No Save/Load via Backend**
   - Save and Load buttons removed
   - All persistence is via URL seeds

2. **No User Accounts**
   - No authentication system
   - Anyone with the seed can view the map

3. **No Map Database**
   - No browsing of saved maps
   - No search functionality
   - Maps exist only as seeds

## Benefits of Client-Only Architecture

1. **Zero Infrastructure Costs**: No server hosting needed
2. **Infinite Scalability**: GitHub Pages handles all traffic
3. **Offline Capable**: Can be packaged as PWA
4. **Fast**: No network round-trips for generation
5. **Simple Deployment**: Just push to GitHub
6. **Version Control**: All code in git, no database migrations

## Future Enhancements

Possible additions that maintain client-only architecture:

1. **LocalStorage**: Save favorite seeds locally
2. **QR Codes**: Generate QR codes for easy mobile sharing
3. **Export**: Download map as JSON or image
4. **Gallery**: Static JSON file with featured seeds
5. **PWA**: Make it installable on mobile devices

## Testing

To verify the migration:

1. Open `index.html` in browser
2. Click "Generate" button
3. Enter parameters (e.g., 10 bricks, max height 5)
4. Verify a seed appears in the UI
5. Copy the URL
6. Open URL in new tab
7. Verify the same map loads

## Rollback

To revert to Flask backend:

1. Checkout previous commit
2. Run `python Controller.py`
3. Access `http://localhost:5000/caaluza`

All Flask files remain in the repository for reference.
