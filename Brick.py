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

# Generate a class that controls a map of bricks. The sizes are:
# 1x1, 1x2, 1x3, 1x4, 2x2, 2x4
# The colors are: red, black, green, yellow.
# The map is a 3D array of bricks. It starts with a bottom plate (z=0) and is sized 5x5
# AI!
