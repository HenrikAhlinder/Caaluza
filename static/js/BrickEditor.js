import { EditorConfig } from './EditorConfig.js';
import { CameraSystem } from './CameraSystem.js';
import { LightingSystem } from './LightingSystem.js';
import { InteractionSystem } from './InteractionSystem.js';
import { BrickManager } from './BrickManager.js';
import { UIController } from './UIController.js';

function addCompassOverlay() {
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
    document.body.appendChild(compass);
}

/**
 * Main editor application class
 */
export class BrickEditor {
    setupModeDisplay() {
        // Create the placed bricks display overlay
        this.bricksDisplay = document.createElement('div');
        this.bricksDisplay.className = 'bricks-display ui-hidden';
        this.bricksDisplay.innerHTML = '<div class="bricks-display-header">Placed Bricks <button id="close-bricks-display" class="bricks-display-close">×</button></div><div id="bricks-list"></div>';
        document.body.appendChild(this.bricksDisplay);

        // Button to show placed bricks
        this.showBricksBtn = document.createElement('button');
        this.showBricksBtn.id = 'show-bricks-btn';
        this.showBricksBtn.textContent = 'Show Placed Bricks';
        this.showBricksBtn.className = 'show-bricks-button ui-hidden';
        document.body.appendChild(this.showBricksBtn);

        // Show/hide logic
        this.showBricksBtn.addEventListener('click', () => {
            this.updateBricksDisplay();
            this.bricksDisplay.classList.remove('ui-hidden');
            this.bricksDisplay.classList.add('ui-visible');
        });
        this.bricksDisplay.querySelector('#close-bricks-display').addEventListener('click', () => {
            this.bricksDisplay.classList.remove('ui-visible');
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

        // Render all bricks, grouped by color, with a separator between groups
        list.innerHTML = Object.keys(groups).map(hex => {
            const bricksHtml = groups[hex].map(brick => {
                return `<div class="brick-item">
                            <span class="brick-item-name">${brick.buttonName}</span>
                        </div>`;
            }).join('');
            return `<div>${bricksHtml}</div><hr class="bricks-separator">`;
        }).join('');
    }

    constructor(mode = 'edit') {
        this.setupModeDisplay();
        this.mode = mode; // 'edit' or 'play'
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('three-canvas') });
        this.setupRenderer();
        addCompassOverlay();
        
        this.cameraSystem = new CameraSystem(EditorConfig.GRID_CENTER, views, selectedView);
        this.lightingSystem = new LightingSystem(this.scene, EditorConfig.GRID_CENTER, views);
        this.interactionSystem = new InteractionSystem();
        this.brickManager = new BrickManager(this.scene);
        this.uiController = new UIController(this.brickManager, document.querySelector('.brick-selector'));
        
        this.setupEventListeners();
        this.setupZoomControls();
        this.setupModeControls();
        
        // Load existing map if available
        if (typeof existingMap !== 'undefined' && existingMap) {
            this.loadExistingMap(existingMap);
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
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);
    }

    setupEventListeners() {
        // Mouse movement for camera and brick dragging
        window.addEventListener('mousemove', (event) => {
            this.interactionSystem.updateMouse(event.clientX, event.clientY);

            // Only allow camera movement in edit mode
            if (this.mode === 'edit') {
                this.cameraSystem.updateCameraMovement(event.clientX, event.clientY);
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
            if (event.button === 1 && this.mode === 'edit') { // Middle mouse button - only in edit mode
                this.cameraSystem.startCameraMovement(event.clientX, event.clientY);
            } else if (event.button === 0 && !this.brickManager.isDragging()) { // Left click
                this.handleLeftClick();
            } else if (event.button === 2) { // Right click
                this.handleRightClick();
                event.preventDefault();
            }
        });

        window.addEventListener('mouseup', (event) => {
            if (event.button === 1 && this.mode === 'edit') { // Middle mouse button - only in edit mode
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
            if (e.touches.length === 1 && this.mode === 'edit') {
                this.cameraSystem.startCameraMovement(e.touches[0].clientX, e.touches[0].clientY);
            }
        });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                this.cameraSystem.updateCameraMovement(e.touches[0].clientX, e.touches[0].clientY);
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

            if (brick && !brick.isBaseplate) {
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

            if (brick && !brick.isBaseplate) {
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
        const brickSelectorContainer = document.querySelector('.brick-selector-container');
        const buttonContainer = document.querySelector('.button-container');
        const zoomControls = document.querySelector('.zoom-controls');
        const saveBtn = document.getElementById('save-btn');
        const loadBtn = document.getElementById('load-btn');
        const generateBtn = document.getElementById('generate-btn');
        const startOverBtn = document.getElementById('start-over-btn');

        if (this.mode === 'play') {
            if (this.showBricksBtn) this.showBricksBtn.classList.remove('ui-hidden');
            if (this.bricksDisplay) this.bricksDisplay.classList.add('ui-hidden');
            // Hide all buttons in play mode
            if (brickSelectorContainer) brickSelectorContainer.classList.add('ui-hidden');
            if (buttonContainer) buttonContainer.classList.add('ui-hidden');
            if (zoomControls) zoomControls.classList.add('ui-hidden');
            if (saveBtn) saveBtn.classList.add('ui-hidden');
            if (loadBtn) loadBtn.classList.add('ui-hidden');
            if (generateBtn) generateBtn.classList.add('ui-hidden');
            if (startOverBtn) startOverBtn.classList.add('ui-hidden');
        } else {
            if (this.showBricksBtn) this.showBricksBtn.classList.add('ui-hidden');
            if (this.bricksDisplay) this.bricksDisplay.classList.add('ui-hidden');
            // Show all buttons in edit mode
            if (brickSelectorContainer) brickSelectorContainer.classList.remove('ui-hidden');
            if (buttonContainer) buttonContainer.classList.remove('ui-hidden');
            if (zoomControls) zoomControls.classList.remove('ui-hidden');
            if (saveBtn) saveBtn.classList.remove('ui-hidden');
            if (loadBtn) loadBtn.classList.remove('ui-hidden');
            if (generateBtn) generateBtn.classList.remove('ui-hidden');
            if (startOverBtn) startOverBtn.classList.remove('ui-hidden');
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