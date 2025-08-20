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

    def to_dict(self):
        return {
            'x': self.x,
            'y': self.y,
            'z': self.z
        }

    @classmethod
    def from_dict(cls, data):
        return cls(x=data['x'], y=data['y'], z=data['z'])

    def __add__(self, other):
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
    points: list[Point]

    def to_dict(self):
        """Convert Brick to a dictionary."""
        return {
            'color': self.color,
            'points': [Point(x=p.x, y=p.y, z=p.z).to_dict() for p in self.points],
            'name': self.name,
        }

    @classmethod
    def from_dict(cls, data):
        points = [Point.from_dict(point) for point in data['points']]
        return cls(color=data['color'], points=points, name=data['name'])

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

    def validate(self):
        """Validate the BrickMap for consistency and correctness."""
        validation_errors = []
        occupied_points = {}  # Maps point tuple to brick index
        
        # Check for overlapping bricks
        for brick_idx, brick in enumerate(self.bricks):
            for point in brick.points:
                point_tuple = (point.x, point.y, point.z)
                if point_tuple in occupied_points:
                    overlapping_brick_idx = occupied_points[point_tuple]
                    validation_errors.append({
                        'type': 'overlap',
                        'message': f"Brick overlap detected at point ({point.x}, {point.y}, {point.z})",
                        'offending_bricks': [brick_idx, overlapping_brick_idx],
                        'point': (point.x, point.y, point.z)
                    })
                occupied_points[point_tuple] = brick_idx
        
        # Check that each brick is supported (secured to another piece or base)
        base_points = {(x, -1, z) for x in range(6) for z in range(6)}
        all_support_points = base_points.union(set(occupied_points.keys()))
        
        for brick_idx, brick in enumerate(self.bricks):
            is_supported = False
            for point in brick.points:
                if ((point.x, point.y - 1, point.z) in all_support_points or
                        (point.x, point.y + 1, point.z) in all_support_points):
                    is_supported = True
                    break
            
            if not is_supported:
                validation_errors.append({
                    'type': 'unsupported',
                    'message': f"Brick with points {[(p.x, p.y, p.z) for p in brick.points]} is not supported",
                    'offending_bricks': [brick_idx],
                    'points': [(p.x, p.y, p.z) for p in brick.points]
                })
        
        if validation_errors:
            return validation_errors
        return []
