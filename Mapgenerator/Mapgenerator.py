from dataclasses import dataclass
from random import sample, random

@dataclass
class Point:
    x: int
    y: int
    z: int

    def __hash__(self):
        return hash(f"({self.x}, {self.y}, {self.z}")

@dataclass
class BrickDef:
    width: int
    depth: int
    color: str
    points: frozenset[Point]

    def shares_no_points(self, other: frozenset[Point]) -> bool:
        return self.points.isdisjoint(other)

@dataclass
class Config:
    nr_bricks: int
    max_height: int = None
    min_height: int = None


def find_placeable_spots(brick: BrickDef, 
                        placed_bricks: list[BrickDef], 
                        available_pegs: set[Point]) -> None | list[frozenset[Point]]:
    possible_points = []

    orientations = [(brick.width, brick.depth), (brick.depth, brick.width)]
    
    for peg in available_pegs:
        for width, depth in orientations:
            for xOffset in range(width):
                for zOffset in range(depth):
                    coordinates = frozenset(
                        Point(peg.x - xOffset + x, peg.y, peg.z - zOffset + z)
                        for x in range(width)
                        for z in range(depth)
                    )
                    if all(brick.shares_no_points(coordinates) for brick in placed_bricks):
                        possible_points.append(coordinates)

    return possible_points


def get_max_height(placed_bricks: list[BrickDef]) -> int:
    """Get the maximum height achieved in the placed bricks."""
    if not placed_bricks:
        return 0
    return max(point.y for brick in placed_bricks for point in brick.points)


def select_optimal_spot(spots: list[frozenset[Point]], definition: Config, placed_bricks: list[BrickDef], bricks_remaining: int) -> frozenset[Point]:
    """
    Select the optimal spot for placing a brick.
    If min_height is specified, scale aggressiveness based on how close we are to running out of safety margin.
    """
    if definition.min_height is None:
        return sample(spots, 1)[0]

    current_max_height = get_max_height(placed_bricks)

    # If we've already reached minimum height, play naturally with slight height preference
    if current_max_height >= definition.min_height:
        max_height_in_spots = max(min(point.y for point in spot) for spot in spots)
        max_height_spots = [spot for spot in spots if min(point.y for point in spot) == max_height_in_spots]

        # Mild preference for higher spots (60% vs 40%) for continued building
        if len(max_height_spots) > 0 and random() < 0.6:
            return sample(max_height_spots, 1)[0]
        else:
            return sample(spots, 1)[0]

    # We haven't reached minimum height yet - calculate aggressiveness based on safety margin
    height_deficit = definition.min_height - current_max_height
    safety_margin = bricks_remaining - height_deficit

    # Scale aggressiveness: more remaining pieces = less aggressive
    if safety_margin >= 3:
        # Plenty of safety margin - play almost completely naturally
        aggressiveness = 0.1  # 10% bias toward height
    elif safety_margin == 2:
        # Some safety margin - mild bias
        aggressiveness = 0.3  # 30% bias toward height
    elif safety_margin == 1:
        # Low safety margin - moderate bias
        aggressiveness = 0.6  # 60% bias toward height
    elif safety_margin == 0:
        # No safety margin - strong bias but not 100%
        aggressiveness = 0.8  # 80% bias toward height
    else:
        # Negative safety margin - MUST be aggressive
        aggressiveness = 1.0  # 100% bias toward height

    max_height_in_spots = max(min(point.y for point in spot) for spot in spots)
    max_height_spots = [spot for spot in spots if min(point.y for point in spot) == max_height_in_spots]

    # Apply scaled aggressiveness
    if len(max_height_spots) > 0 and random() < aggressiveness:
        # When being aggressive, prefer spots that build on existing structures for better stacking
        if aggressiveness >= 0.8 and len(placed_bricks) > 0:
            building_on_existing = []
            for spot in max_height_spots:
                for point in spot:
                    point_below = Point(point.x, point.y - 1, point.z)
                    if any(point_below in brick.points for brick in placed_bricks):
                        building_on_existing.append(spot)
                        break
            if building_on_existing:
                return sample(building_on_existing, 1)[0]

        return sample(max_height_spots, 1)[0]
    else:
        return sample(spots, 1)[0]


def generate_map(definition: Config) -> list[BrickDef]:
    # Basic validation - need at least enough bricks to build a tower
    # More conservative estimate: need at least min_height bricks to guarantee reaching min_height
    if definition.min_height is not None and definition.nr_bricks < definition.min_height:
        raise Exception(f"Cannot achieve minimum height {definition.min_height} with only {definition.nr_bricks} bricks")

    # Try to generate a map multiple times if min_height requirement isn't met
    max_attempts = 10 if definition.min_height is not None else 1

    for attempt in range(max_attempts):
        try:
            placed_bricks = generate_single_map(definition)

            # Validate that minimum height was achieved
            if definition.min_height is not None:
                max_height_achieved = get_max_height(placed_bricks)
                if max_height_achieved < definition.min_height:
                    if attempt == max_attempts - 1:  # Last attempt
                        raise Exception(f"Failed to achieve minimum height {definition.min_height} after {max_attempts} attempts. Only reached height {max_height_achieved}")
                    continue  # Try again

            Assert_no_overlapping_bricks(placed_bricks)
            return placed_bricks

        except Exception as e:
            if attempt == max_attempts - 1:  # Last attempt
                raise e
            continue  # Try again

    # This should never be reached, but just in case
    raise Exception("Failed to generate map")


def generate_single_map(definition: Config) -> list[BrickDef]:
    baseplate = BrickDef(6, 6, "gray", frozenset(Point(x, 0, z) for x in range(6) for z in range(6)))

    available_pegs: set[Point] = set(baseplate.points)
    available_bricks = get_available_bricks(definition.nr_bricks)

    placed_bricks: list[BrickDef] = []
    for i, brick in enumerate(available_bricks):
        bricks_remaining = len(available_bricks) - i - 1  # How many bricks left after this one

        spots = find_placeable_spots(brick, placed_bricks, available_pegs)
        if not spots:
            raise Exception("No spots available")

        spot = select_optimal_spot(spots, definition, placed_bricks, bricks_remaining)
        placed_bricks.append(BrickDef(brick.width, brick.depth, brick.color, spot))
        available_pegs.difference_update(spot)
        add_new_available_pegs(available_pegs, definition, placed_bricks, spots, spot)

    return placed_bricks

def Assert_no_overlapping_bricks(placed_bricks):
    for i in range(len(placed_bricks)-1):
        for j in range(i+1, len(placed_bricks)):
            assert(placed_bricks[i].points.isdisjoint(placed_bricks[j].points))

def add_new_available_pegs(available_pegs, definition: Config, placed_bricks, spots, spot):
    for p in spot:
        if p.y+1 >= definition.max_height:
            # Not allowed, too high.
            continue
        abovepoint = Point(p.x, p.y + 1, p.z)
        if all(brick.shares_no_points(frozenset([abovepoint])) for brick in placed_bricks):
            available_pegs.add(abovepoint)

        if p.y <= 0:  # Only add hanging points above baseplate level
            continue
        hanging_point = Point(p.x, p.y - 1, p.z)
        if all(brick.shares_no_points(frozenset([hanging_point])) for brick in placed_bricks):
            available_pegs.add(hanging_point)

def get_available_bricks(nr_bricks: int) -> list[BrickDef]:
    available_bricks = []
    for color in ["Yellow", "Red", "Green", "Blue"]:
        for i in range(1, 3):
            for j in range(i, 5):
                available_bricks.append(BrickDef(i, j, color, frozenset()))
    return sample(available_bricks, nr_bricks)
