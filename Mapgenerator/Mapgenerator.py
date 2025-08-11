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


def generate_map2() -> list[BrickDef]:
    baseplate = BrickDef(6, 6, "gray", frozenset(Point(x, -1, z) for x in range(6) for z in range(6)))
    nr_bricks = 12
    available_pegs: set[Point] = set(baseplate.points)

    available_bricks= []
    for color in ["Yellow", "Red", "Green", "Blue"]:
        for i in range(1, 3):
            for j in range(i, 5):
                available_bricks.append(BrickDef(i, j, color, frozenset()))

    available_bricks = sample(available_bricks, nr_bricks)

    def find_placeable_spots(brick: BrickDef, 
                            placed_bricks: list[BrickDef], 
                            available_pegs: set[Point]) -> None | list[frozenset[Point]]:
        possible_points = []
        for avail_peg in available_pegs:
            # Normal rotation
            for xOffset in range(brick.width):
                for zOffset in range(brick.depth):
                    startpointx = avail_peg.x - xOffset
                    startpointz = avail_peg.z - zOffset
                    lastx = avail_peg.x - xOffset + brick.width
                    lastz = avail_peg.z - zOffset + brick.depth
                    y = avail_peg.y + 1

                    coordinates =frozenset(
                        Point(x, y, z) 
                        for x in range(startpointx, lastx) 
                        for z in range(startpointz, lastz))

                    if all(brick.shares_no_points(coordinates) for brick in placed_bricks):
                        possible_points.append(frozenset(coordinates))
            

        return possible_points


    placed_bricks: list[BrickDef] = []
    for brick in available_bricks:
        spots = find_placeable_spots(brick, placed_bricks, available_pegs)
        if spots is None:
            raise Exception("No spots available")

        spot = sample(spots, 1)[0]
        placed_bricks.append(BrickDef(brick.width, brick.depth, brick.color, spot))

        # Remove occupied pegs
        available_pegs.difference_update(spots)

        for p in spot:
            abovepoint = Point(p.x, p.y + 1, p.z)
            for brick in placed_bricks:
                if abovepoint in brick.points:
                    break
            else:
                available_pegs.add(p)

            # TODO: Allow hanging bricks. Requires changes to find_placeable_spots


    for i in range(len(placed_bricks)-1):
        for j in range(i+1, len(placed_bricks)):
            assert(placed_bricks[i].points.isdisjoint(placed_bricks[j].points))


    return placed_bricks