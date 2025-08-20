/**
 * Lighting system management class
 */
export class LightingSystem {
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