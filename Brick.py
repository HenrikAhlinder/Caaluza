class Brick:
    """
    A class to represent a LEGO-like brick.
    
    Attributes:
        color (str): The color of the brick.
        size (int): The size of the brick in standard LEGO units.
    """
    def __init__(self, color, size):
        self.color = color
        self.width, self.height = size

    def describe(self):
        """Return a string describing the brick."""
        return f"A {self.color} brick of size {self.size}."

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
        self.bricks = []  # List to keep track of added bricks

    def add_brick(self, x, y, z, brick, brick_width, brick_depth):
        """Add a brick to the map at the specified position (x, y, z)."""
        if (self._point_in_bounds(x, y, z) and self._brick_in_bounds(x, y, brick_width, brick_depth)):
            for i in range(brick_width):  # Reserve horizontal block space
                for j in range(brick_depth):  # Reserve depth-wise space as well
                    if self.map[x + i][y + j][z] is not None:
                        raise ValueError("Space is already occupied.")
                # Ensure all positions are empty before adding the brick
            for i in range(brick_width):
                for j in range(brick_depth):
                    self.map[x + i][y + j][z] = brick
        else:
            raise ValueError("Position out of bounds.")
        self.bricks.append(brick)  # Keep track of the added brick

    def _point_in_bounds(self, x, y, z):
        """Check if the given coordinates are within the map bounds."""
        return 0 <= x < self.width and 0 <= y < self.height and 0 <= z < self.depth

    def _brick_in_bounds(self, x, y, brick_width, brick_depth):
        """Check if the brick can fit in the map at the specified position."""
        return (x + brick_width - 1 < self.width and y - brick_depth < self.height)

    def remove_brick(self, x, y, z):
        """Remove a brick from the map at the specified position (x, y, z)."""
        if 0 <= x < self.width and 0 <= y < self.height and 0 <= z < self.depth:
            self.map[x][y][z] = None
        else:
            raise ValueError("Position out of bounds.")

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
