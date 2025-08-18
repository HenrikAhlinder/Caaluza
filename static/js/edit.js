import { Brick } from './Brick.js';

function updateCompassRotation(direction) {
    const compass = document.querySelector('.compass-overlay');
    if (compass) {
        // Calculate the angle between the direction vector and "up" (screen +Y, which is { x: 0, z: -1 })
        const angle = Math.atan2(direction.x, -direction.z); // atan2(z, x) because north is (1, 0)

        // Rotate the compass in the opposite direction to simulate fixed-world north
        compass.style.transform = `rotate(${-angle}rad)`;
    }
}

function getCompassDirectionVector(cameraPos, targetPos) {
    const dx = targetPos.x - cameraPos.x;
    const dz = targetPos.z - cameraPos.z;

    const length = Math.sqrt(dx*dx + dz*dz);

    if (length === 0) {
        return { x: 0, z: 0 };
    }

    return {
        x: dx / length,
        z: dz / length
    };
}

// Adds a compass overlay to indicate North, East, South, West
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
 * Configuration class to centralize all configuration constants
*/
class EditorConfig {
    static GRID_CENTER = new THREE.Vector3(3, 0, 3);
    static GRID_SIZE = 6;
    static ASPECT_RATIO = window.innerWidth / window.innerHeight;
    static ORTHO_SIZE = 15;
    static CAMERA_ROTATION_SPEED = 0.005;
    static VERTICAL_STEP = 1;
    static BASEPLATE_HEIGHT = 0.2;
}

/**
 * Camera system management class
 */
class CameraSystem {
    constructor(gridCenter, views, selectedView) {
        this.gridCenter = gridCenter;
        this.views = views;
        this.playerCameras = {};
        this.mainCamera = null;
        this.activeCamera = null;
        this.shouldMove = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        // Spherical coordinates
        this.phi = Math.PI / 4;    // vertical angle (0 = top, PI = bottom)
        this.theta = Math.PI / 4;  // horizontal angle

        this.radius = 35;          // distance from grid center

        // Clamp Phi to avoid rotation over top of the world
        this.minPhi = 0.1;         // minimum vertical angle (near top)
        this.maxPhi = Math.PI - 0.1; // maximum vertical angle (horizon)
        this.totalRotationY = 0;
        this.selectedView = selectedView

        this.init();
    }

    init() {
        this.createMainCamera();
        this.createPlayerCameras();

        this.activeCamera = this.mainCamera;
        if (this.selectedView !== null) {
            this.setActiveCamera(this.playerCameras[selectedView]);
        }
    }

    createMainCamera() {
        this.mainCamera = new THREE.OrthographicCamera(
            -EditorConfig.ORTHO_SIZE * EditorConfig.ASPECT_RATIO,
            EditorConfig.ORTHO_SIZE * EditorConfig.ASPECT_RATIO,
            EditorConfig.ORTHO_SIZE,
            -EditorConfig.ORTHO_SIZE,
            0.1,
            1000
        );
         // Set initial camera position using spherical coordinates
         const x = this.radius * Math.sin(this.phi) * Math.cos(this.theta);
         const y = this.radius * Math.cos(this.phi);
         const z = this.radius * Math.sin(this.phi) * Math.sin(this.theta);
         this.mainCamera.position.set(
             this.gridCenter.x + x,
             this.gridCenter.y + y,
             this.gridCenter.z + z
         );
        this.mainCamera.lookAt(this.gridCenter);
        updateCompassRotation(getCompassDirectionVector(this.mainCamera.position, this.gridCenter));
    }

