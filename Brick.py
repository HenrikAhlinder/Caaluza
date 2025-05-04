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
