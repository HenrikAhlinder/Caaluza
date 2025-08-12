import unittest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from Brick import Point, Brick, BrickMap

class TestPoint(unittest.TestCase):
    def test_to_dict(self):
        point = Point(1, 2, 3)
        self.assertEqual(point.to_dict(), {'x': 1, 'y': 2, 'z': 3})

    def test_from_dict(self):
        data = {'x': 1, 'y': 2, 'z': 3}
        point = Point.from_dict(data)
        self.assertEqual(point, Point(1, 2, 3))

    def test_add_point(self):
        point1 = Point(1, 2, 3)
        point2 = Point(4, 5, 6)
        self.assertEqual(point1 + point2, Point(5, 7, 9))

    def test_add_tuple(self):
        point = Point(1, 2, 3)
        self.assertEqual(point + (4, 5, 6), Point(5, 7, 9))


class TestBrick(unittest.TestCase):
    def test_to_dict(self):
        points = [Point(0, 0, 0), Point(1, 0, 0)]
        brick = Brick("red", "2x1 red", points)
        expected = {
            'color': 'red',
            'name': '2x1 red',
            'points': [{'x': 0, 'y': 0, 'z': 0}, {'x': 1, 'y': 0, 'z': 0}]
        }
        self.assertEqual(brick.to_dict(), expected)

    def test_from_dict(self):
        data = {
            'color': 'red',
            'name': '2x1 red',
            'points': [{'x': 0, 'y': 0, 'z': 0}, {'x': 1, 'y': 0, 'z': 0}]
        }
        brick = Brick.from_dict(data)
        self.assertEqual(brick.color, "red")
        self.assertEqual(brick.name, "2x1 red")
        self.assertEqual(len(brick.points), 2)
        self.assertEqual(brick.points[0], Point(0, 0, 0))
        self.assertEqual(brick.points[1], Point(1, 0, 0))


class TestBrickMap(unittest.TestCase):
    def setUp(self):
        self.brick_map = BrickMap(6, 1, 6, "Test Map", "2024-01-01T00:00:00")
        self.red_brick = Brick("red", "2x1 red", [Point(0, 0, 0), Point(1, 0, 0)])
        self.blue_brick = Brick("blue", "1x1 blue", [Point(0, 0, 0)])

    def test_to_dict(self):
        self.brick_map.bricks = [self.red_brick]
        dict_data = self.brick_map.to_dict()
        
        self.assertEqual(dict_data['metadata']['width'], 6)
        self.assertEqual(dict_data['metadata']['height'], 1)
        self.assertEqual(dict_data['metadata']['depth'], 6)
        self.assertEqual(dict_data['metadata']['name'], "Test Map")
        self.assertEqual(len(dict_data['bricks']), 1)
        self.assertEqual(dict_data['bricks'][0]['color'], "red")

    def test_from_dict(self):
        data = {
            'metadata': {
                'width': 6,
                'height': 1,
                'depth': 6,
                'name': "Test Map",
                'timestamp': "2024-01-01T00:00:00"
            },
            'bricks': [
                {
                    'color': 'red',
                    'name': '2x1 red',
                    'points': [{'x': 0, 'y': 0, 'z': 0}, {'x': 1, 'y': 0, 'z': 0}]
                }
            ]
        }
        
        brick_map = BrickMap.from_dict(data)
        self.assertEqual(brick_map.width, 6)
        self.assertEqual(brick_map.height, 1)
        self.assertEqual(brick_map.depth, 6)
        self.assertEqual(brick_map.name, "Test Map")
        self.assertEqual(len(brick_map.bricks), 1)
        self.assertEqual(brick_map.bricks[0].color, "red")

    def test_from_dict_missing_metadata(self):
        data = {'bricks': []}
        with self.assertRaises(ValueError) as context:
            BrickMap.from_dict(data)
        self.assertIn("Metadata is required", str(context.exception))

    def test_from_dict_missing_bricks(self):
        data = {
            'metadata': {
                'width': 6,
                'height': 1,
                'depth': 6,
                'name': "Test Map",
                'timestamp': "2024-01-01T00:00:00"
            },
            'bricks': []
        }
        with self.assertRaises(ValueError) as context:
            BrickMap.from_dict(data)
        self.assertIn("Bricks data is required", str(context.exception))


if __name__ == "__main__":
    unittest.main()
