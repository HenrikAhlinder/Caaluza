import unittest
from Brick import BrickMap, Brick, Point

class TestBrickMap(unittest.TestCase):
    
    def setUp(self):
        """Set up a BrickMap instance and some bricks for testing."""
        self.brick_map = BrickMap(5, 5, 1)
        self.red_brick = Brick("red", 2, 1)
        self.blue_brick = Brick("blue", 1, 1)

    def test_add_brick(self):
        """Test adding a brick to the map."""
        point = Point(0, 0, 0)
        self.brick_map.add_brick(point, self.red_brick)
        self.assertEqual(self.brick_map.map[0][0][0], self.red_brick)
        self.assertEqual(self.brick_map.map[1][0][0], self.red_brick)

    def test_add_brick_out_of_bounds(self):
        """Test adding a brick out of bounds."""
        point = Point(4, 4, 0)
        with self.assertRaises(ValueError):
            self.brick_map.add_brick(point, self.red_brick)

    def test_add_brick_space_occupied(self):
        """Test adding a brick to an already occupied space."""
        point1 = Point(0, 0, 0)
        point2 = Point(1, 0, 0)
        self.brick_map.add_brick(point1, self.red_brick)
        with self.assertRaises(ValueError):
            self.brick_map.add_brick(point2, self.blue_brick)

    def test_remove_brick(self):
        """Test removing a brick from the map."""
        point = Point(0, 0, 0)
        self.brick_map.add_brick(point, self.red_brick)
        self.brick_map.remove_brick(0, 0, 0)
        self.assertIsNone(self.brick_map.map[0][0][0])
        self.assertIsNone(self.brick_map.map[1][0][0])

    def test_remove_brick_not_found(self):
        """Test removing a brick from an empty position."""
        with self.assertRaises(ValueError):
            self.brick_map.remove_brick(0, 0, 0)

    def test_describe_map(self):
        """Test describing the map."""
        point = Point(0, 0, 0)
        self.brick_map.add_brick(point, self.red_brick)
        point2 = Point(2, 2, 0)
        self.brick_map.add_brick(point2, self.blue_brick)
        description = self.brick_map.describe_map()
        self.assertIn("A red brick", description)
        self.assertIn("A blue brick", description)

if __name__ == "__main__":
    unittest.main()
