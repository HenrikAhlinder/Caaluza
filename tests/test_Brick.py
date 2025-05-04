import unittest
from ..Brick import Point, Brick, BrickMap

class TestPoint(unittest.TestCase):
    def test_to_json(self):
        point = Point(1, 2, 3)
        self.assertEqual(point.to_json(), {'x': 1, 'y': 2, 'z': 3})

    def test_from_json(self):
        data = {'x': 1, 'y': 2, 'z': 3}
        point = Point.from_json(data)
        self.assertEqual(point, Point(1, 2, 3))

    def test_add_point(self):
        point1 = Point(1, 2, 3)
        point2 = Point(4, 5, 6)
        self.assertEqual(point1 + point2, Point(5, 7, 9))

    def test_add_tuple(self):
        point = Point(1, 2, 3)
        self.assertEqual(point + (4, 5, 6), Point(5, 7, 9))


class TestBrick(unittest.TestCase):
    def test_to_json(self):
        brick = Brick("red", 2, 1)
        self.assertEqual(brick.to_json(), {'color': 'red', 'width': 2, 'depth': 1})

    def test_from_json(self):
        data = {'color': 'red', 'width': 2, 'depth': 1}
        brick = Brick.from_json(data)
        self.assertEqual(brick, Brick("red", 2, 1))

    def test_describe(self):
        brick = Brick("blue", 1, 1)
        self.assertEqual(brick.describe(), "A blue brick of size 1x1.")

    def test_hash(self):
        brick1 = Brick("red", 2, 1)
        brick2 = Brick("red", 2, 1)
        brick3 = Brick("red", 2, 2)
        brick4 = Brick("blue", 2, 1)
        self.assertEqual(hash(brick1), hash(brick2))
        self.assertNotEqual(hash(brick1), hash(brick3))
        self.assertNotEqual(hash(brick1), hash(brick4))


class TestBrickMap(unittest.TestCase):
    def setUp(self):
        self.brick_map = BrickMap(5, 5, 1)
        self.red_brick = Brick("red", 2, 1)
        self.blue_brick = Brick("blue", 1, 1)

    def test_to_json(self):
        self.brick_map.add_brick(Point(0, 0, 0), self.red_brick)
        json_data = self.brick_map.to_json()
        self.assertEqual(json_data['width'], 5)
        self.assertEqual(json_data['height'], 5)
        self.assertEqual(json_data['depth'], 1)

    def test_from_json(self):
        self.brick_map.add_brick(Point(0, 0, 0), self.red_brick)
        json_data = self.brick_map.to_json()
        new_brick_map = BrickMap.from_json(json_data)
        self.assertEqual(new_brick_map.width, 5)
        self.assertEqual(new_brick_map.height, 5)
        self.assertEqual(new_brick_map.depth, 1)

    def test_add_brick(self):
        self.brick_map.add_brick(Point(0, 0, 0), self.red_brick)
        self.assertEqual(
            self.brick_map.map[0][0][0], self.red_brick
        )  # Check if the brick is placed

    def test_add_brick_out_of_bounds(self):
        with self.assertRaises(ValueError):
            self.brick_map.add_brick(Point(10, 10, 0), self.red_brick)

    def test_add_brick_occupied_space(self):
        self.brick_map.add_brick(Point(0, 0, 0), self.red_brick)
        with self.assertRaises(ValueError):
            self.brick_map.add_brick(Point(0, 0, 0), self.blue_brick)

    def test_remove_brick(self):
        self.brick_map.add_brick(Point(0, 0, 0), self.red_brick)
        self.brick_map.remove_brick(0, 0, 0)
        self.assertIsNone(self.brick_map.map[0][0][0])  # Ensure the space is cleared

    def test_remove_brick_not_found(self):
        with self.assertRaises(ValueError):
            self.brick_map.remove_brick(0, 0, 0)


if __name__ == "__main__":
    unittest.main()
