// Port of Python Mapgenerator.py to JavaScript

export class Point {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    toString() {
        return `(${this.x}, ${this.y}, ${this.z})`;
    }

    equals(other) {
        return this.x === other.x && this.y === other.y && this.z === other.z;
    }

    static fromArray(arr) {
        return new Point(arr[0], arr[1], arr[2]);
    }
}

export class BrickDef {
    constructor(width, depth, color, points) {
        this.width = width;
        this.depth = depth;
        this.color = color;
        this.points = new Set(points); // Set of Point objects
    }

    sharesNoPoints(otherPoints) {
        for (const point of this.points) {
            for (const otherPoint of otherPoints) {
                if (point.equals(otherPoint)) {
                    return false;
                }
            }
        }
        return true;
    }
}

export class Config {
    constructor(nrBricks, maxHeight = null, minHeight = null, excludeMiddle = false) {
        this.nrBricks = nrBricks;
        this.maxHeight = maxHeight;
        this.minHeight = minHeight;
        this.excludeMiddle = excludeMiddle; // Exclude middle 2x2 pegs from bottom plate
    }
}

function findPlaceableSpots(brick, placedBricks, availablePegs, config) {
    const possiblePoints = [];
    const possiblePointsMetadata = []; // Track which spots overlap middle 2x2
    const orientations = [
        [brick.width, brick.depth],
        [brick.depth, brick.width]
    ];

    for (const peg of availablePegs) {
        for (const [width, depth] of orientations) {
            for (let xOffset = 0; xOffset < width; xOffset++) {
                for (let zOffset = 0; zOffset < depth; zOffset++) {
                    const coordinates = [];
                    for (let x = 0; x < width; x++) {
                        for (let z = 0; z < depth; z++) {
                            coordinates.push(
                                new Point(peg.x - xOffset + x, peg.y, peg.z - zOffset + z)
                            );
                        }
                    }

                    // Check if all placed bricks share no points with these coordinates
                    if (placedBricks.every(b => b.sharesNoPoints(coordinates))) {
                        possiblePoints.push(coordinates);

                        // Track if this spot overlaps with middle 2x2 (for weighting later)
                        if (config.excludeMiddle) {
                            const overlapsMiddle = coordinates.some(point =>
                                point.y === 0 &&
                                point.x >= 2 && point.x <= 3 &&
                                point.z >= 2 && point.z <= 3
                            );
                            possiblePointsMetadata.push({ overlapsMiddle });
                        } else {
                            possiblePointsMetadata.push({ overlapsMiddle: false });
                        }
                    }
                }
            }
        }
    }

    return { spots: possiblePoints, metadata: possiblePointsMetadata };
}

function getMaxHeight(placedBricks) {
    if (placedBricks.length === 0) return 0;
    let maxHeight = 0;
    for (const brick of placedBricks) {
        for (const point of brick.points) {
            if (point.y > maxHeight) {
                maxHeight = point.y;
            }
        }
    }
    return maxHeight;
}

/**
 * Weighted random selection - picks an item based on weights
 * @param {Array} items - Array of items to choose from
 * @param {Array} weights - Array of weights (same length as items)
 * @param {Function} randomFn - Random function to use
 * @returns Selected item
 */
function weightedRandomSelect(items, weights, randomFn) {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = randomFn() * totalWeight;

    for (let i = 0; i < items.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return items[i];
        }
    }

    // Fallback (shouldn't happen)
    return items[items.length - 1];
}

function selectOptimalSpot(spots, metadata, config, placedBricks, bricksRemaining, randomFn) {
    // Calculate weights for each spot based on its minimum height
    const spotHeights = spots.map(spot => Math.min(...spot.map(p => p.y)));

    // Determine height preference multiplier based on situation
    let heightMultiplier;

    if (config.minHeight === null) {
        // No minimum height requirement: mild preference for height (more natural building)
        heightMultiplier = 1.5;
    } else {
        const currentMaxHeight = getMaxHeight(placedBricks);

        if (currentMaxHeight >= config.minHeight) {
            // Already reached minimum height: mild preference for continued upward building
            heightMultiplier = 1.5;
        } else {
            // Haven't reached minimum height yet
            const heightDeficit = config.minHeight - currentMaxHeight;
            const safetyMargin = bricksRemaining - heightDeficit;

            if (safetyMargin <= 0) {
                // Critical: MUST reach height - extremely aggressive
                heightMultiplier = 100.0;
            } else if (safetyMargin === 1) {
                // Very low safety: very aggressive
                heightMultiplier = 20.0;
            } else if (safetyMargin === 2) {
                // Some safety: moderate-strong preference
                heightMultiplier = 2.5;
            } else {
                // Good safety: moderate preference
                heightMultiplier = 2.0;
            }
        }
    }

    // Calculate weights for each spot: weight = heightMultiplier ^ height
    // This gives exponentially more weight to higher spots, but fairly distributed
    const weights = spotHeights.map(height => Math.pow(heightMultiplier, height));

    // Apply penalty for spots that overlap with middle 2x2 (10% of normal weight = 90% chance to avoid)
    for (let i = 0; i < spots.length; i++) {
        if (metadata[i].overlapsMiddle) {
            weights[i] *= 0.1; // Strong disincentive (90% chance to place elsewhere)
        }
    }

    // Use weighted random selection
    return weightedRandomSelect(spots, weights, randomFn);
}

