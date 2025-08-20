/**
 * Configuration class to centralize all configuration constants
 */
export class EditorConfig {
    static GRID_CENTER = new THREE.Vector3(3, 0, 3);
    static GRID_SIZE = 6;
    static ASPECT_RATIO = window.innerWidth / window.innerHeight;
    static ORTHO_SIZE = 15;
    static CAMERA_ROTATION_SPEED = 0.005;
    static VERTICAL_STEP = 1;
    static BASEPLATE_HEIGHT = 0.2;
}