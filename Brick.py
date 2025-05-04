class Brick:
    """
    A class to represent a LEGO-like brick.
    
    Attributes:
        color (str): The color of the brick.
        size (int): The size of the brick in standard LEGO units.
    """
    def __init__(self, color, size):
        self.color = color
        self.size = size

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

    def add_brick(self, x, y, z, brick):
        """Add a brick to the map at the specified position (x, y, z)."""
        # Each brick is two-dimensional, and not on a single spot. We need to reserve space for the entire brick.
        # This means that if the brick is 2x2, we need to reserve 4 spots in the map.
        brick_width = brick.size  # Assuming the brick's size represents its width (e.g., 2 for 2x2)
        brick_height = 1  # LEGO bricks are typically a single layer tall.

        if (
            0 <= x < self.width and 0 <= y < self.height and 0 <= z < self.depth and
            x + brick_width - 1 < self.width and y + brick_height - 1 < self.height
        ):
            for i in range(brick_width):  # Reserve horizontal block space
                for j in range(brick_height):  # Reserve vertical block space
                    if self.map[x + i][y + j][z] is not None:
                        raise ValueError("Space is already occupied.")
                    self.map[x + i][y + j][z] = brick
        else:
            raise ValueError("Position out of bounds.")

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
