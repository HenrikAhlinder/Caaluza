import { EditorConfig } from './EditorConfig.js';
import { CameraSystem } from './CameraSystem.js';
import { LightingSystem } from './LightingSystem.js';
import { InteractionSystem } from './InteractionSystem.js';
import { BrickManager } from './BrickManager.js';
import { UIController } from './UIController.js';

function addCompassOverlay() {
    // Check if compass already exists
    if (document.querySelector('.compass-overlay')) {
        return; // Compass already added, don't add another
    }

    const compass = document.createElement('div');
    compass.className = 'compass-overlay';
    compass.innerHTML = `
        <span class="compass-n">N</span>
        <span class="compass-e">E</span>
        <span class="compass-s">S</span>
        <span class="compass-w">W</span>
    `;
    // Compass styling handled by CSS
    // Compass direction styling handled by CSS
    // Append to canvas container instead of body
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
        canvasContainer.appendChild(compass);
    } else {
        document.body.appendChild(compass);
    }
}

/**
 * Main editor application class
 */
export class BrickEditor {
    setupModeDisplay() {
        // Create the placed bricks display overlay
        this.bricksDisplay = document.createElement('div');
        this.bricksDisplay.className = 'bricks-display ui-hidden';
        this.bricksDisplay.innerHTML = '<div class="bricks-display-header">Bricks <button id="close-bricks-display" class="bricks-display-close">×</button></div><div id="bricks-list"></div>';
        document.body.appendChild(this.bricksDisplay);

        // Button to show placed bricks - add to bottom bar
        const showBricksBtn = document.getElementById('show-bricks-btn');
        showBricksBtn.addEventListener('click', () => {
            this.updateBricksDisplay();
            this.bricksDisplay.classList.remove('ui-hidden');
        });
        this.bricksDisplay.querySelector('#close-bricks-display').addEventListener('click', () => {
            this.bricksDisplay.classList.add('ui-hidden');
        });
    }

    updateBricksDisplay() {
        const bricks = this.brickManager.getBricks().filter(b => b.buttonName !== 'Baseplate');
        const list = this.bricksDisplay.querySelector('#bricks-list');
        if (!bricks.length) {
            list.innerHTML = '<em>No bricks placed.</em>';
            return;
        }

        const groups = bricks.reduce((acc, brick) => {
            const hex = brick.color.toString(16).padStart(6, '0');
            if (!acc[hex]) acc[hex] = [];
            acc[hex].push(brick);
            return acc;
        }, {});

        // Define which colors go in left column (green, blue) vs right column (yellow, red)
        const leftColumnColors = ['00ff00', '0000ff']; // green, blue
        const rightColumnColors = ['ffff00', 'ff0000']; // yellow, red

        const leftColumn = [];
        const rightColumn = [];

        Object.keys(groups).forEach(hex => {
            const bricksHtml = groups[hex].map(brick => {
                return `<div class="brick-item">
                            <span class="brick-item-name">${brick.buttonName}</span>
                        </div>`;
            }).join('');
            const colorGroup = `<div>${bricksHtml}</div><hr class="bricks-separator">`;

            if (leftColumnColors.includes(hex)) {
                leftColumn.push(colorGroup);
            } else if (rightColumnColors.includes(hex)) {
                rightColumn.push(colorGroup);
            } else {
                // Default: put unknown colors in right column
                rightColumn.push(colorGroup);
            }
        });

        // Render two columns
        list.innerHTML = `
            <div class="brick-column">${leftColumn.join('')}</div>
            <div class="brick-column">${rightColumn.join('')}</div>
        `;
    }

