// Main application file for client-only Caaluza
import { BrickEditor } from './BrickEditor.js';
import { generateMap, Config, brickDefsToMapData } from './MapGenerator.js';
import {
    encodeToSeed,
    decodeFromSeed,
    isValidSeed,
    getSeedFromURL,
    getViewFromURL,
    getModeFromURL,
    updateURLWithSeed,
    createShareableURL
} from './SeedSystem.js';

let brickEditor = null;
let currentSeed = null;

// Initialize the application
function init() {
    // Check URL parameters
    const seedFromURL = getSeedFromURL();
    const viewFromURL = getViewFromURL();
    const modeFromURL = getModeFromURL();

    // Set mode from URL or default to 'edit'
    const mode = modeFromURL || 'edit';
    window.mode = mode;

    // Set selected view from URL
    if (viewFromURL) {
        // Find the view object
        const viewObj = window.views.find(v => v.name.toLowerCase() === viewFromURL.toLowerCase());
        if (viewObj) {
            window.selectedView = viewFromURL;
        }
    }

    if (seedFromURL && isValidSeed(seedFromURL)) {
        // Load map from seed
        loadMapFromSeed(seedFromURL);
    } else {
        // Initialize empty editor
        initializeEditor();
    }

    // Setup generator form
    setupGeneratorForm();

    // Setup load seed form
    setupLoadSeedForm();
}

function setupLoadSeedForm() {
    const form = document.getElementById('load-seed-form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const seedInput = document.getElementById('seed-input').value.trim();
        const errorMsg = document.getElementById('seed-error-message');

        // Validate seed
        if (!isValidSeed(seedInput)) {
            errorMsg.textContent = 'Invalid seed format. Expected format: nrBricks-maxHeight-minHeight-randomSeed (e.g., 10-5-null-123456)';
            errorMsg.classList.add('show');
            return;
        }

        errorMsg.classList.remove('show');

        try {
            // Update URL
            updateURLWithSeed(seedInput);

            // Load map from seed (don't hide initially since user explicitly loaded it)
            loadMapFromSeed(seedInput, false);

            // Close modal
            if (typeof window.closeLoadSeedModal === 'function') {
                window.closeLoadSeedModal();
            }
        } catch (error) {
            errorMsg.textContent = 'Failed to load seed: ' + error.message;
            errorMsg.classList.add('show');
            console.error('Load seed error:', error);
        }
    });
}

function initializeEditor(mapData = null) {
    if (brickEditor) {
        // Clean up existing editor if needed
        // For now, just reinitialize
    }

    // Set existingMap global for editor initialization
    if (mapData) {
        window.existingMap = {
            map_id: 'generated',
            map: mapData
        };
    } else {
        window.existingMap = null;
    }

    brickEditor = new BrickEditor(window.mode || 'edit');
}

function loadMapFromSeed(seed, hideMapInitially = false) {
    try {
        const params = decodeFromSeed(seed);

        // Create config
        const config = new Config(
            params.nrBricks,
            params.maxHeight,
            params.minHeight
        );

        // Generate map with the seed
        const brickDefs = generateMap(config, params.randomSeed);
        const mapData = brickDefsToMapData(brickDefs);

        // Initialize editor with the map
        initializeEditor(mapData);

        // Show seed display
        currentSeed = seed;
        if (typeof window.showSeedDisplay === 'function') {
            window.showSeedDisplay(seed);
        }

        // Hide map if requested (e.g., when generating new map)
        if (hideMapInitially && typeof window.hideMap === 'function') {
            window.hideMap();
        }

        console.log('Map loaded from seed:', seed);
    } catch (error) {
        console.error('Failed to load map from seed:', error);
        alert('Failed to load map from seed: ' + error.message);
        initializeEditor();
    }
}

function setupGeneratorForm() {
    const form = document.getElementById('generator-form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const nrBricks = parseInt(document.getElementById('nr-bricks').value, 10);
        const maxHeightInput = document.getElementById('max-height').value;
        const minHeightInput = document.getElementById('min-height').value;

        const maxHeight = maxHeightInput ? parseInt(maxHeightInput, 10) : null;
        const minHeight = minHeightInput ? parseInt(minHeightInput, 10) : null;

        // Validate inputs
        const errorMsg = document.getElementById('error-message');
        if (nrBricks < 1 || nrBricks > 100) {
            errorMsg.textContent = 'Number of bricks must be between 1 and 100';
            errorMsg.classList.add('show');
            return;
        }

        if (minHeight !== null && maxHeight !== null && minHeight >= maxHeight) {
            errorMsg.textContent = 'Minimum height must be less than maximum height';
            errorMsg.classList.add('show');
            return;
        }

        if (minHeight !== null && nrBricks < minHeight) {
            errorMsg.textContent = 'Number of bricks must be at least equal to minimum height';
            errorMsg.classList.add('show');
            return;
        }

        errorMsg.classList.remove('show');

        try {
            // Generate seed
            const seed = encodeToSeed(nrBricks, maxHeight, minHeight);

            // Update URL
            updateURLWithSeed(seed);

            // Load map from seed (hide it initially so user can copy seed first)
            loadMapFromSeed(seed, true);

            // Close modal
            if (typeof window.closeGeneratorModal === 'function') {
                window.closeGeneratorModal();
            }
        } catch (error) {
            errorMsg.textContent = 'Failed to generate map: ' + error.message;
            errorMsg.classList.add('show');
            console.error('Generation error:', error);
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for debugging
window.caaluza = {
    brickEditor,
    generateMap,
    encodeToSeed,
    decodeFromSeed,
    loadMapFromSeed
};
