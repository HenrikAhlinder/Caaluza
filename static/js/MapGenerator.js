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
    constructor(nrBricks, maxHeight = null, minHeight = null) {
        this.nrBricks = nrBricks;
        this.maxHeight = maxHeight;
        this.minHeight = minHeight;
    }
}

function findPlaceableSpots(brick, placedBricks, availablePegs) {
    const possiblePoints = [];
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
                    }
                }
            }
        }
    }

    return possiblePoints;
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

function selectOptimalSpot(spots, config, placedBricks, bricksRemaining, randomFn) {
    if (config.minHeight === null) {
        return spots[Math.floor(randomFn() * spots.length)];
    }

    const currentMaxHeight = getMaxHeight(placedBricks);

    // If we've already reached minimum height, play naturally with slight height preference
    if (currentMaxHeight >= config.minHeight) {
        const maxHeightInSpots = Math.max(...spots.map(spot =>
            Math.min(...spot.map(p => p.y))
        ));
        const maxHeightSpots = spots.filter(spot =>
            Math.min(...spot.map(p => p.y)) === maxHeightInSpots
        );

        // Mild preference for higher spots (60% vs 40%)
        if (maxHeightSpots.length > 0 && randomFn() < 0.6) {
            return maxHeightSpots[Math.floor(randomFn() * maxHeightSpots.length)];
        } else {
            return spots[Math.floor(randomFn() * spots.length)];
        }
    }

    // Haven't reached minimum height yet
    const heightDeficit = config.minHeight - currentMaxHeight;

    // Calculate the maximum height spots
    const maxHeightInSpots = Math.max(...spots.map(spot =>
        Math.min(...spot.map(p => p.y))
    ));
    const maxHeightSpots = spots.filter(spot =>
        Math.min(...spot.map(p => p.y)) === maxHeightInSpots
    );

    // Determine strategy based on how critical the situation is
    const isCritical = bricksRemaining <= heightDeficit;

    if (isCritical) {
        // Critical: Must stack aggressively (100% pick highest)
        // Prefer spots that build on existing structures
        if (placedBricks.length > 0) {
            const buildingOnExisting = [];
            for (const spot of maxHeightSpots) {
                for (const point of spot) {
                    const pointBelow = new Point(point.x, point.y - 1, point.z);
                    if (placedBricks.some(brick =>
                        Array.from(brick.points).some(p => p.equals(pointBelow))
                    )) {
                        buildingOnExisting.push(spot);
                        break;
                    }
                }
            }
            if (buildingOnExisting.length > 0) {
                return buildingOnExisting[Math.floor(randomFn() * buildingOnExisting.length)];
            }
        }
        // Always pick highest spot when critical
        return maxHeightSpots[Math.floor(randomFn() * maxHeightSpots.length)];
    } else {
        // Not critical: Probabilistically prefer height (75% chance)
        // This encourages upward building without forcing towers
        if (randomFn() < 0.75) {
            // Pick from higher spots (prefer building on existing structures)
            if (placedBricks.length > 0) {
                const buildingOnExisting = [];
                for (const spot of maxHeightSpots) {
                    for (const point of spot) {
                        const pointBelow = new Point(point.x, point.y - 1, point.z);
                        if (placedBricks.some(brick =>
                            Array.from(brick.points).some(p => p.equals(pointBelow))
                        )) {
                            buildingOnExisting.push(spot);
                            break;
                        }
                    }
                }
                if (buildingOnExisting.length > 0) {
                    return buildingOnExisting[Math.floor(randomFn() * buildingOnExisting.length)];
                }
            }
            return maxHeightSpots[Math.floor(randomFn() * maxHeightSpots.length)];
        } else {
            // 25% of the time, pick any spot (allows for variety)
            return spots[Math.floor(randomFn() * spots.length)];
        }
    }
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

function addNewAvailablePegs(availablePegs, config, placedBricks, spot) {
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

        const spots = findPlaceableSpots(brick, placedBricks, availablePegs);
        if (spots.length === 0) {
            throw new Error("No spots available");
        }

        // Always use optimal spot selection (respects min height requirements)
        const spot = selectOptimalSpot(spots, config, placedBricks, bricksRemaining, random);

        placedBricks.push(new BrickDef(brick.width, brick.depth, brick.color, spot));

        // Remove used points from available pegs
        for (const point of spot) {
            availablePegs.delete(point);
        }

        addNewAvailablePegs(availablePegs, config, placedBricks, spot);
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
