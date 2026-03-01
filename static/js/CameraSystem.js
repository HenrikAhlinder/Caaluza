import { EditorConfig } from './EditorConfig.js';

// Single source of truth for compass orientation.
// For normal views: use camera forward projected to XZ (which direction is the camera looking horizontally).
// For top/bottom views (forward ≈ straight down): forward has no XZ component, so fall back to
// the camera's up vector which encodes the horizontal rotation applied by the user.
function syncCompass(camera) {
    const compass = document.querySelector('.compass-overlay');
    if (!compass) return;

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);

    let angle;
    if (Math.abs(forward.y) > 0.9) {
        // Top/bottom view: up vector carries the horizontal orientation
        const up = new THREE.Vector3(0, 1, 0);
        up.applyQuaternion(camera.quaternion);
        angle = Math.atan2(up.x, -up.z);
    } else {
        // Side/orbit view: horizontal forward direction determines compass
        angle = Math.atan2(forward.x, -forward.z);
    }

    compass.style.setProperty('transform', `rotate(${-angle}rad)`);
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
        this.shouldMove = true;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        // Spherical coordinates
        this.phi = Math.PI / 4;    // vertical angle (0 = top, PI = bottom)
        this.theta = Math.PI / 4;  // horizontal angle

        this.radius = 35;          // distance from grid center

        // Clamp Phi to avoid rotation over top of the world
        this.minPhi = 0.1;         // minimum vertical angle (near top)
        this.maxPhi = Math.PI - 0.1; // maximum vertical angle (horizon)
        this.selectedView = selectedView;

        this.init();
    }

    init() {
        this.createMainCamera();
        this.createPlayerCameras();

        this.activeCamera = this.mainCamera;
        if (this.selectedView !== null) {
            this.setActiveCamera(this.playerCameras[this.selectedView]);
        }

        // Sync spherical coordinates with the actual active camera position
        this.syncSphericalCoordinates();
    }

    syncSphericalCoordinates() {
        // Calculate spherical coordinates from current active camera position
        const relativePos = this.activeCamera.position.clone().sub(this.gridCenter);

        this.radius = relativePos.length();
        this.phi = Math.acos(Math.max(-1, Math.min(1, relativePos.y / this.radius)));
        this.theta = Math.atan2(relativePos.z, relativePos.x);

        // Handle singularity at top view
        if (Math.abs(this.phi) < 0.02) {
            this.theta = Math.PI / 2; // Default theta for top view
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
        syncCompass(this.mainCamera);
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
            // Top camera needs explicit up direction to avoid lookAt singularity (forward ≈ up).
            // {0,0,-1} means North (−Z) appears at the top of the screen.
            if (view.name === 'Top') camera.up.set(0, 0, -1);
            camera.lookAt(this.gridCenter);

            this.playerCameras[view.name] = camera;

            // Set up view button event listener only if button container exists
            if (buttonContainer) {
                const viewButton = buttonContainer.querySelector(`.view-button.${view.name}`);
                if (viewButton) {
                    viewButton.addEventListener('click', () => {
                        this.setActiveCamera(camera);
                    });
                }
            }
        });

        // Handle generic view buttons only if button container exists
        if (buttonContainer) {
            buttonContainer.querySelectorAll('.view-button').forEach(button => {
                const viewName = button.textContent.trim();
                button.addEventListener('click', () => {
                    if (this.playerCameras[viewName]) {
                        this.setActiveCamera(this.playerCameras[viewName]);
                    }
                });
            });
        }
    }

    setActiveCamera(camera) {
        this.activeCamera = camera;
        this.syncSphericalCoordinates();
        syncCompass(camera);
    }

    getActiveCamera() {
        return this.activeCamera;
    }

    updateAspectRatio(aspectRatio) {
        // Update orthographic camera frustum based on new aspect ratio
        if (this.mainCamera instanceof THREE.OrthographicCamera) {
            this.mainCamera.left = -EditorConfig.ORTHO_SIZE * aspectRatio;
            this.mainCamera.right = EditorConfig.ORTHO_SIZE * aspectRatio;
            this.mainCamera.top = EditorConfig.ORTHO_SIZE;
            this.mainCamera.bottom = -EditorConfig.ORTHO_SIZE;
            this.mainCamera.updateProjectionMatrix();
        }

        // Update player cameras if they're perspective cameras
        Object.values(this.playerCameras).forEach(camera => {
            if (camera instanceof THREE.PerspectiveCamera) {
                camera.aspect = aspectRatio;
                camera.updateProjectionMatrix();
            }
        });
    }

    isTopView() {
        // Check if current camera is the Top view
        if (this.activeCamera === this.playerCameras['Top']) {
            return true;
        }
        // Also check if main camera is in top-down position
        if (this.activeCamera === this.mainCamera && this.phi < 0.3) {
            return true;
        }
        return false;
    }

    startCameraMovement(mouseX, mouseY) {
        this.shouldMove = true;
        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;

        if (this.activeCamera === this.mainCamera) {
            return;
        }

        // Switch from player camera to main camera
        this.mainCamera.position.copy(this.activeCamera.position);
        this.mainCamera.rotation.copy(this.activeCamera.rotation);
        this.activeCamera = this.mainCamera;

        // Sync spherical coordinates with the current position
        this.syncSphericalCoordinates();
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

        this.activeCamera.lookAt(this.gridCenter);
        syncCompass(this.activeCamera);

        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;
    }

    updateCameraRotation(mouseX, mouseY) {
        if (!this.shouldMove) return;

        const deltaX = mouseX - this.lastMouseX;

        // For top view rotation, rotate the camera in place (change orientation, not position)
        if (Math.abs(this.phi) < 0.3) {
            const angle = deltaX * EditorConfig.CAMERA_ROTATION_SPEED;

            const rotationAxis = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion();
            quaternion.setFromAxisAngle(rotationAxis, angle);
            this.activeCamera.quaternion.multiplyQuaternions(quaternion, this.activeCamera.quaternion);
            this.activeCamera.up.applyQuaternion(quaternion);

            syncCompass(this.activeCamera);
        } else {
            // Other views: use spherical coordinates (orbit around center)
            this.theta -= deltaX * EditorConfig.CAMERA_ROTATION_SPEED;

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

            // Always look at center
            this.activeCamera.lookAt(this.gridCenter);
        }

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