    createPlayerCameras() {
        const buttonContainer = document.querySelector('.button-container');

        this.views.forEach(view => {
            const camera = new THREE.OrthographicCamera(
                -EditorConfig.ORTHO_SIZE * EditorConfig.ASPECT_RATIO,
                EditorConfig.ORTHO_SIZE * EditorConfig.ASPECT_RATIO,
                EditorConfig.ORTHO_SIZE,
                -EditorConfig.ORTHO_SIZE,
                0.1,
                1000
            );
            camera.position.set(view.position.x, view.position.y, view.position.z);
            camera.lookAt(this.gridCenter);

            this.playerCameras[view.name] = camera;

            // Set up view button event listener
            const viewButton = buttonContainer.querySelector(`.view-button.${view.name}`);
            if (viewButton) {
                viewButton.addEventListener('click', () => {
                    this.setActiveCamera(camera);
                });
            }
        });

        // Handle generic view buttons
        buttonContainer.querySelectorAll('.view-button').forEach(button => {
            const viewName = button.textContent.trim();
            button.addEventListener('click', () => {
                if (this.playerCameras[viewName]) {
                    this.setActiveCamera(this.playerCameras[viewName]);
                }
            });
        });
    }

    setActiveCamera(camera) {
        this.activeCamera = camera;
        // Reset total rotation when switching cameras
        // Update compass rotation when switching cameras
        updateCompassRotation(getCompassDirectionVector(camera.position, this.gridCenter));
    }

    getActiveCamera() {
        return this.activeCamera;
    }

    startCameraMovement(mouseX, mouseY) {
        this.shouldMove = true;
        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;

        if (this.activeCamera === this.mainCamera) {
            return;
        }

        this.mainCamera.position.copy(this.activeCamera.position);
        this.mainCamera.rotation.copy(this.activeCamera.rotation);

        // Calculate spherical coordinates from current camera position
        const relativePos = this.mainCamera.position.clone().sub(this.gridCenter);

        this.radius = relativePos.length();
        this.phi = Math.acos(relativePos.y / this.radius);
        this.theta = Math.atan2(relativePos.z, relativePos.x);

        // The top view is a singularity, avoid it.
        this.phi = Math.max(Math.acos(relativePos.y / this.radius), 0.01); // Avoid phi=0
        if (Math.abs(this.phi) < 0.02) {
            this.theta = Math.PI / 2; // Default theta for top view
        }

        this.activeCamera = this.mainCamera;
    }

    stopCameraMovement() {
        this.shouldMove = false;
    }

    updateCameraMovement(mouseX, mouseY) {
        if (!this.shouldMove) return;

        const deltaX = mouseX - this.lastMouseX;
        const deltaY = mouseY - this.lastMouseY;

         // Update spherical coordinates
         this.theta -= deltaX * EditorConfig.CAMERA_ROTATION_SPEED;
         this.phi = Math.min(Math.max(
             this.phi + deltaY * EditorConfig.CAMERA_ROTATION_SPEED,
             this.minPhi
         ), this.maxPhi);

         // Convert spherical to Cartesian coordinates
         const x = this.radius * Math.sin(this.phi) * Math.cos(this.theta);
         const y = this.radius * Math.cos(this.phi);
         const z = this.radius * Math.sin(this.phi) * Math.sin(this.theta);

         // Update camera position
         this.activeCamera.position.set(
             this.gridCenter.x + x,
             this.gridCenter.y + y,
             this.gridCenter.z + z
         );

        // Update compass rotation
        updateCompassRotation(getCompassDirectionVector(this.activeCamera.position, this.gridCenter));
        this.activeCamera.lookAt(this.gridCenter);

        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;
    }

    zoomIn() {
        const zoomFactor = 0.9;
        this.updateCameraZoom(zoomFactor);
    }

    zoomOut() {
        const zoomFactor = 1.1;
        this.updateCameraZoom(zoomFactor);
    }

