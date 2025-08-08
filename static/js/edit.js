import { Brick } from './brick.js'

// TODO: Garbage globals?
const gridCenter = new THREE.Vector3(3, 0, 3);
const gridSize = 6;
const brickSelector = document.querySelector('.brick-selector');
const bricks = [];
const aspectRatio = window.innerWidth / window.innerHeight;
const orthoSize = 15;

let currentlyDraggedBrick = null;
let dragOffset = new THREE.Vector3();
let ghostBrick = null; // Ghost brick to show outline on floor
const titleTextbox = document.getElementById('title-textbox');

let shouldCameraMove = false;
const cameraRotationSpeed = 0.005;
let lastMouseX = 0;
let lastMouseY = 0;

// Predefined tools for raycasting and mouse tracking
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Ground plane
const planeIntersect = new THREE.Vector3();
const verticalStep = 1;

// Basic scene setup
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('three-canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

createPlayerCameras(views);
const mainCamera = createMainCamera();
let activeCamera = mainCamera;

setupBaseplate();

// Define cameras for each view
// TODO: Can I just drop playerCameras here without it being deallocated?
function createPlayerCameras(views) {
    const playerCameras = {};
    const orthoSize = 15;
    const aspectRatio = window.innerWidth / window.innerHeight;
    const buttonContainer = document.querySelector('.button-container');

    views.forEach(view => {
        playerCameras[view.name] = new THREE.OrthographicCamera(
            -orthoSize * aspectRatio,
            orthoSize * aspectRatio,
            orthoSize,
            -orthoSize,
            0.1,
            1000
        );
        playerCameras[view.name].position.set(view.position.x, view.position.y, view.position.z);
        playerCameras[view.name].lookAt(gridCenter);

        const light = new THREE.DirectionalLight(0xffffff, 1.2);
        light.position.set(view.position.x, view.position.y, view.position.z); // Adjust position above each view
        light.lookAt(gridCenter);
        light.castShadow = false;
        scene.add(light);

        buttonContainer.querySelector(`.view-button.${view.name}`).addEventListener('click', () => {
            activeCamera = playerCameras[view.name];
        });
    });

    buttonContainer.querySelectorAll('.view-button').forEach(button => {
        const viewName = button.textContent.trim();
        button.addEventListener('click', () => {
            if (playerCameras[viewName]) {
                activeCamera = playerCameras[viewName];
            }
        });
    });
}

function createMainCamera() {
    const mainCamera = new THREE.OrthographicCamera(
            -orthoSize * aspectRatio,
            orthoSize * aspectRatio,
            orthoSize,
            -orthoSize,
            0.1,
            1000
    );
    mainCamera.position.set(gridCenter.x, 25, gridCenter.z);
    mainCamera.lookAt(gridCenter);
    return mainCamera;
}

function setupBaseplate() {
    const baseplateHeight = 0.2;
    const baseplate = new Brick(
        new THREE.Vector3(gridSize, -baseplateHeight, gridSize),
        0x808080,
        { width: gridSize, height: baseplateHeight, depth: gridSize },
        'Baseplate'
    );
    baseplate.addToScene(scene);
}

// Setup event listeners for brick selector buttons
brickSelector.querySelectorAll('.size-button').forEach(button => {
    button.addEventListener('mousedown', (event) => {
        const [sizeName, colorName] = button.title.split(' ');
        const color = colors.find(c => c.name === colorName);
        const size = sizes.find(s => s.name === sizeName);

        if (!currentlyDraggedBrick && color && size) {
            // Create a new brick and start dragging
            currentlyDraggedBrick = new Brick(new THREE.Vector3(1000, 0, 1000), color.hex, { width: size.width, height: 1, depth: size.depth }, button.title);
            bricks.push(currentlyDraggedBrick);
            currentlyDraggedBrick.addToScene(scene);

            // Track the brick for dragging
            dragOffset.set(0, 0, 0); // No offset for a newly created brick

            // Create and add ghost brick
            ghostBrick = createGhostBrick(currentlyDraggedBrick);
            scene.add(ghostBrick);

            // Disable button after selection
            button.disabled = true;
            button.style.cursor = 'not-allowed';
            button.style.opacity = '0.6';
        }
    });
});

window.addEventListener('mousedown', (event) => {
    if (event.button === 1) { // Middle mouse button
        mainCamera.position.copy(activeCamera.position);
        mainCamera.rotation.copy(activeCamera.rotation);
        activeCamera = mainCamera;
        shouldCameraMove = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
});

window.addEventListener('mouseup', (event) => {
    if (event.button === 1) { // Middle mouse button
        shouldCameraMove = false;
    }
});

window.addEventListener('mousemove', (event) => {
    if (shouldCameraMove) {
        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;

        // Rotate around grid center horizontally
        const horizontalAngle = deltaX * cameraRotationSpeed;
        activeCamera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -horizontalAngle);

        // Rotate vertically (up and down) while keeping view clamped
        const verticalAxis = new THREE.Vector3().subVectors(activeCamera.position, gridCenter).normalize(); // Camera-to-center axis
        const verticalAngle = deltaY * cameraRotationSpeed;
        activeCamera.position.applyAxisAngle(verticalAxis, verticalAngle);

        // Ensure camera keeps looking at the grid center
        activeCamera.lookAt(gridCenter);

        // Update mouse positions
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
});

window.addEventListener('contextmenu', (event) => {
    event.preventDefault(); // Disable context menu on right-click
});

// Fetch mouse coordinates and update raycaster
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Create ghost brick for floor preview
function createGhostBrick(originalBrick) {
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
    
    const ghost = new THREE.Mesh(ghostGeometry, ghostMaterial);
    
    // Add wireframe outline
    const edges = new THREE.EdgesGeometry(ghostGeometry);
    const outline = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ 
            color: "white",
            transparent: true,
            opacity: 0.6
        })
    );
    ghost.add(outline);
    
    return ghost;
}

