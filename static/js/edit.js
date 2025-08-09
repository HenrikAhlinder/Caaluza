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

        function addLight(name, position) {
            const light = new THREE.DirectionalLight(0xffffff, 0.5);
            light.name = `${name}`;
            light.position.set(position.x, position.y, position.z); // Adjust position above each view
            light.lookAt(gridCenter);
            light.castShadow = false;
            scene.add(light);
        }

        addLight(`light-above-${view.name}`, new THREE.Vector3(view.position.x+10, view.position.y+10, view.position.z+10));
        addLight(`light-below-${view.name}`, new THREE.Vector3(view.position.x-10, view.position.y-10, view.position.z-10));

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

brickSelector.querySelectorAll('.size-button').forEach(button => {
    button.addEventListener('mousedown', (event) => {
        const [sizeName, colorName] = button.title.split(' ');
        const color = colors.find(c => c.name === colorName);
        const size = sizes.find(s => s.name === sizeName);

        if (!currentlyDraggedBrick && color && size) {
            currentlyDraggedBrick = new Brick(new THREE.Vector3(1000, 0, 1000), color.hex, { width: size.width, height: 1, depth: size.depth }, button.title);
            bricks.push(currentlyDraggedBrick);
            currentlyDraggedBrick.addToScene(scene);
            dragOffset.set(0, 0, 0); 

            ghostBrick = createGhostBrick(currentlyDraggedBrick);
            scene.add(ghostBrick);

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

        activeCamera.lookAt(gridCenter);

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
});

window.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Create ghost brick a for preview of where the brick is relative to the ground
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
            // Move selected brick
            const intersectedMesh = intersects[0].object;
            currentlyDraggedBrick = bricks.find(brick => brick.isthisBrick(intersectedMesh));
            const brickPosition = currentlyDraggedBrick.mesh.position;
            
            dragOffset.copy(intersects[0].point).sub(brickPosition);
            
            ghostBrick = createGhostBrick(currentlyDraggedBrick);
            ghostBrick.position.set(brickPosition.x, -0.5, brickPosition.z);
            ghostBrick.rotation.copy(currentlyDraggedBrick.mesh.rotation);
            scene.add(ghostBrick);
        }
    }
});

window.addEventListener('mousemove', (event) => {
    if (currentlyDraggedBrick) {
        raycaster.setFromCamera(mouse, activeCamera);
        raycaster.ray.intersectPlane(plane, planeIntersect);
        if (planeIntersect) {
            const snappedX = Math.round((planeIntersect.x - dragOffset.x));
            const snappedZ = Math.round((planeIntersect.z - dragOffset.z));

            currentlyDraggedBrick.setPosition(snappedX, snappedZ);
            
            if (ghostBrick) {
                ghostBrick.position.set(snappedX, -0.5, snappedZ);
                ghostBrick.visible = currentlyDraggedBrick.mesh.position.y > -0.5;
            }
        }
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('mouseup', (event) => {
    if (event.button === 0 && currentlyDraggedBrick) {
        if (ghostBrick) {
            scene.remove(ghostBrick);
            ghostBrick.geometry.dispose();
            ghostBrick.material.dispose();
            ghostBrick = null;
        }
        
        currentlyDraggedBrick = null;
    }
});

window.addEventListener('keydown', (event) => {
    switch (event.key) {

            case 'q':
                shouldCameraMove = !shouldCameraMove;
                break;
    }
    if (currentlyDraggedBrick) {
        switch (event.key) {
            case 'w':
                currentlyDraggedBrick.mesh.position.y += verticalStep;
                if (ghostBrick) {
                    ghostBrick.visible = currentlyDraggedBrick.mesh.position.y > -0.5;
                }
                break;

            case 's':
                currentlyDraggedBrick.mesh.position.y -= verticalStep;
                if (ghostBrick) {
                    ghostBrick.visible = currentlyDraggedBrick.mesh.position.y > -0.5;
                }
                break;

            case 'r':
                currentlyDraggedBrick.mesh.rotation.y += Math.PI / 2;
                if (ghostBrick) {
                    ghostBrick.rotation.copy(currentlyDraggedBrick.mesh.rotation);
                }
                break;

            default:
                break;
        }
    }
});

window.addEventListener('mousedown', (event) => {
    if (event.button === 2) {
        raycaster.setFromCamera(mouse, activeCamera);
        const intersects = raycaster.intersectObjects(bricks.map(brick => brick.mesh));

        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object;
            let brick = bricks.find(brick => brick.isthisBrick(intersectedMesh));

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

document.getElementById('generate-btn').addEventListener('click', () => {
    fetch(`/generate`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('Response:', data);
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
                let colorMatch = colors.find(c => c.hex === brickData.color);
                if (!colorMatch) {
                    colorMatch = colors.find(c => c.name === brickData.color);
                }
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