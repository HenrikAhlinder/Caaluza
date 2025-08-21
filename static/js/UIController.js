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
                const color = colors.find(c => c.name === colorName);
                const size = sizes.find(s => s.name === sizeName);

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
        document.getElementById('save-btn').addEventListener('click', () => {
            this.promptForSave();
        });

        document.getElementById('load-btn').addEventListener('click', () => {
            this.promptForLoad();
        });

        document.getElementById('generate-btn').addEventListener('click', () => {
            this.generateMap();
        });

        document.getElementById('start-over-btn').addEventListener('click', () => {
            this.startOver();
        });
    }

    setupModal() {
        this.modal = document.getElementById('prompt-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalInput = document.getElementById('modal-input');
        this.modalConfirm = document.getElementById('modal-confirm');
        this.modalCancel = document.getElementById('modal-cancel');
        this.closeBtn = this.modal.querySelector('.close');

        // Close modal events
        this.closeBtn.addEventListener('click', () => this.closeModal());
        this.modalCancel.addEventListener('click', () => this.closeModal());

        // Close modal when clicking outside
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.closeModal();
            }
        });

        // Handle Enter key in modal input
        this.modalInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                this.modalConfirm.click();
            }
        });
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
            const { pieces, height } = await this.promptForGenerate();
            if (Number.isInteger(pieces) && Number.isInteger(height)) {
                this.fetchAndHandle(`/caaluza/generate?nrpieces=${pieces}&maxheight=${height}`);
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
                    Number of pieces:
                    Number of pieces: <span id="piecesLabel">8</span>
                    <input type="range" id="piecesInput" min="1" max = "28" defaultValue=8 required />
                </label>
                <br><br>
                <label>
                    Height: <span id="heightLabel">8</span>
                    <input type="range" id="heightSlider" min="1" max="10" value="8" />
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
            const submitBtn = modal.querySelector('#submitBtn');
            const cancelBtn = modal.querySelector('#cancelBtn');

            heightSlider.addEventListener('input', () => {
                heightLabel.textContent = heightSlider.value;
            });

            piecesInput.addEventListener('input', () => {
                piecesLabel.textContent = piecesInput.value;
            });

            submitBtn.onclick = () => {
                const pieces = parseInt(piecesInput.value, 10);
                const height = parseInt(heightSlider.value, 10);
                document.body.removeChild(modal);
                resolve({ pieces, height });
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
        let colorMatch = colors.find(c => c.hex === brickData.color);
        if (!colorMatch) {
            colorMatch = colors.find(c => c.name === brickData.color);
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

    async startOver() {
        try {
            await this.showConfirmModal(
                'Start Over',
                'This will remove all bricks from the map. Are you sure?'
            );
            
            // User confirmed - clear everything
            this.brickManager.clearAll();
            this.enableAllButtons();
            this.updateTitleDisplay('Untitled Map');
        } catch (error) {
            // User cancelled - do nothing
        }
    }

    showConfirmModal(title, message) {
        return new Promise((resolve, reject) => {
            this.modalTitle.textContent = title;
            this.modal.classList.add('show');
            
            // Replace modal body with confirmation message
            const modalBody = this.modal.querySelector('.modal-body');
            modalBody.innerHTML = `<p style="margin: 0; font-size: 16px;">${message}</p>`;
            
            // Update confirm button text
            this.modalConfirm.textContent = 'Yes, Start Over';
            
            // Remove existing listeners
            const newConfirmBtn = this.modalConfirm.cloneNode(true);
            this.modalConfirm.parentNode.replaceChild(newConfirmBtn, this.modalConfirm);
            this.modalConfirm = newConfirmBtn;

            // Add new listener
            this.modalConfirm.addEventListener('click', () => {
                this.closeModal();
                // Restore modal body and confirm button
                modalBody.innerHTML = '<input type="text" id="modal-input" placeholder="Enter map title..." maxlength="50">';
                this.modalInput = modalBody.querySelector('#modal-input');
                this.modalConfirm.textContent = 'OK';
                resolve();
            });
        });
    }
}