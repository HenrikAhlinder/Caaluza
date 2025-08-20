import { Brick } from './Brick.js';
import { EditorConfig } from './EditorConfig.js';

/**
 * Brick management system
 */
export class BrickManager {
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