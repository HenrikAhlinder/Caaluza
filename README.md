# Caaluza - Client-Only LEGO Builder

A web-based 3D LEGO-like brick builder application that runs entirely in your browser. No backend required!

## Features

- **3D Visualization**: Real-time Three.js-based brick placement and manipulation
- **Procedural Generation**: Algorithm-based random map generation with collision detection
- **Seed-Based Sharing**: Generate maps with specific parameters and share them via URL seeds
- **Responsive UI**: Collapsible brick selector and zoom controls for different screen sizes
- **Client-Only**: Runs entirely in the browser - no server needed

## How to Use

### Building Mode

1. Open the application in your browser
2. Click the "Bricks" button to open the brick selector
3. Choose a color and size to place bricks in the 3D scene
4. **Left-click and drag** to move bricks
5. **Right-click** to remove bricks
6. **W/S keys** to move bricks up/down
7. **R key** to rotate bricks

### Generate Mode

1. Click the "Generate" button
2. Enter parameters:
   - **Number of Bricks**: How many bricks to place (1-100)
   - **Max Height**: Maximum height limit (optional)
   - **Min Height**: Minimum height to achieve (optional)
3. Click "Generate"
4. A seed will be displayed that represents your map
5. Copy or share the URL to let others see the same map

### Sharing Maps

When you generate a map, a seed is created and added to the URL. You can:
- Copy the seed directly
- Share the entire URL
- Anyone with the URL can view the exact same map

Example URL: `https://yourusername.github.io/Caaluza/?seed=10-5-2-123456`

## Deployment to GitHub Pages

1. Push this repository to GitHub
2. Go to Settings → Pages
3. Select the branch to deploy (usually `main`)
4. Set the root directory as the source
5. Save and wait for deployment

Your app will be available at: `https://yourusername.github.io/Caaluza/`

## Project Structure

```
Caaluza/
├── index.html              # Main HTML file
├── static/
│   ├── css/
│   │   └── edit.css       # Styles
│   └── js/
│       ├── app.js          # Main application logic
│       ├── MapGenerator.js # Map generation algorithm
│       ├── SeedSystem.js   # Seed encoding/decoding
│       ├── BrickEditor.js  # 3D editor
│       ├── Brick.js        # Brick models
│       ├── BrickManager.js # Brick management
│       ├── CameraSystem.js # Camera controls
│       ├── EditorConfig.js # Configuration
│       ├── InteractionSystem.js # User interactions
│       ├── LightingSystem.js    # Scene lighting
│       └── UIController.js      # UI management
└── README.md
```

## Technical Details

### Seed Format

Seeds are encoded in the format: `{nrBricks}-{maxHeight}-{minHeight}-{randomSeed}`

- `nrBricks`: Number of bricks (1-100)
- `maxHeight`: Maximum height or "null"
- `minHeight`: Minimum height or "null"
- `randomSeed`: Random seed for deterministic generation

Example: `15-8-null-456789`

### Map Generation Algorithm

The map generator uses:
- Collision detection to prevent overlapping bricks
- Smart placement algorithms that consider building constraints
- Height-aware strategies when min/max height constraints are specified
- Seeded random number generation for reproducible results

## Browser Requirements

- Modern browser with ES6 module support
- WebGL support for 3D rendering
- Recommended: Chrome, Firefox, Safari, or Edge (latest versions)

## Local Development

Simply open `index.html` in your browser, or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server
```

Then visit `http://localhost:8000`

## Legacy Flask Backend

The original Flask backend is still available in the repository for reference but is no longer needed for the client-only version. See the old setup below if you want to run the Flask version:

1. Install requirements in `requirements.txt`
2. (Suggestion, run with uv).
3. Run Controller.py
4. Browse to http://127.0.0.1:5000/caaluza

## Credits

Built with:
- [Three.js](https://threejs.org/) - 3D graphics library
- Vanilla JavaScript (ES6 modules)
- No framework dependencies!

## License

This project is open source and available under the MIT License.

