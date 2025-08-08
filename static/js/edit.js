import { Brick } from './brick.js'

// Basic scene setup
const scene = new THREE.Scene();
const aspectRatio = window.innerWidth / window.innerHeight;
const orthoSize = 15; // Adjust this value for zoom level
const camera = new THREE.OrthographicCamera(
    -orthoSize * aspectRatio, 
    orthoSize * aspectRatio, 
    orthoSize, 
    -orthoSize, 
    0.1, 
    1000
);


// TODO: Garbage globals?
const gridCenter = new THREE.Vector3(3, 0, 3);
const gridSize = 6;
const brickSelector = document.createElement('div');
const colors = [
    { name: 'Yellow', hex: 0xffff00 },
    { name: 'Red', hex: 0xff0000 },
    { name: 'Blue', hex: 0x0000ff },
    { name: 'Green', hex: 0x00FF00 }
];


const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('three-canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

function initialize() {
    setupBaseplate();
    setupBrickSelector();
    // setupMainCamera();
    // setupLighting();
    // setupViewButtons();
    // setupEventListeners();
    // animate();
}
initialize();

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

function setupBrickSelector() {
    // Add a brick on click
    brickSelector.className = 'brick-selector';
    brickSelector.innerHTML = '<strong>Bricks:</strong>';
    document.body.appendChild(brickSelector);

    // Generate brick options using loops
    colors.forEach(color => {
        // Create color group header
        const colorHeader = document.createElement('div');
        colorHeader.className = 'color-header';
        colorHeader.style.color = `#${color.hex.toString(16).padStart(6, '0')}`; // Keep dynamic color
        colorHeader.innerText = color.name;
        brickSelector.appendChild(colorHeader);

        // Create container for size buttons
        const sizeContainer = document.createElement('div');
        sizeContainer.className = 'size-container';
        brickSelector.appendChild(sizeContainer);

        const sizes = [
            { name: '1x1', width: 1, depth: 1 },
            { name: '1x2', width: 1, depth: 2 },
            { name: '1x3', width: 1, depth: 3 },
            { name: '1x4', width: 1, depth: 4 },
            { name: '2x2', width: 2, depth: 2 },
            { name: '2x3', width: 2, depth: 3 },
            { name: '2x4', width: 2, depth: 4 }
        ];

        sizes.forEach(size => {
            const button = document.createElement('button');
            const name = `${size.name} ${color.name}`;
            button.innerText = `${size.name}`;
            button.title = name; // Tooltip for full name
            button.className = 'size-button';

            button.addEventListener('mousedown', (event) => {
                if (!currentlyDraggedBrick) {
                    // Create a new brick and start dragging
                    const newBrick = new Brick(new THREE.Vector3(1000, 0, 1000), color.hex, { width: size.width, height: 1, depth: size.depth }, name);
                    bricks.push(newBrick);
                    newBrick.addToScene(scene);

                    // Track the brick for dragging
                    currentlyDraggedBrick = newBrick;
                    dragOffset.set(0, 0, 0); // No offset for a newly created brick

                    // Create and add ghost brick
                    ghostBrick = createGhostBrick(currentlyDraggedBrick);
                    scene.add(ghostBrick);

                    // Position ghost brick immediately at cursor location
                    raycaster.setFromCamera(mouse, camera);
                    raycaster.ray.intersectPlane(plane, planeIntersect);
                    if (planeIntersect) {
                        const gridSize = 1;
                        const snappedX = Math.round(planeIntersect.x / gridSize) * gridSize;
                        const snappedZ = Math.round(planeIntersect.z / gridSize) * gridSize;
                        
                        currentlyDraggedBrick.mesh.position.set(snappedX, currentlyDraggedBrick.mesh.position.y, snappedZ);
                        ghostBrick.position.set(snappedX, -0.5, snappedZ);
                    }

                    // Disable button after selection
                    button.disabled = true;
                    button.style.cursor = 'not-allowed';
                    button.style.opacity = '0.6';
                }
            });

            sizeContainer.appendChild(button);
        });
    });
}

// Add shortcut buttons to show the grid from each side (top, left, right, front, back)
const buttonContainer = document.createElement('div');
buttonContainer.className = 'button-container';
document.body.appendChild(buttonContainer);

// Predefined views adjusted for Orthographic Camera
const views = [
    { name: 'Top', position: { x: 3, y: 10, z: 3 } },
    { name: '0 deg', position: { x: -15, y: 0.0, z: 3.0 } },
    { name: '90 deg', position: { x: 3, y: 0.0, z: 20 } },
    { name: '180 deg', position: { x: 20, y: 0.0, z: 3 } },
    { name: '270 deg', position: { x: 3, y: 0.0, z: -15 } },
];
views.forEach(view => {
    const button = document.createElement('button');
    button.innerText = view.name;
    button.className = 'view-button';
    button.addEventListener('click', () => {
        camera.position.set(view.position.x, view.position.y, view.position.z);
        camera.lookAt(gridCenter);
    });
    buttonContainer.appendChild(button);
});
camera.position.set(gridCenter.x, 20, gridCenter.z); // Default camera position

// Lighting
// Create one light for each view in the 'views' array
views.forEach(view => {
    // skip first view
    if (view.name === 'Top') return;
    const light = new THREE.DirectionalLight(0xffffff, 0.5);
    light.position.set(view.position.x, view.position.y + 10, view.position.z); // Adjust position above each view
    light.castShadow = true; // Enable shadows for better visual quality
    scene.add(light);
});

const light = new THREE.DirectionalLight(0xffffff, 0.2);
light.position.set(6, 25, 6); // Adjust position above each view
light.castShadow = true; // Enable shadows for better visual quality
scene.add(light);

// Ambient light for overall illumination
const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Soft white light
scene.add(ambientLight);

// Position the camera to face the grid top-down
camera.lookAt(gridCenter);

const bricks = [];
// Rotate camera around the center of the grid with the center mouse button
let shouldCameraMove = false;
const cameraRotationSpeed = 0.005;
let lastMouseX = 0;
let lastMouseY = 0;

window.addEventListener('mousedown', (event) => {
    if (event.button === 1) { // Middle mouse button
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
        camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -horizontalAngle);

        // Rotate vertically (up and down) while keeping view clamped
        const verticalAxis = new THREE.Vector3().subVectors(camera.position, gridCenter).normalize(); // Camera-to-center axis
        const verticalAngle = deltaY * cameraRotationSpeed;
        camera.position.applyAxisAngle(verticalAxis, verticalAngle);

        // Ensure camera keeps looking at the grid center
        camera.lookAt(gridCenter);

        // Update mouse positions
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
});

window.addEventListener('contextmenu', (event) => {
    event.preventDefault(); // Disable context menu on right-click
});

// Predefined tools for raycasting and mouse tracking
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Ground plane
const planeIntersect = new THREE.Vector3();
const verticalStep = 1;

// Fetch mouse coordinates and update raycaster
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

let currentlyDraggedBrick = null; // Tracks the brick being dragged
let dragOffset = new THREE.Vector3(); // Tracks offset between click point and the brick's center
let ghostBrick = null; // Ghost brick to show outline on floor

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
        raycaster.setFromCamera(mouse, camera);

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
        raycaster.setFromCamera(mouse, camera);
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
        raycaster.setFromCamera(mouse, camera);
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

// Render loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

const titleContainer = document.createElement('div');
titleContainer.className = 'title-container';
document.body.appendChild(titleContainer);
const titleLabel = document.createElement('label');
titleLabel.innerText = 'Title:';
titleLabel.className = 'title-label';
titleContainer.appendChild(titleLabel);

const titleTextbox = document.createElement('input');
titleTextbox.type = 'text';
titleTextbox.className = 'title-textbox';
titleContainer.appendChild(titleTextbox);

// Save scene as JSON
const saveButton = document.getElementById('save-btn');
saveButton.addEventListener('click', () => {
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

// Move load button to center (above title)
const loadButton = document.createElement('button');
loadButton.id = 'load-btn';
loadButton.innerText = 'Load';
loadButton.className = 'load-button';
document.body.appendChild(loadButton);

// Load scene from JSON
loadButton.addEventListener('click', () => {
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