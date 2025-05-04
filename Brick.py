from dataclasses import dataclass

@dataclass
class Point:
    """
    A class to represent a point in 3D space.
    
    Attributes:
        x (int): The x-coordinate of the point.
        y (int): The y-coordinate of the point.
        z (int): The z-coordinate of the point.
    """
    x: int
    y: int
    z: int

    def __add__(self, other):
        """Add two points and return a new Point object."""
        if isinstance(other, Point):
            return Point(self.x + other.x, self.y + other.y, self.z + other.z)
        if isinstance(other, tuple) and len(other) == 3:
            return Point(self.x + other[0], self.y + other[1], self.z + other[2])
        raise ValueError("Can only add another Point.")


@dataclass
class Brick:
    """
    A class to represent a LEGO-like brick.
    
    Attributes:
        color (str): The color of the brick.
        size (int): The size of the brick in standard LEGO units.
    """
    color: str
    width: int
    depth: int

    def __hash__(self):
        """Make the Brick class hashable."""
        return hash((self.color, self.width, self.depth))

    def describe(self):
        """Return a string describing the brick."""
        return f"A {self.color} brick of size {self.width}x{self.depth}."

class BrickMap:
    """
    A class to control a map of LEGO-like bricks.

    Attributes:
        width (int): The width of the map.
        height (int): The height of the map.
        depth (int): The depth of the map.
        map (list): A 3D array of bricks. Starts with a bottom plate (z=0).
    """

    def __init__(self, width=5, height=5, depth=1):
        self.width = width
        self.height = height
        self.depth = depth
        # Initialize a 3D array filled with `None` to represent an empty map
        self.map = [[[None for _ in range(depth)] for _ in range(height)] for _ in range(width)]
        self.bricks = {}

    def add_brick(self, Point, brick):
        """Add a brick to the map at the specified position (x, y, z)."""
        points_to_occupy = []

        if (self._point_in_bounds(Point.x, Point.y, Point.z) and self._brick_in_bounds(Point.x, Point.y, brick.width, brick.depth)):
            # Ensure all positions are empty before adding the brick
            for i in range(brick.width):  # Reserve horizontal block space
                for j in range(brick.depth):  # Reserve depth-wise space as well
                    if self.map[Point.x + i][Point.y + j][Point.z] is not None:
                        raise ValueError("Space is already occupied.")
                    else:
                        points_to_occupy.append(Point + (i, j, Point.z))
        else:
            raise ValueError("Position out of bounds.")

        # All empty. Store the brick in the map
        self.bricks[brick] = points_to_occupy  # Correctly store the brick as a key
        for point in points_to_occupy:
            self.map[point.x][point.y][point.z] = brick  # Place the brick in the map

    def remove_brick(self, x, y, z):
        """Remove a brick from the map at the specified position (x, y, z)."""
        if not self._point_in_bounds(x, y, z):
            raise ValueError("Position out of bounds.")

        brick = self.map[x][y][z]  # Retrieve the brick at the given position
        if not brick:
            raise ValueError("No brick found at the specified position.")

        points_to_clear = self.bricks.get(brick, [])
        if not points_to_clear:
            raise ValueError("No occupied positions found for the specified brick.")

        for point in points_to_clear:
            self.map[point.x][point.y][point.z] = None  # Clear the space on the map
        del self.bricks[brick]  # Remove the brick from the dictionary of bricks
        

    def _point_in_bounds(self, x, y, z):
        """Check if the given coordinates are within the map bounds."""
        return 0 <= x < self.width and 0 <= y < self.height and 0 <= z < self.depth

    def _brick_in_bounds(self, x, y, brick_width, brick_depth):
        """Check if the brick can fit in the map at the specified position."""
        return (x + brick_width - 1 < self.width and y - brick_depth < self.height)


    def describe_map(self):
        """Describe the map as a string showing non-empty positions."""
        description = "Brick Map:\n"
        for z in range(self.depth):
            description += f"Layer {z}:\n"
            for y in range(self.height):
                for x in range(self.width):
                    brick = self.map[x][y][z]
                    if brick:
                        description += f"({x}, {y}, {z}): {brick.describe()}\n"
        return description

# Create a BrickMap instance and add bricks to it
if __name__ == "__main__":
    # Draw the map in ASCII format. Use a simple representation for the bricks
    brick_map = BrickMap(5, 5, 1)
    red_brick = Brick("red", 2, 1)
    blue_brick = Brick("blue", 1, 1)

    # Add bricks to the map
    brick_map.add_brick(Point(0, 0, 0), red_brick)
    brick_map.add_brick(Point(2, 2, 0), blue_brick)

    # Describe the map
    print(brick_map.describe_map())

    # Remove a brick from the map
    brick_map.remove_brick(0, 0, 0)

    # Describe the map again
    print(brick_map.describe_map())
