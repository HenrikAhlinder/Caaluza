from dataclasses import dataclass
import json

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

    def to_json(self):
        """Convert Point to a JSON-serializable dictionary."""
        return json.dumps({
            'x': self.x,
            'y': self.y,
            'z': self.z
        })

    @classmethod
    def from_dict(cls, data):
        """Create a Point instance from a JSON dictionary."""
        data = json.loads(data)
        return cls(x=data['x'], y=data['y'], z=data['z'])

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
        xs list[int]: X-coordinates the brick occupies.
        zs list[int]: Z-coordinates the brick occupies.
        color: The color of the brick.
        name: The name of the brick (optional).
    """
    color: str
    name: str
    xs: list[int]
    zs: list[int]
    y: int

    def to_dict(self):
        """Convert Brick to a dictionary."""
        return {
            'color': self.color,
            'xs': self.xs,
            'zs': self.zs,
            'y': self.y,
            'name': self.name,
        }

    @classmethod
    def from_json(cls, data):
        data = json.loads(data)
        return cls(color=data['color'], xs=data['xs'], zs=data['zs'], y=data['y'], name=data['name'])

    @classmethod
    def from_dict(cls, data):
        return cls(color=data['color'], xs=data['xs'], zs=data['zs'], y=data['y'], name=data['name'])

class BrickMap:
    """
    A class to control a map of LEGO-like bricks.

    Attributes:
        width (int): The width of the map.
        height (int): The height of the map.
        depth (int): The depth of the map.
        name (str): The name of the map.
        timestamp (datetime): The timestamp of the map creation.
        map (list): A 3D array of bricks. Starts with a bottom plate (z=0).
    """

    def to_dict(self):
        """Convert BrickMap to a JSON-serializable dictionary."""
        return {
            'metadata': {
                'width': self.width,
                'height': self.height,
                'depth': self.depth,
                'name': self.name,
                'timestamp': self.timestamp
            },
            'bricks': [brick.to_dict() for brick in self.bricks]
        }

    @classmethod
    def from_json(cls, data):
        data = json.loads(data)

        metadata = data.get('metadata', {})
        if len(metadata) == 0:
            raise ValueError("Metadata is required to create a BrickMap.")
        brick_map = cls(metadata["width"], metadata["height"], metadata["depth"], name=metadata["name"], timestamp=metadata["timestamp"])

        bricks = data.get('bricks', [])
        if not isinstance(bricks, list) or len(bricks) == 0:
            raise ValueError("Bricks data is required to create a BrickMap.")
        brick_map.bricks = [Brick.from_json(brick) for brick in bricks]

        return brick_map
    
    @classmethod
    def from_dict(cls, data):
        metadata = data.get('metadata', {})
        if len(metadata) == 0:
            raise ValueError("Metadata is required to create a BrickMap.")
        brick_map = cls(metadata["width"], metadata["height"], metadata["depth"], name=metadata["name"], timestamp=metadata["timestamp"])

        bricks = data.get('bricks', [])
        if not isinstance(bricks, list) or len(bricks) == 0:
            raise ValueError("Bricks data is required to create a BrickMap.")
        brick_map.bricks = [Brick.from_dict(brick) for brick in bricks]

        return brick_map

    def __init__(self, width=6, height=1, depth=6, name="Default Map", timestamp=None):
        self.width = width
        self.height = height
        self.depth = depth
        self.name = name
        self.timestamp = timestamp
        self.bricks = []