function assertNoOverlappingBricks(placedBricks) {
    for (let i = 0; i < placedBricks.length - 1; i++) {
        for (let j = i + 1; j < placedBricks.length; j++) {
            if (!placedBricks[i].sharesNoPoints(Array.from(placedBricks[j].points))) {
                throw new Error("Overlapping bricks detected!");
            }
        }
    }
}

function addNewAvailablePegs(availablePegs, config, placedBricks, spot, random) {
    for (const p of spot) {
        // Add peg above if within max height limit (or no limit)
        if (config.maxHeight === null || p.y + 1 < config.maxHeight) {
            const abovePoint = new Point(p.x, p.y + 1, p.z);
            if (placedBricks.every(brick =>
                brick.sharesNoPoints([abovePoint])
            )) {
                // Add to set using string representation to avoid duplicates
                availablePegs.add(abovePoint);
            }
        }

        // Add hanging peg below (only above baseplate level)
        if (p.y > 0) {
            const hangingPoint = new Point(p.x, p.y - 1, p.z);
            if (placedBricks.every(brick =>
                brick.sharesNoPoints([hangingPoint])
            )) {
                availablePegs.add(hangingPoint);
            }
        }
    }
}

function getAvailableBricks(nrBricks, seed = null) {
    const availableBricks = [];
    const colors = ["Yellow", "Red", "Green", "Blue"];

    for (const color of colors) {
        for (let i = 1; i <= 2; i++) {
            for (let j = i; j < 5; j++) {
                availableBricks.push(new BrickDef(i, j, color, []));
            }
        }
    }

    // If seed is provided, use it for deterministic shuffling
    if (seed !== null) {
        shuffleWithSeed(availableBricks, seed);
    } else {
        // Fisher-Yates shuffle
        for (let i = availableBricks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableBricks[i], availableBricks[j]] = [availableBricks[j], availableBricks[i]];
        }
    }

    return availableBricks.slice(0, nrBricks);
}

// Seeded random number generator (LCG)
function seededRandom(seed) {
    let state = seed;
    return function() {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

function shuffleWithSeed(array, seed) {
    const random = seededRandom(seed);
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function generateSingleMap(config, seed = null) {
    // Create baseplate
    const baseplatePoints = [];
    for (let x = 0; x < 6; x++) {
        for (let z = 0; z < 6; z++) {
            baseplatePoints.push(new Point(x, 0, z));
        }
    }
    const baseplate = new BrickDef(6, 6, "gray", baseplatePoints);

    const availablePegs = new Set(baseplatePoints);
    const availableBricks = getAvailableBricks(config.nrBricks, seed);

    const placedBricks = [];

    // Use seeded random if provided
    const random = seed !== null ? seededRandom(seed + 1000) : Math.random;

    for (let i = 0; i < availableBricks.length; i++) {
        const brick = availableBricks[i];
        const bricksRemaining = availableBricks.length - i - 1;

        const { spots, metadata } = findPlaceableSpots(brick, placedBricks, availablePegs, config);
        if (spots.length === 0) {
            throw new Error("No spots available");
        }

        // Always use optimal spot selection (respects min height requirements)
        const spot = selectOptimalSpot(spots, metadata, config, placedBricks, bricksRemaining, random);

        placedBricks.push(new BrickDef(brick.width, brick.depth, brick.color, spot));

        // Remove used points from available pegs
        for (const point of spot) {
            availablePegs.delete(point);
        }

        addNewAvailablePegs(availablePegs, config, placedBricks, spot, random);
    }

    return placedBricks;
}

export function generateMap(config, seed = null) {
    // Basic validation
    if (config.minHeight !== null && config.nrBricks < config.minHeight) {
        throw new Error(
            `Cannot achieve minimum height ${config.minHeight} with only ${config.nrBricks} bricks`
        );
    }

    const maxAttempts = config.minHeight !== null ? 10 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const placedBricks = generateSingleMap(config, seed);

            // Validate minimum height
            if (config.minHeight !== null) {
                const maxHeightAchieved = getMaxHeight(placedBricks);
                if (maxHeightAchieved < config.minHeight) {
                    if (attempt === maxAttempts - 1) {
                        throw new Error(
                            `Failed to achieve minimum height ${config.minHeight} after ${maxAttempts} attempts. Only reached height ${maxHeightAchieved}`
                        );
                    }
                    continue;
                }
            }

            assertNoOverlappingBricks(placedBricks);
            return placedBricks;
        } catch (e) {
            if (attempt === maxAttempts - 1) {
                throw e;
            }
            continue;
        }
    }

    throw new Error("Failed to generate map");
}

// Convert BrickDef array to BrickMap format compatible with existing editor
export function brickDefsToMapData(brickDefs) {
    const bricks = brickDefs.map(brickDef => {
        const points = Array.from(brickDef.points).map(p => ({
            x: p.x,
            y: p.y,
            z: p.z
        }));

        const xs = points.map(p => p.x);
        const zs = points.map(p => p.z);
        const width = Math.abs(Math.min(...xs) - Math.max(...xs)) + 1;
        const depth = Math.abs(Math.min(...zs) - Math.max(...zs)) + 1;
        const [finalWidth, finalDepth] = [Math.min(width, depth), Math.max(width, depth)];

        return {
            color: brickDef.color,
            name: `${finalWidth}x${finalDepth} ${brickDef.color}`,
            points: points
        };
    });

    return {
        metadata: {
            width: 6,
            height: 1,
            depth: 6,
            name: "Generated Map",
            timestamp: new Date().toISOString()
        },
        bricks: bricks
    };
}