window.addEventListener('mousedown', (event) => {
    if (event.button === 0 && !currentlyDraggedBrick) {
        raycaster.setFromCamera(mouse, activeCamera);

        const intersects = raycaster.intersectObjects(bricks.map(brick => brick.mesh));
        if (intersects.length > 0) {
            // Start dragging the clicked brick
            const intersectedMesh = intersects[0].object;
            currentlyDraggedBrick = bricks.find(brick => brick.isthisBrick(intersectedMesh));
            const brickPosition = currentlyDraggedBrick.mesh.position;
            
            // Calculate the offset between the click and the brick center
            dragOffset.copy(intersects[0].point).sub(brickPosition);
            
            // Create and add ghost brick
            ghostBrick = createGhostBrick(currentlyDraggedBrick);
            scene.add(ghostBrick);

            // Position ghost brick immediately at floor level below the brick and copy rotation
            ghostBrick.position.set(brickPosition.x, -0.5, brickPosition.z);
            ghostBrick.rotation.copy(currentlyDraggedBrick.mesh.rotation);
        }
    }
});

window.addEventListener('mousemove', (event) => {
    if (currentlyDraggedBrick) {
        // Update position while dragging
        raycaster.setFromCamera(mouse, activeCamera);
        raycaster.ray.intersectPlane(plane, planeIntersect); // Intersect with the ground plane
        if (planeIntersect) {
            // Adjust position based on the offset
            // TODO: Why needed for x and not z?
            const snappedX = Math.round((planeIntersect.x - dragOffset.x));
            const snappedZ = Math.round((planeIntersect.z - dragOffset.z));

            currentlyDraggedBrick.setPosition(snappedX, snappedZ);
            
            // Update ghost brick position on floor and visibility
            if (ghostBrick) {
                ghostBrick.position.set(snappedX, -0.5, snappedZ); // Place at floor level
                ghostBrick.visible = currentlyDraggedBrick.mesh.position.y > -0.5;
            }
        }
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Mouse up: Place the brick in the scene
window.addEventListener('mouseup', (event) => {
    if (event.button === 0 && currentlyDraggedBrick) { // Left mouse button
        // Remove ghost brick
        if (ghostBrick) {
            scene.remove(ghostBrick);
            ghostBrick.geometry.dispose();
            ghostBrick.material.dispose();
            ghostBrick = null;
        }
        
        // Stop dragging
        currentlyDraggedBrick = null;
    }
});

// Handle Keyboard Input for Vertical Movement (W/S keys)
window.addEventListener('keydown', (event) => {
    if (currentlyDraggedBrick) {
        switch (event.key) {
            case 'w': // Move up
                currentlyDraggedBrick.mesh.position.y += verticalStep;
                // Update ghost brick visibility
                if (ghostBrick) {
                    ghostBrick.visible = currentlyDraggedBrick.mesh.position.y > -0.5;
                }
                break;

            case 's': // Move down
                currentlyDraggedBrick.mesh.position.y -= verticalStep;
                // Update ghost brick visibility
                if (ghostBrick) {
                    ghostBrick.visible = currentlyDraggedBrick.mesh.position.y > -0.5;
                }
                break;

            case 'r': // rotate
                currentlyDraggedBrick.mesh.rotation.y += Math.PI / 2; // Rotate 90 degrees
                // Update ghost brick rotation if it exists
                if (ghostBrick) {
                    ghostBrick.rotation.copy(currentlyDraggedBrick.mesh.rotation);
                }
                break;

            default:
                break;
        }
    }
});


// Delete brick on right-click
window.addEventListener('mousedown', (event) => {
    if (event.button === 2) { // Right mouse button
        raycaster.setFromCamera(mouse, activeCamera);
        const intersects = raycaster.intersectObjects(bricks.map(brick => brick.mesh));

        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object;
            let brick = bricks.find(brick => brick.isthisBrick(intersectedMesh));

            // enable the button for the deleted brick
            const buttons = brickSelector.querySelectorAll('button');
            const button = Array.from(buttons).find(btn => btn.title === brick.buttonName);
            if (button) {
                button.disabled = false;
                button.style.cursor = 'pointer';
                button.style.opacity = '1';
            }

            const index = bricks.indexOf(brick);
            if (index > -1) {
                bricks.splice(index, 1);
            }
            brick.removeFromScene(scene);
        }
        event.preventDefault(); // Prevent browser context menu
    }
});

document.getElementById('save-btn').addEventListener('click', () => {
    const name = titleTextbox.value.trim();
    if (!name) {
        alert('Please enter a title for the map.');
        return;
    }

    const serializedBricks = bricks.map(brick => {
    const gridSquaresCovered = brick.getGridSquaresCovered();
    let xs = [];
    let zs = [];
    let y = null;
    gridSquaresCovered.forEach(square => {
        xs.push(square.x);
        zs.push(square.z);
        y = square.y;
    });
    return {
            color: brick.color,
            name: brick.buttonName,
            xs: xs,
            zs: zs,
            y: y
        };
    });
    
    const sceneData = {
        bricks: serializedBricks,
        metadata: {
            name: name,
            width: gridSize,
            height: 1,
            depth: gridSize,
            timestamp: new Date().toISOString(),
            version: "1.0"
        }
    };
    
    console.log('Saving scene data:', sceneData);

    // POST to /save-map endpoint
    fetch(`/save/${name}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(sceneData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error saving map: ' + data.error);
        } else {
            alert('Map saved successfully! ID: ' + data.map_id);
        }
        console.log('Save response:', data);
    })
    .catch(error => {
        console.error('Error saving map:', error);
        alert('Failed to save map: ' + error.message);
    });
});

document.getElementById('load-btn').addEventListener('click', () => {
    const map_id = titleTextbox.value.trim();
    if (!map_id) {
        alert('Please enter a title for the map to load.');
        return;
    }
    fetch(`/load/${map_id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('Load response:', data);
        if (data.error) {
            alert('Error loading map: ' + data.error);
            return;
        }
        
        // Clear existing bricks
        bricks.forEach(brick => {
            brick.removeFromScene(scene);
        });
        bricks.length = 0;
        
        // Re-enable all brick selector buttons
        const buttons = brickSelector.querySelectorAll('button');
        buttons.forEach(button => {
            button.disabled = false;
            button.style.cursor = 'pointer';
            button.style.opacity = '1';
        });
        
        data = data.map;
        // Load bricks from data
        if (data.bricks && Array.isArray(data.bricks)) {
            data.bricks.forEach(brickData => {
                // Find matching color and size for the brick
                const colorMatch = colors.find(c => c.hex === brickData.color);
                const brickColor = colorMatch ? colorMatch.hex : 0x808080; // Default to gray
                
                // Calculate brick dimensions from xs and zs arrays
                const minX = Math.min(...brickData.xs);
                const maxX = Math.max(...brickData.xs);
                const minZ = Math.min(...brickData.zs);
                const maxZ = Math.max(...brickData.zs);
                const width = maxX - minX + 1;
                const depth = maxZ - minZ + 1;
                
                // Create new brick
                const newBrick = new Brick(
                    new THREE.Vector3(maxX+1, brickData.y, maxZ+1),
                    brickColor,
                    { width: width, height: 1, depth: depth },
                    brickData.name || `${width}x${depth} ${brickData.color}`
                );
                
                bricks.push(newBrick);
                newBrick.addToScene(scene);
                
                // Disable corresponding button
                const button = Array.from(buttons).find(btn => btn.title === newBrick.buttonName);
                if (button) {
                    button.disabled = true;
                    button.style.cursor = 'not-allowed';
                    button.style.opacity = '0.6';
                }
            });
        }
    })
    .catch(error => {
        console.error('Error loading map:', error);
        alert('Failed to load map: ' + error.message);
    });
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, activeCamera);
}
animate();