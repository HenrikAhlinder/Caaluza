/**
 * Raycasting and mouse interaction system
 */
export class InteractionSystem {
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