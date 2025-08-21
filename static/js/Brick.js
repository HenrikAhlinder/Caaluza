// Create a Brick class to encapsulate the brick and its studs
export class Brick {
    constructor(position, color, size, name, isBaseplate = false) {
        this.position = position;
        this.color = color;
        this.originalColor = color;
        this.size = size;
        this.buttonName = name;
        this.hasBeenDropped = false;
        this.isBaseplate = isBaseplate;
        // Create a geometry centered at the origin
        // Adjust the geometry to align its top-left corner as the anchor point
        const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
        geometry.translate(-size.width / 2, size.height / 2, -size.depth / 2);
        // Create the main brick
        // Add an outline to the brick for better visibility.
        // Adjust the brick's origin point to the top-left corner.
        const material = new THREE.MeshLambertMaterial({ color: color });
        this.mesh = new THREE.Mesh(
            geometry,
            material
        );
        // Add visible outline using THREE.LineSegments for edges
        const edges = new THREE.EdgesGeometry(geometry);
        const outline = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000 }) // Black outline color
        );
        this.mesh.add(outline); // Attach the outline as a child of the brick
        // Shift the position of the mesh to align its origin with its top-left corner
        this.mesh.position.set(
            position.x,
            position.y,
            position.z
        );
        this.addStuds();
        }

    isthisBrick(mesh) {
        return this.mesh === mesh || this.mesh.children.includes(mesh);
    }

    setPosition(x, z) {
        this.mesh.position.set(x, this.mesh.position.y, z);
    }

    addStuds() {
        // Add a black outline to the stud for better visibility.
        const studRadius = 0.27;
        const studHeight = 0.2;
        // Create an outline for the stud using LineSegments for better visibility.
        const studMaterial = new THREE.MeshLambertMaterial({
            color: this.color // Use the brick's color
        });

        const studsX = this.size.width;
        const studsZ = this.size.depth;

        for (let x = 0; x < studsX; x++) {
            for (let z = 0; z < studsZ; z++) {
                const studGeometry = new THREE.CylinderGeometry(studRadius, studRadius, studHeight, 32);
                const stud = new THREE.Mesh(studGeometry, studMaterial);
                stud.position.set(
                    -x - 0.5,
                    this.size.height + studHeight / 2, // Place studs slightly above
                    -z - 0.5
                );

                // Create the outline for the stud
                const studEdges = new THREE.EdgesGeometry(studGeometry);
                const studOutline = new THREE.LineSegments(
                    studEdges,
                    new THREE.LineBasicMaterial({ color: 0x000000 }) // Black outline
                );
                stud.add(studOutline); // Add the outline as a child of the stud

                stud.userData.parentBrick = this.mesh; // Link studs to the parent brick
                this.mesh.add(stud); // Add the stud as a child of the brick's mesh
            }
        }
    }

    getGridSquaresCovered() {
        const bbox = new THREE.Box3().setFromObject(this.mesh);
        let squares = [];
        const y = Math.round(bbox.min.y);

        for (let x=Math.round(bbox.min.x); x < Math.round(bbox.max.x); x++) {
            for (let z=Math.round(bbox.min.z); z < Math.round(bbox.max.z); z++) {
                squares.push({ x: x, y: y, z: z });
            }
        }
        return squares;
    }

    addToScene(scene) {
        scene.add(this.mesh);
    }

    removeFromScene(scene) {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.mesh = null; // Clear reference to the mesh
    }

    getPoints() {
        const points = [];
        const meshPosition = this.mesh.position;
        
        for (let x = 0; x < this.size.width; x++) {
            for (let z = 0; z < this.size.depth; z++) {
                points.push({
                    x: Math.round(meshPosition.x - x),
                    y: Math.round(meshPosition.y),
                    z: Math.round(meshPosition.z - z)
                });
            }
        }
        
        return points;
    }

    markAsInvalid() {
        this.mesh.material.color.setHex(0x808080);
        this.mesh.children.forEach(child => {
            if (child.material) {
                child.material.color.setHex(0x808080);
            }
        });
    }

    resetColor() {
        this.mesh.material.color.setHex(this.originalColor);
        this.mesh.children.forEach(child => {
            if (child.material && child.geometry.type === 'CylinderGeometry') {
                child.material.color.setHex(this.originalColor);
            }
        });
    }
}