    updateCameraZoom(zoomFactor) {
        const camera = this.activeCamera;
        if (camera instanceof THREE.OrthographicCamera) {
            const newSize = EditorConfig.ORTHO_SIZE * zoomFactor;

            // Limit zoom range
            const minZoom = 5;
            const maxZoom = 50;
            if (newSize < minZoom || newSize > maxZoom) return;

            EditorConfig.ORTHO_SIZE = newSize;

            // Update the active camera
            camera.left = -newSize * EditorConfig.ASPECT_RATIO;
            camera.right = newSize * EditorConfig.ASPECT_RATIO;
            camera.top = newSize;
            camera.bottom = -newSize;
            camera.updateProjectionMatrix();

            // Update all other cameras to maintain consistency
            Object.values(this.playerCameras).forEach(cam => {
                cam.left = -newSize * EditorConfig.ASPECT_RATIO;
                cam.right = newSize * EditorConfig.ASPECT_RATIO;
                cam.top = newSize;
                cam.bottom = -newSize;
                cam.updateProjectionMatrix();
            });

            this.mainCamera.left = -newSize * EditorConfig.ASPECT_RATIO;
            this.mainCamera.right = newSize * EditorConfig.ASPECT_RATIO;
            this.mainCamera.top = newSize;
            this.mainCamera.bottom = -newSize;
            this.mainCamera.updateProjectionMatrix();
        }
    }
}

/**
 * Lighting system management class
 */
class LightingSystem {
    constructor(scene, gridCenter, views) {
        this.scene = scene;
        this.gridCenter = gridCenter;
        this.views = views;
        this.init();
    }

    init() {
        this.views.forEach(view => {
            this.addLight(`light-above-${view.name}`,
                new THREE.Vector3(view.position.x + 10, view.position.y + 10, view.position.z + 10));
            this.addLight(`light-below-${view.name}`,
                new THREE.Vector3(view.position.x - 10, view.position.y - 10, view.position.z - 10));
        });
    }

    addLight(name, position) {
        const light = new THREE.DirectionalLight(0xffffff, 0.5);
        light.name = name;
        light.position.set(position.x, position.y, position.z);
        light.lookAt(this.gridCenter);
        light.castShadow = false;
        this.scene.add(light);
    }
}

/**
 * Raycasting and mouse interaction system
 */
class InteractionSystem {
    constructor() {
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.planeIntersect = new THREE.Vector3();
    }

    updateMouse(clientX, clientY) {
        this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    }

    raycastFromCamera(camera) {
        this.raycaster.setFromCamera(this.mouse, camera);
        return this.raycaster;
    }

    getPlaneIntersection(camera) {
        this.raycaster.setFromCamera(this.mouse, camera);
        this.raycaster.ray.intersectPlane(this.plane, this.planeIntersect);
        return this.planeIntersect;
    }

    intersectObjects(objects) {
        return this.raycaster.intersectObjects(objects);
    }
}

/**
 * Brick management system
 */
class BrickManager {
    constructor(scene) {
        this.scene = scene;
        this.bricks = [];
        this.currentlyDraggedBrick = null;
        this.dragOffset = new THREE.Vector3();
        this.ghostBrick = null;

        this.setupBaseplate();
    }

    setupBaseplate() {
        const baseplate = new Brick(
            new THREE.Vector3(EditorConfig.GRID_SIZE, -EditorConfig.BASEPLATE_HEIGHT, EditorConfig.GRID_SIZE),
            0x808080,
            { width: EditorConfig.GRID_SIZE, height: EditorConfig.BASEPLATE_HEIGHT, depth: EditorConfig.GRID_SIZE },
            'Baseplate'
        );
        baseplate.addToScene(this.scene);
    }

    addBrick(brick) {
        this.bricks.push(brick);
        brick.addToScene(this.scene);
    }

    removeBrick(brick) {
        const index = this.bricks.indexOf(brick);
        if (index > -1) {
            this.bricks.splice(index, 1);
            brick.removeFromScene(this.scene);
        }
    }

    findBrickByMesh(mesh) {
        return this.bricks.find(brick => brick.isthisBrick(mesh));
    }

    startDrag(brick, offset = new THREE.Vector3()) {
        this.currentlyDraggedBrick = brick;
        this.dragOffset.copy(offset);
        this.createGhostBrick();
    }

    stopDrag() {
        this.removeGhostBrick();
        this.currentlyDraggedBrick = null;
        this.dragOffset.set(0, 0, 0);
    }

