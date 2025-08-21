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
            'Baseplate',
            true // Mark as baseplate
        );
        baseplate.hasBeenDropped = true; // Baseplate is always considered "placed"
        this.bricks.push(baseplate); // Track baseplate in bricks array
        baseplate.addToScene(this.scene);
    }

    addBrick(brick) {
        this.bricks.push(brick);
        brick.addToScene(this.scene);
        // Don't validate until brick is dropped for the first time
    }

    removeBrick(brick) {
        // Prevent baseplate removal
        if (brick.isBaseplate) {
            return false;
        }
        
        const index = this.bricks.indexOf(brick);
        if (index > -1) {
            this.bricks.splice(index, 1);
            brick.removeFromScene(this.scene);
            this.validateMapAndMarkInvalid();
            return true;
        }
        return false;
    }

    findBrickByMesh(mesh) {
        return this.bricks.find(brick => brick.isthisBrick(mesh));
    }

    startDrag(brick, offset = new THREE.Vector3()) {
        // Prevent baseplate dragging
        if (brick.isBaseplate) {
            return false;
        }
        
        this.currentlyDraggedBrick = brick;
        this.dragOffset.copy(offset);
        this.createGhostBrick();
        return true;
    }

    stopDrag() {
        if (this.currentlyDraggedBrick) {
            this.currentlyDraggedBrick.hasBeenDropped = true;
        }
        this.removeGhostBrick();
        this.currentlyDraggedBrick = null;
        this.dragOffset.set(0, 0, 0);
        this.validateMapAndMarkInvalid();
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
        // Remove all non-baseplate bricks
        const nonBaseplatesBricks = this.bricks.filter(brick => !brick.isBaseplate);
        nonBaseplatesBricks.forEach(brick => {
            brick.removeFromScene(this.scene);
        });
        // Keep only the baseplate
        this.bricks = this.bricks.filter(brick => brick.isBaseplate);
    }

    getBricks() {
        return this.bricks;
    }

    isDragging() {
        return this.currentlyDraggedBrick !== null;
    }

    async validateMapAndMarkInvalid() {
        // Reset all brick colors first
        this.bricks.forEach(brick => {
            brick.resetColor();
        });

        // Convert current bricks to map format for validation
        const mapData = this.convertToMapFormat();
        
        try {
            const response = await fetch('/caaluza/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(mapData)
            });

            const result = await response.json();
            
            if (!result.valid && result.errors && result.errors.length > 0) {
                // Mark invalid bricks in red
                this.markInvalidBricks(result.errors);
            }
        } catch (error) {
            console.error('Validation error:', error);
        }
    }

    convertToMapFormat() {
        const bricks = this.bricks.filter(brick => brick.hasBeenDropped && !brick.isBaseplate).map(brick => ({
            color: `#${brick.color.toString(16).padStart(6, '0')}`,
            name: brick.buttonName,
            points: brick.getPoints().map(point => ({
                x: point.x,
                y: point.y,
                z: point.z
            }))
        }));

        return {
            metadata: {
                width: 6,
                height: 10,
                depth: 6,
                name: "Current Map",
                timestamp: new Date().toISOString()
            },
            bricks: bricks
        };
    }

    markInvalidBricks(errors) {
        const offendingBrickIndices = new Set();
        const droppedBricks = this.bricks.filter(brick => brick.hasBeenDropped && !brick.isBaseplate);
        
        errors.forEach(error => {
            if (error.offending_bricks) {
                error.offending_bricks.forEach(brickIndex => {
                    offendingBrickIndices.add(brickIndex);
                });
            }
        });
        
        // Mark only the specific offending bricks as invalid (from dropped bricks)
        offendingBrickIndices.forEach(brickIndex => {
            if (droppedBricks[brickIndex]) {
                droppedBricks[brickIndex].markAsInvalid();
            }
        });
    }
}