    constructor(mode = 'edit') {
        this.setupModeDisplay();
        this.mode = mode; // 'edit' or 'play'
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('three-canvas') });
        this.setupRenderer();
        addCompassOverlay();
        
        this.cameraSystem = new CameraSystem(EditorConfig.GRID_CENTER, window.views, window.selectedView);
        this.lightingSystem = new LightingSystem(this.scene, EditorConfig.GRID_CENTER, window.views);
        this.interactionSystem = new InteractionSystem();
        this.brickManager = new BrickManager(this.scene);
        this.uiController = new UIController(this.brickManager, document.querySelector('.brick-selector'));
        
        this.setupEventListeners();
        this.setupZoomControls();
        this.setupModeControls();
        
        // Load existing map if available
        if (typeof window.existingMap !== 'undefined' && window.existingMap) {
            this.loadExistingMap(window.existingMap);
        }
        
        this.startRenderLoop();
    }

    loadExistingMap(mapData) {
        try {
            // Update title display
            const titleDisplay = document.getElementById('title-display');
            if (titleDisplay) {
                titleDisplay.textContent = mapData.map_id || 'Untitled Map';
            }

            // Load bricks from the map data
            if (mapData.map && mapData.map.bricks) {
                mapData.map.bricks.forEach(brickData => {
                    this.uiController.loadBrick(brickData);
                });
            }

            // Store the current map ID for saving
            this.currentMapId = mapData.map_id;
        } catch (error) {
            console.error('Error loading existing map:', error);
        }
    }

    setupRenderer() {
        // Get the canvas container to size the renderer appropriately
        const canvas = document.getElementById('three-canvas');
        const container = canvas.parentElement;

        // Use container dimensions instead of full window
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Canvas already exists in DOM, no need to append
        // Add resize observer to handle container size changes
        const resizeObserver = new ResizeObserver(() => {
            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;
            this.renderer.setSize(newWidth, newHeight);
            this.cameraSystem.updateAspectRatio(newWidth / newHeight);
        });
        resizeObserver.observe(container);
    }

    setupEventListeners() {
        // Mouse movement for camera and brick dragging
        window.addEventListener('mousemove', (event) => {
            this.interactionSystem.updateMouse(event.clientX, event.clientY);

            // Allow camera movement in edit mode, or rotation in play/edit mode (top view only)
            if (this.mode === 'edit') {
                this.cameraSystem.updateCameraMovement(event.clientX, event.clientY);
            } else if (this.mode === 'play' && this.cameraSystem.isTopView()) {
                this.cameraSystem.updateCameraRotation(event.clientX, event.clientY);
            }

            // Only allow brick dragging in edit mode
            if (this.mode === 'edit' && this.brickManager.isDragging()) {
                const intersection = this.interactionSystem.getPlaneIntersection(this.cameraSystem.getActiveCamera());
                if (intersection) {
                    this.brickManager.updateDragPosition(intersection.x, intersection.z);
                }
            }
        });

        // Mouse button events
        window.addEventListener('mousedown', (event) => {
            if (event.button === 1) { // Middle mouse button - both modes
                this.cameraSystem.startCameraMovement(event.clientX, event.clientY);
            } else if (event.button === 0 && !this.brickManager.isDragging()) { // Left click
                this.handleLeftClick();
            } else if (event.button === 2) { // Right click
                this.handleRightClick();
                event.preventDefault();
            }
        });

        window.addEventListener('mouseup', (event) => {
            if (event.button === 1) { // Middle mouse button - both modes
                this.cameraSystem.stopCameraMovement();
            } else if (event.button === 0 && this.mode === 'edit' && this.brickManager.isDragging()) { // Left click release
                this.brickManager.stopDrag();
            }
        });

        // Keyboard events
        window.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });

        // Prevent context menu
        window.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        window.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.cameraSystem.startCameraMovement(e.touches[0].clientX, e.touches[0].clientY);
            }
        });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                if (this.mode === 'edit') {
                    this.cameraSystem.updateCameraMovement(e.touches[0].clientX, e.touches[0].clientY);
                } else if (this.mode === 'play' && this.cameraSystem.isTopView()) {
                    this.cameraSystem.updateCameraRotation(e.touches[0].clientX, e.touches[0].clientY);
                }
            }
        });

        window.addEventListener('touchend', () => {
            this.cameraSystem.stopCameraMovement();
        });
    }

    setupZoomControls() {
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                this.cameraSystem.zoomIn();
            });
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                this.cameraSystem.zoomOut();
            });
        }

        // Add mouse wheel zoom support
        window.addEventListener('wheel', (event) => {
            event.preventDefault();
            if (event.deltaY < 0) {
                this.cameraSystem.zoomIn();
            } else {
                this.cameraSystem.zoomOut();
            }
        }, { passive: false });
    }

    handleLeftClick() {
        // Disable editing interactions in play mode
        if (this.mode === 'play') return;

        const raycaster = this.interactionSystem.raycastFromCamera(this.cameraSystem.getActiveCamera());
        const intersects = this.interactionSystem.intersectObjects(
            this.brickManager.getBricks().map(brick => brick.mesh)
        );

        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object;
            const brick = this.brickManager.findBrickByMesh(intersectedMesh);

            if (brick) {
                const brickPosition = brick.mesh.position;
                const offset = new THREE.Vector3().copy(intersects[0].point).sub(brickPosition);
                this.brickManager.startDrag(brick, offset);
            }
        }
    }

    handleRightClick() {
        // Disable editing interactions in play mode
        if (this.mode === 'play') return;

        const raycaster = this.interactionSystem.raycastFromCamera(this.cameraSystem.getActiveCamera());
        const intersects = this.interactionSystem.intersectObjects(
            this.brickManager.getBricks().map(brick => brick.mesh)
        );

        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object;
            const brick = this.brickManager.findBrickByMesh(intersectedMesh);

            if (brick) {
                this.uiController.enableButtonByTitle(brick.buttonName);
                this.brickManager.removeBrick(brick);
            }
        }
    }

    handleKeyDown(event) {
        // Disable editing keyboard controls in play mode
        if (this.mode === 'play') return;

        switch (event.key) {
            case 'q':
                // Toggle camera movement (legacy support)
                break;
            case 'w':
                this.brickManager.moveDraggedBrickVertical(1);
                break;
            case 's':
                this.brickManager.moveDraggedBrickVertical(-1);
                break;
            case 'r':
                this.brickManager.rotateDraggedBrick();
                break;
        }
    }

    setupModeControls() {
        this.updateUIBasedOnMode();
    }

    setMode(mode) {
        if (mode === 'edit' || mode === 'play') {
            this.mode = mode;
            this.updateUIBasedOnMode();
        }
    }

    getMode() {
        return this.mode;
    }

    updateUIBasedOnMode() {
        const bottomBar = document.querySelector('.bottom-bar');
        const seedDisplayContainer = document.getElementById('seed-display-container');

        if (this.mode === 'play') {
            // Add play mode class to body for CSS styling
            document.body.classList.add('play-mode');

            // Hide bottom bar for immersive play experience
            if (bottomBar) bottomBar.style.display = 'none';
            if (seedDisplayContainer) seedDisplayContainer.style.display = 'none';

            // Trigger resize to update canvas dimensions (flexbox handles height automatically)
            setTimeout(() => {
                const canvas = document.getElementById('three-canvas');
                if (canvas && canvas.parentElement) {
                    const container = canvas.parentElement;
                    const width = container.clientWidth;
                    const height = container.clientHeight;
                    this.renderer.setSize(width, height);
                    this.cameraSystem.updateAspectRatio(width / height);
                }
            }, 100);
        } else {
            // Remove play mode class from body
            document.body.classList.remove('play-mode');

            // Show bottom bar in edit mode
            if (bottomBar) bottomBar.style.display = '';

            // Trigger resize to update canvas dimensions (flexbox handles height automatically)
            setTimeout(() => {
                const canvas = document.getElementById('three-canvas');
                if (canvas && canvas.parentElement) {
                    const container = canvas.parentElement;
                    const width = container.clientWidth;
                    const height = container.clientHeight;
                    this.renderer.setSize(width, height);
                    this.cameraSystem.updateAspectRatio(width / height);
                }
            }, 100);
        }
    }

    startRenderLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            this.renderer.render(this.scene, this.cameraSystem.getActiveCamera());
        };
        animate();
    }
}
