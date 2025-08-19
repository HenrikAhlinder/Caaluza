from dataclasses import dataclass
from random import sample

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


def generate_map(definition: Config) -> list[BrickDef]:
    baseplate = BrickDef(6, 6, "gray", frozenset(Point(x, 0, z) for x in range(6) for z in range(6)))

    available_pegs: set[Point] = set(baseplate.points)
    available_bricks = get_available_bricks(definition.nr_bricks)

    placed_bricks: list[BrickDef] = []
    for brick in available_bricks:
        spots = find_placeable_spots(brick, placed_bricks, available_pegs)
        if spots is None:
            raise Exception("No spots available")

        spot = sample(spots, 1)[0]
        placed_bricks.append(BrickDef(brick.width, brick.depth, brick.color, spot))
        available_pegs.difference_update(spot)
        add_new_available_pegs(available_pegs, placed_bricks, spots, spot)

    Assert_no_overlapping_bricks(placed_bricks)
    return placed_bricks

def Assert_no_overlapping_bricks(placed_bricks):
    for i in range(len(placed_bricks)-1):
        for j in range(i+1, len(placed_bricks)):
            assert(placed_bricks[i].points.isdisjoint(placed_bricks[j].points))

def add_new_available_pegs(available_pegs, placed_bricks, spots, spot):
    for p in spot:
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