    updateDragPosition(x, z) {
        if (!this.currentlyDraggedBrick) return;

        const snappedX = Math.round(x - this.dragOffset.x);
        const snappedZ = Math.round(z - this.dragOffset.z);

        this.currentlyDraggedBrick.setPosition(snappedX, snappedZ);

        if (this.ghostBrick) {
            this.ghostBrick.position.set(snappedX, -0.5, snappedZ);
            this.ghostBrick.visible = this.currentlyDraggedBrick.mesh.position.y > -0.5;
        }
    }

    moveDraggedBrickVertical(direction) {
        if (!this.currentlyDraggedBrick) return;

        this.currentlyDraggedBrick.mesh.position.y += direction * EditorConfig.VERTICAL_STEP;

        if (this.ghostBrick) {
            this.ghostBrick.visible = this.currentlyDraggedBrick.mesh.position.y > -0.5;
        }
    }

    rotateDraggedBrick() {
        if (!this.currentlyDraggedBrick) return;

        this.currentlyDraggedBrick.mesh.rotation.y += Math.PI / 2;

        if (this.ghostBrick) {
            this.ghostBrick.rotation.copy(this.currentlyDraggedBrick.mesh.rotation);
        }
    }

    createGhostBrick() {
        if (!this.currentlyDraggedBrick) return;

        const originalBrick = this.currentlyDraggedBrick;
        const ghostGeometry = new THREE.BoxGeometry(
            originalBrick.size.width,
            originalBrick.size.height,
            originalBrick.size.depth
        );
        ghostGeometry.translate(-originalBrick.size.width / 2, originalBrick.size.height, -originalBrick.size.depth / 2);

        const ghostMaterial = new THREE.MeshLambertMaterial({
            color: "white",
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });

        this.ghostBrick = new THREE.Mesh(ghostGeometry, ghostMaterial);

        const edges = new THREE.EdgesGeometry(ghostGeometry);
        const outline = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({
                color: "white",
                transparent: true,
                opacity: 0.6
            })
        );
        this.ghostBrick.add(outline);

        this.scene.add(this.ghostBrick);
    }

    removeGhostBrick() {
        if (this.ghostBrick) {
            this.scene.remove(this.ghostBrick);
            this.ghostBrick.geometry.dispose();
            this.ghostBrick.material.dispose();
            this.ghostBrick = null;
        }
    }

    clearAll() {
        this.bricks.forEach(brick => {
            brick.removeFromScene(this.scene);
        });
        this.bricks.length = 0;
    }

    getBricks() {
        return this.bricks;
    }

    isDragging() {
        return this.currentlyDraggedBrick !== null;
    }
}

/**
 * UI interaction handler
 */
class UIController {
    constructor(brickManager, brickSelector) {
        this.brickManager = brickManager;
        this.brickSelector = brickSelector;
        this.titleDisplay = document.getElementById('title-display');
        this.currentMapName = '';

        this.setupBrickSelector();
        this.setupSaveLoad();
        this.setupModal();
    }

    setupBrickSelector() {
        this.brickSelector.querySelectorAll('.size-button').forEach(button => {
            button.addEventListener('mousedown', (event) => {
                const [sizeName, colorName] = button.title.split(' ');
                const color = colors.find(c => c.name === colorName);
                const size = sizes.find(s => s.name === sizeName);

                if (!this.brickManager.isDragging() && color && size) {
                    const newBrick = new Brick(
                        new THREE.Vector3(1000, 0, 1000),
                        color.hex,
                        { width: size.width, height: 1, depth: size.depth },
                        button.title
                    );

                    this.brickManager.addBrick(newBrick);
                    this.brickManager.startDrag(newBrick);

                    this.disableButton(button);
                }
            });
        });
    }

    setupSaveLoad() {
        document.getElementById('save-btn').addEventListener('click', () => {
            this.promptForSave();
        });

        document.getElementById('load-btn').addEventListener('click', () => {
            this.promptForLoad();
        });

        document.getElementById('generate-btn').addEventListener('click', () => {
            this.generateMap();
        });
    }

