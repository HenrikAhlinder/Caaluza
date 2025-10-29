// Seed-based encoding/decoding system for map generation

/**
 * Encodes map generation parameters into a compact seed string
 * Format: {nrBricks}-{maxHeight}-{minHeight}-{randomSeed}
 * Example: "10-5-2-12345" means 10 bricks, max height 5, min height 2, random seed 12345
 */
export function encodeToSeed(nrBricks, maxHeight, minHeight) {
    // Generate a random seed for the RNG
    const randomSeed = Math.floor(Math.random() * 1000000);

    // Use null-safe encoding
    const maxH = maxHeight !== null ? maxHeight : 'null';
    const minH = minHeight !== null ? minHeight : 'null';

    return `${nrBricks}-${maxH}-${minH}-${randomSeed}`;
}

/**
 * Decodes a seed string into map generation parameters
 * Returns: {nrBricks, maxHeight, minHeight, randomSeed}
 */
export function decodeFromSeed(seed) {
    try {
        const parts = seed.split('-');
        if (parts.length !== 4) {
            throw new Error('Invalid seed format');
        }

        const [nrBricks, maxHeight, minHeight, randomSeed] = parts;

        return {
            nrBricks: parseInt(nrBricks, 10),
            maxHeight: maxHeight === 'null' ? null : parseInt(maxHeight, 10),
            minHeight: minHeight === 'null' ? null : parseInt(minHeight, 10),
            randomSeed: parseInt(randomSeed, 10)
        };
    } catch (e) {
        throw new Error('Failed to decode seed: ' + e.message);
    }
}

/**
 * Validates if a seed string is properly formatted
 */
export function isValidSeed(seed) {
    try {
        const decoded = decodeFromSeed(seed);
        return (
            !isNaN(decoded.nrBricks) &&
            decoded.nrBricks > 0 &&
            decoded.nrBricks <= 100 &&
            (decoded.maxHeight === null || (!isNaN(decoded.maxHeight) && decoded.maxHeight > 0)) &&
            (decoded.minHeight === null || (!isNaN(decoded.minHeight) && decoded.minHeight >= 0)) &&
            !isNaN(decoded.randomSeed)
        );
    } catch (e) {
        return false;
    }
}

/**
 * Gets the seed from the URL query parameter
 */
export function getSeedFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('seed');
}

/**
 * Gets the view parameter from the URL query parameter
 */
export function getViewFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('view');
}

/**
 * Gets the mode parameter from the URL query parameter
 * Can be 'edit' or 'play'
 */
export function getModeFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode');
}

/**
 * Updates the URL with the given seed (without page reload)
 */
export function updateURLWithSeed(seed) {
    const url = new URL(window.location);
    url.searchParams.set('seed', seed);
    window.history.pushState({}, '', url);
}

/**
 * Clears the seed from the URL
 */
export function clearSeedFromURL() {
    const url = new URL(window.location);
    url.searchParams.delete('seed');
    window.history.pushState({}, '', url);
}

/**
 * Creates a shareable URL with the seed
 */
export function createShareableURL(seed, view = null, mode = null) {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('seed', seed);
    if (view) {
        url.searchParams.set('view', view);
    }
    if (mode) {
        url.searchParams.set('mode', mode);
    }
    return url.toString();
}

/**
 * Updates the URL with view and mode parameters
 */
export function updateURLWithViewAndMode(view, mode) {
    const url = new URL(window.location);
    if (view) {
        url.searchParams.set('view', view);
    }
    if (mode) {
        url.searchParams.set('mode', mode);
    }
    window.history.pushState({}, '', url);
}
