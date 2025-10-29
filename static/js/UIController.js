import { Brick } from './Brick.js';
import { EditorConfig } from './EditorConfig.js';

/**
 * UI interaction handler
 */
export class UIController {
    constructor(brickManager, brickSelector) {
        this.brickManager = brickManager;
        this.brickSelector = brickSelector;
        this.titleDisplay = document.getElementById('title-display');
        this.currentMapName = '';

        this.setupBrickSelector();
        this.setupSaveLoad();
        this.setupModal();
    }

    setupBrickSelector() {
        this.brickSelector.querySelectorAll('.size-button').forEach(button => {
            button.addEventListener('mousedown', (event) => {
                const [sizeName, colorName] = button.title.split(' ');
                const color = window.colors.find(c => c.name === colorName);
                const size = window.sizes.find(s => s.name === sizeName);

                if (!this.brickManager.isDragging() && color && size) {
                    const newBrick = new Brick(
                        new THREE.Vector3(1000, 0, 1000),
                        color.hex,
                        { width: size.width, height: 1, depth: size.depth },
                        button.title
                    );

                    this.brickManager.addBrick(newBrick);
                    this.brickManager.startDrag(newBrick);

                    this.disableButton(button);
                }
            });
        });
    }

    setupSaveLoad() {
        // Save and load buttons don't exist in client-only version
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.promptForSave();
            });
        }

        const loadBtn = document.getElementById('load-btn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                this.promptForLoad();
            });
        }

        // Generate button is handled by app.js in client-only version
        const generateBtn = document.getElementById('generate-btn');
        if (generateBtn && generateBtn.getAttribute('data-legacy') === 'true') {
            generateBtn.addEventListener('click', () => {
                this.generateMap();
            });
        }
    }

    setupModal() {
        this.modal = document.getElementById('prompt-modal');

        // Modal might not exist in client-only version
        if (!this.modal) {
            return;
        }

        this.modalTitle = document.getElementById('modal-title');
        this.modalInput = document.getElementById('modal-input');
        this.modalConfirm = document.getElementById('modal-confirm');
        this.modalCancel = document.getElementById('modal-cancel');
        this.closeBtn = this.modal.querySelector('.close');

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (this.modalCancel) {
            this.modalCancel.addEventListener('click', () => this.closeModal());
        }

        // Close modal when clicking outside
        if (this.modal) {
            this.modal.addEventListener('click', (event) => {
                if (event.target === this.modal) {
                    this.closeModal();
                }
            });
        }

        // Handle Enter key in modal input
        if (this.modalInput) {
            this.modalInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    this.modalConfirm.click();
                }
            });
        }
    }

    showModal(title, placeholder = '', defaultValue = '', authorDefault = '') {
        return new Promise((resolve, reject) => {
            this.modalTitle.textContent = title;
            this.modalInput.placeholder = placeholder;
            this.modalInput.value = defaultValue;
            this.modal.classList.add('show');
            this.modalInput.focus();
            this.modalInput.select();

            // Add author input field if not present
            let authorInput = this.modal.querySelector('#modal-author-input');
            if (!authorInput) {
                authorInput = document.createElement('input');
                authorInput.type = 'text';
                authorInput.id = 'modal-author-input';
                authorInput.placeholder = 'Author name...';
                authorInput.classList.add('author-input-spaced');
                this.modalInput.insertAdjacentElement('afterend', authorInput);
            }
            authorInput.value = authorDefault;

            // Remove existing listeners
            const newConfirmBtn = this.modalConfirm.cloneNode(true);
            this.modalConfirm.parentNode.replaceChild(newConfirmBtn, this.modalConfirm);
            this.modalConfirm = newConfirmBtn;

            // Add new listener
            this.modalConfirm.addEventListener('click', () => {
                const value = this.modalInput.value.trim();
                const author = authorInput.value.trim();
                this.closeModal();
                authorInput.remove();
                resolve({ value, author });
            });
        });
    }

    closeModal() {
        this.modal.classList.remove('show');
        this.modalInput.value = '';
    }

    updateTitleDisplay(name) {
        this.currentMapName = name;
        this.titleDisplay.textContent = name || 'Untitled Map';
    }

    async promptForSave() {
        try {
            const { value: name, author } = await this.showModal(
                'Save Map',
                'Enter map name...',
                this.currentMapName,
                ''
            );

            if (
                typeof name === 'string' && name.trim() !== '' &&
                typeof author === 'string' && author.trim() !== '') {
                this.saveMap(name, author);
            } 
        } catch (error) {
            // User cancelled
        }
    }

    async promptForLoad() {
        try {
            const name = await this.showModal(
                'Load Map',
                'Enter map name to load...',
                this.currentMapName
            );

            if (name) {
                this.loadMap(name);
            }
        } catch (error) {
            // User cancelled
        }
    }

    saveMap(name, author) {
        const serializedBricks = this.brickManager.getBricks().map(brick => ({
            color: brick.color,
            name: brick.buttonName,
            points: brick.getGridSquaresCovered()
        }));

        const sceneData = {
            bricks: serializedBricks,
            metadata: {
                name: name,
                width: EditorConfig.GRID_SIZE,
                height: 1,
                depth: EditorConfig.GRID_SIZE,
                timestamp: new Date().toISOString(),
                version: "1.0",
                author: author
            },
        };

        this.sendRequest(`/caaluza/map/${name}`, 'POST', sceneData)
            .then(data => {
                if (data.error) {
                    this.showNotification('Error saving map: ' + data.error, 'error');
                } else {
                    this.updateTitleDisplay(name);
                    this.showNotification('Map saved successfully! ID: ' + data.map_id, 'success');
                }
            })
            .catch(error => {
                this.showNotification('Failed to save map: ' + error.message, 'error');
            });
    }

    loadMap(name) {
        this.fetchAndHandle(`/caaluza/map/${name}`, name);
    }

    async generateMap() {
         try {
            const { pieces, height, minHeight } = await this.promptForGenerate();
            console.log('Generate params:', { pieces, height, minHeight });
            if (Number.isInteger(pieces) && Number.isInteger(height)) {
                let url = `/caaluza/generate?nrpieces=${pieces}&maxheight=${height}`;
                if (minHeight !== null && Number.isInteger(minHeight)) {
                    url += `&minheight=${minHeight}`;
                }
                console.log('Generated URL:', url);
                this.fetchAndHandle(url);
            }
        } catch (error) {
            // User cancelled
        }
    }

    async promptForGenerate() {
        return new Promise((resolve, reject) => {
            const modal = document.createElement('div');
            modal.className = 'modal-dialog';

            modal.innerHTML = `
                <h3>Generate Map</h3>
                <label>
                    Number of pieces: <span id="piecesLabel">8</span>
                    <input type="range" id="piecesInput" min="1" max="28" value="8" required />
                </label>
                <br><br>
                <label>
                    Max Height: <span id="heightLabel">8</span>
                    <input type="range" id="heightSlider" min="1" max="28" value="8" />
                </label>
                <br><br>
                <label>
                    <input type="checkbox" id="minHeightCheckbox" />
                    Minimum Height: <span id="minHeightLabel">2</span>
                    <input type="range" id="minHeightSlider" min="1" max="8" value="2" disabled />
                </label>
                <br><br>
                <button id="submitBtn">Generate</button>
                <button id="cancelBtn">Cancel</button>
            `;

            document.body.appendChild(modal);

            const piecesInput = modal.querySelector('#piecesInput');
            const piecesLabel = modal.querySelector('#piecesLabel');
            const heightSlider = modal.querySelector('#heightSlider');
            const heightLabel = modal.querySelector('#heightLabel');
            const minHeightCheckbox = modal.querySelector('#minHeightCheckbox');
            const minHeightSlider = modal.querySelector('#minHeightSlider');
            const minHeightLabel = modal.querySelector('#minHeightLabel');
            const submitBtn = modal.querySelector('#submitBtn');
            const cancelBtn = modal.querySelector('#cancelBtn');

            heightSlider.addEventListener('input', () => {
                heightLabel.textContent = heightSlider.value;
                // Update min height max to be at most max height
                minHeightSlider.max = heightSlider.value;
                if (parseInt(minHeightSlider.value) > parseInt(heightSlider.value)) {
                    minHeightSlider.value = heightSlider.value;
                    minHeightLabel.textContent = heightSlider.value;
                }
            });

            piecesInput.addEventListener('input', () => {
                piecesLabel.textContent = piecesInput.value;
            });

            // Initialize minimum height control state
            minHeightSlider.disabled = !minHeightCheckbox.checked;
            minHeightLabel.style.opacity = minHeightCheckbox.checked ? '1' : '0.5';

            minHeightCheckbox.addEventListener('change', () => {
                minHeightSlider.disabled = !minHeightCheckbox.checked;
                minHeightLabel.style.opacity = minHeightCheckbox.checked ? '1' : '0.5';
            });

            minHeightSlider.addEventListener('input', () => {
                minHeightLabel.textContent = minHeightSlider.value;
            });

            submitBtn.onclick = () => {
                const pieces = parseInt(piecesInput.value, 10);
                const height = parseInt(heightSlider.value, 10);
                const minHeight = minHeightCheckbox.checked ? parseInt(minHeightSlider.value, 10) : null;
                document.body.removeChild(modal);
                resolve({ pieces, height, minHeight });
            };

            cancelBtn.onclick = () => {
                document.body.removeChild(modal);
                reject(new Error('Cancelled'));
            };
        });
    }

    async sendRequest(url, method, data = null) {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        return await response.json();
    }

    async fetchAndHandle(url, mapName = '') {
        try {
            const data = await this.sendRequest(url, 'GET');
            this.handleFetchResponse(data, mapName);
        } catch (error) {
            console.error('Error loading map:', error);
            this.showNotification('Failed to load map: ' + error.message, 'error');
        }
    }

    handleFetchResponse(data, mapName = '') {
        if (data.error) {
            this.showNotification('Error loading map: ' + data.error, 'error');
            return;
        }

        // Clear existing bricks and re-enable all buttons
        this.brickManager.clearAll();
        this.enableAllButtons();

        const mapData = data.map;
        console.log('Loaded map:', mapData);

        // Update title display with loaded map name
        if (mapName) {
            this.updateTitleDisplay(mapName);
        } else if (mapData.metadata && mapData.metadata.name) {
            this.updateTitleDisplay(mapData.metadata.name);
        } else {
            this.updateTitleDisplay('Generated Map');
        }

        if (mapData.bricks && Array.isArray(mapData.bricks)) {
            mapData.bricks.forEach(brickData => {
                this.loadBrick(brickData);
            });
            this.showNotification('Map loaded successfully!', 'success');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            notification.classList.add('hide');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    loadBrick(brickData) {
        const buttons = this.brickSelector.querySelectorAll('button');

        // Find matching color
        let colorMatch = window.colors.find(c => c.hex === brickData.color);
        if (!colorMatch) {
            colorMatch = window.colors.find(c => c.name === brickData.color);
        }
        const brickColor = colorMatch ? colorMatch.hex : 0x808080;

        // Calculate brick dimensions from points
        const minX = Math.min(...brickData.points.map(p => p.x));
        const maxX = Math.max(...brickData.points.map(p => p.x));
        const minZ = Math.min(...brickData.points.map(p => p.z));
        const maxZ = Math.max(...brickData.points.map(p => p.z));
        const y = brickData.points[0].y;
        const width = maxX - minX + 1;
        const depth = maxZ - minZ + 1;

        const newBrick = new Brick(
            new THREE.Vector3(maxX + 1, y, maxZ + 1),
            brickColor,
            { width: width, height: 1, depth: depth },
            brickData.name || `${width}x${depth} ${brickData.color}`
        );

        this.brickManager.addBrick(newBrick);

        // Disable corresponding button
        const button = Array.from(buttons).find(btn => btn.title === newBrick.buttonName);
        if (button) {
            this.disableButton(button);
        }
    }

    disableButton(button) {
        button.disabled = true;
        button.classList.add('button-disabled');
        button.classList.remove('button-enabled');
    }

    enableButton(button) {
        button.disabled = false;
        button.classList.add('button-enabled');
        button.classList.remove('button-disabled');
    }

    enableAllButtons() {
        this.brickSelector.querySelectorAll('button').forEach(button => {
            this.enableButton(button);
        });
    }

    enableButtonByTitle(title) {
        const button = Array.from(this.brickSelector.querySelectorAll('button'))
            .find(btn => btn.title === title);
        if (button) {
            this.enableButton(button);
        }
    }
}
