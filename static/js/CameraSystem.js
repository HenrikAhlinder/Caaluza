import { EditorConfig } from './EditorConfig.js';

function updateCompassRotation(direction) {
    const compass = document.querySelector('.compass-overlay');
    if (compass) {
        // Calculate the angle between the direction vector and "up" (screen +Y, which is { x: 0, z: -1 })
        const angle = Math.atan2(direction.x, -direction.z); // atan2(z, x) because north is (1, 0)

        // Rotate the compass in the opposite direction to simulate fixed-world north
        compass.style.setProperty('transform', `rotate(${-angle}rad)`);
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

/**
 * Camera system management class
 */
export class CameraSystem {
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