    setupModal() {
        this.modal = document.getElementById('prompt-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalInput = document.getElementById('modal-input');
        this.modalConfirm = document.getElementById('modal-confirm');
        this.modalCancel = document.getElementById('modal-cancel');
        this.closeBtn = this.modal.querySelector('.close');

        // Close modal events
        this.closeBtn.addEventListener('click', () => this.closeModal());
        this.modalCancel.addEventListener('click', () => this.closeModal());

        // Close modal when clicking outside
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.closeModal();
            }
        });

        // Handle Enter key in modal input
        this.modalInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                this.modalConfirm.click();
            }
        });
    }

    showModal(title, placeholder = '', defaultValue = '', authorDefault = '') {
        return new Promise((resolve, reject) => {
            this.modalTitle.textContent = title;
            this.modalInput.placeholder = placeholder;
            this.modalInput.value = defaultValue;
            this.modal.style.display = 'block';
            this.modalInput.focus();
            this.modalInput.select();

            // Add author input field if not present
            let authorInput = this.modal.querySelector('#modal-author-input');
            if (!authorInput) {
                authorInput = document.createElement('input');
                authorInput.type = 'text';
                authorInput.id = 'modal-author-input';
                authorInput.placeholder = 'Author name...';
                authorInput.style.marginTop = '10px';
                this.modalInput.insertAdjacentElement('afterend', authorInput);
            }
            authorInput.value = authorDefault;

            // Remove existing listeners
            const newConfirmBtn = this.modalConfirm.cloneNode(true);
            this.modalConfirm.parentNode.replaceChild(newConfirmBtn, this.modalConfirm);
            this.modalConfirm = newConfirmBtn;

            // Add new listener
            this.modalConfirm.addEventListener('click', () => {
                const value = this.modalInput.value.trim();
                const author = authorInput.value.trim();
                this.closeModal();
                authorInput.remove();
                resolve({ value, author });
            });
        });
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.modalInput.value = '';
    }

    updateTitleDisplay(name) {
        this.currentMapName = name;
        this.titleDisplay.textContent = name || 'Untitled Map';
    }

    async promptForSave() {
        try {
            const { value: name, author } = await this.showModal(
                'Save Map',
                'Enter map name...',
                this.currentMapName,
                ''
            );

            if (
                typeof name === 'string' && name.trim() !== '' &&
                typeof author === 'string' && author.trim() !== '') {
                this.saveMap(name, author);
            } 
        } catch (error) {
            // User cancelled
        }
    }

    async promptForLoad() {
        try {
            const name = await this.showModal(
                'Load Map',
                'Enter map name to load...',
                this.currentMapName
            );

            if (name) {
                this.loadMap(name);
            }
        } catch (error) {
            // User cancelled
        }
    }

    saveMap(name, author) {
        const serializedBricks = this.brickManager.getBricks().map(brick => ({
            color: brick.color,
            name: brick.buttonName,
            points: brick.getGridSquaresCovered()
        }));

        const sceneData = {
            bricks: serializedBricks,
            metadata: {
                name: name,
                width: EditorConfig.GRID_SIZE,
                height: 1,
                depth: EditorConfig.GRID_SIZE,
                timestamp: new Date().toISOString(),
                version: "1.0",
                author: author
            },
        };

        this.sendRequest(`/caaluza/map/${name}`, 'POST', sceneData)
            .then(data => {
                if (data.error) {
                    this.showNotification('Error saving map: ' + data.error, 'error');
                } else {
                    this.updateTitleDisplay(name);
                    this.showNotification('Map saved successfully! ID: ' + data.map_id, 'success');
                }
            })
            .catch(error => {
                this.showNotification('Failed to save map: ' + error.message, 'error');
            });
    }

    loadMap(name) {
        this.fetchAndHandle(`/caaluza/map/${name}`, name);
    }

    generateMap() {
        this.fetchAndHandle('/caaluza/generate');
    }

    async sendRequest(url, method, data = null) {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        return await response.json();
    }

    async fetchAndHandle(url, mapName = '') {
        try {
            const data = await this.sendRequest(url, 'GET');
            this.handleFetchResponse(data, mapName);
        } catch (error) {
            console.error('Error loading map:', error);
            this.showNotification('Failed to load map: ' + error.message, 'error');
        }
    }

    handleFetchResponse(data, mapName = '') {
        if (data.error) {
            this.showNotification('Error loading map: ' + data.error, 'error');
            return;
        }

        // Clear existing bricks and re-enable all buttons
        this.brickManager.clearAll();
        this.enableAllButtons();

        const mapData = data.map;
        console.log('Loaded map:', mapData);

        // Update title display with loaded map name
        if (mapName) {
            this.updateTitleDisplay(mapName);
        } else if (mapData.metadata && mapData.metadata.name) {
            this.updateTitleDisplay(mapData.metadata.name);
        } else {
            this.updateTitleDisplay('Generated Map');
        }

        if (mapData.bricks && Array.isArray(mapData.bricks)) {
            mapData.bricks.forEach(brickData => {
                this.loadBrick(brickData);
            });
            this.showNotification('Map loaded successfully!', 'success');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '3000',
            opacity: '0',
            transform: 'translateY(-20px)',
            transition: 'all 0.3s ease',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
        });

        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                break;
            case 'error':
                notification.style.backgroundColor = '#f44336';
                break;
            case 'warning':
                notification.style.backgroundColor = '#ff9800';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
        }

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    loadBrick(brickData) {
        const buttons = this.brickSelector.querySelectorAll('button');

        // Find matching color
        let colorMatch = colors.find(c => c.hex === brickData.color);
        if (!colorMatch) {
            colorMatch = colors.find(c => c.name === brickData.color);
        }
        const brickColor = colorMatch ? colorMatch.hex : 0x808080;

        // Calculate brick dimensions from points
        const minX = Math.min(...brickData.points.map(p => p.x));
        const maxX = Math.max(...brickData.points.map(p => p.x));
        const minZ = Math.min(...brickData.points.map(p => p.z));
        const maxZ = Math.max(...brickData.points.map(p => p.z));
        const y = brickData.points[0].y;
        const width = maxX - minX + 1;
        const depth = maxZ - minZ + 1;

        const newBrick = new Brick(
            new THREE.Vector3(maxX + 1, y, maxZ + 1),
            brickColor,
            { width: width, height: 1, depth: depth },
            brickData.name || `${width}x${depth} ${brickData.color}`
        );

        this.brickManager.addBrick(newBrick);

        // Disable corresponding button
        const button = Array.from(buttons).find(btn => btn.title === newBrick.buttonName);
        if (button) {
            this.disableButton(button);
        }
    }

    disableButton(button) {
        button.disabled = true;
        button.style.cursor = 'not-allowed';
        button.style.opacity = '0.6';
    }

    enableButton(button) {
        button.disabled = false;
        button.style.cursor = 'pointer';
        button.style.opacity = '1';
    }

    enableAllButtons() {
        this.brickSelector.querySelectorAll('button').forEach(button => {
            this.enableButton(button);
        });
    }

    enableButtonByTitle(title) {
        const button = Array.from(this.brickSelector.querySelectorAll('button'))
            .find(btn => btn.title === title);
        if (button) {
            this.enableButton(button);
        }
    }
}

/**
 * Main editor application class
 */
class BrickEditor {
    constructor(mode = 'edit') {
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
            // Hide all buttons in play mode
            if (brickSelectorContainer) brickSelectorContainer.style.display = 'none';
            if (buttonContainer) buttonContainer.style.display = 'none';
            if (zoomControls) zoomControls.style.display = 'none';
            if (saveBtn) saveBtn.style.display = 'none';
            if (loadBtn) loadBtn.style.display = 'none';
            if (generateBtn) generateBtn.style.display = 'none';
        } else {
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

// Initialize the editor when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.brickEditor = new BrickEditor(mode);
    });
} else {
    window.brickEditor = new BrickEditor(mode);
}

// Export classes for testing
export { BrickEditor, EditorConfig, CameraSystem, LightingSystem, InteractionSystem, BrickManager, UIController };
