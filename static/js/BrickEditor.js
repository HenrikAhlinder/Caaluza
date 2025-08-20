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
    Object.assign(compass.style, {
        position: 'fixed',
        left: '24px',
        bottom: '24px',
        width: '90px',
        height: '90px',
        pointerEvents: 'none',
        zIndex: 2000,
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#fff',
        textShadow: '0 0 6px #000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.08)',
        borderRadius: '50%',
         boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
         transition: 'transform 0.1s ease-out'
    });
    compass.querySelector('.compass-n').style.cssText = 'position:absolute;top:8px;left:50%;transform:translateX(-50%);';
    compass.querySelector('.compass-e').style.cssText = 'position:absolute;top:50%;right:8px;transform:translateY(-50%);';
    compass.querySelector('.compass-s').style.cssText = 'position:absolute;bottom:8px;left:50%;transform:translateX(-50%);';
    compass.querySelector('.compass-w').style.cssText = 'position:absolute;top:50%;left:8px;transform:translateY(-50%);';
    document.body.appendChild(compass);
}

/**
 * Main editor application class
 */
export class BrickEditor {
    setupModeDisplay() {
        // Create the placed bricks display overlay
        this.bricksDisplay = document.createElement('div');
        this.bricksDisplay.className = 'placed-bricks-display';
        Object.assign(this.bricksDisplay.style, {
            position: 'fixed',
            top: '60px',
            right: '40px',
            width: '340px',
            maxHeight: '60vh',
            overflowY: 'auto',
            background: 'rgba(30,30,30,0.98)',
            color: '#fff',
            borderRadius: '10px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
            zIndex: 4000,
            padding: '18px 18px 12px 18px',
            fontSize: '15px',
            display: 'none',
        });
        this.bricksDisplay.innerHTML = '<div style="font-weight:bold;font-size:17px;margin-bottom:10px;">Placed Bricks <button id="close-bricks-display" style="float:right;background:#444;color:#fff;border:none;border-radius:5px;padding:2px 10px;cursor:pointer;font-size:14px;">×</button></div><div id="bricks-list"></div>';
        document.body.appendChild(this.bricksDisplay);

        // Button to show placed bricks
        this.showBricksBtn = document.createElement('button');
        this.showBricksBtn.id = 'show-bricks-btn';
        this.showBricksBtn.textContent = 'Show Placed Bricks';
        Object.assign(this.showBricksBtn.style, {
            position: 'fixed',
            top: '20px',
            right: '40px',
            zIndex: 4001,
            background: '#2196F3',
            color: '#fff',
            border: 'none',
            borderRadius: '7px',
            padding: '8px 18px',
            fontSize: '15px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            display: 'none',
        });
        document.body.appendChild(this.showBricksBtn);

        // Show/hide logic
        this.showBricksBtn.addEventListener('click', () => {
            this.updateBricksDisplay();
            this.bricksDisplay.style.display = 'block';
        });
        this.bricksDisplay.querySelector('#close-bricks-display').addEventListener('click', () => {
            this.bricksDisplay.style.display = 'none';
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
                return `<div style="margin-bottom:7px;padding-bottom:7px;border-bottom:1px solid #333;">
                            <span style="font-weight:bold;">${brick.buttonName}</span>
                        </div>`;
            }).join('');
            return `<div>${bricksHtml}</div><hr style="border:1px solid #ccc;margin:15px 0;">`;
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
        const brickSelectorContainer = document.querySelector('.brick-selector-container');
        const buttonContainer = document.querySelector('.button-container');
        const zoomControls = document.querySelector('.zoom-controls');
        const saveBtn = document.getElementById('save-btn');
        const loadBtn = document.getElementById('load-btn');
        const generateBtn = document.getElementById('generate-btn');

        if (this.mode === 'play') {
            if (this.showBricksBtn) this.showBricksBtn.style.display = '';
            if (this.bricksDisplay) this.bricksDisplay.style.display = 'none';
            // Hide all buttons in play mode
            if (brickSelectorContainer) brickSelectorContainer.style.display = 'none';
            if (buttonContainer) buttonContainer.style.display = 'none';
            if (zoomControls) zoomControls.style.display = 'none';
            if (saveBtn) saveBtn.style.display = 'none';
            if (loadBtn) loadBtn.style.display = 'none';
            if (generateBtn) generateBtn.style.display = 'none';
        } else {
            if (this.showBricksBtn) this.showBricksBtn.style.display = 'none';
            if (this.bricksDisplay) this.bricksDisplay.style.display = 'none';
            // Show all buttons in edit mode
            if (brickSelectorContainer) brickSelectorContainer.style.display = '';
            if (buttonContainer) buttonContainer.style.display = '';
            if (zoomControls) zoomControls.style.display = '';
            if (saveBtn) saveBtn.style.display = '';
            if (loadBtn) loadBtn.style.display = '';
            if (generateBtn) generateBtn.style.display = '';
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