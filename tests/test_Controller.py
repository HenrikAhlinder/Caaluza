import unittest
from flask import Flask
from flask.testing import FlaskClient
from Controller import app, storage
from Brick import Brick, BrickMap, Point

class TestController(unittest.TestCase):
    def setUp(self):
        self.client: FlaskClient = app.test_client()  # Create a test client
        self.client.testing = True

        # Clear and reinitialize SQLite storage before each test
        storage.conn.execute("DELETE FROM maps")  # Clear the SQLite table
        storage.conn.commit()

    def test_create_map(self):
        brick_map = BrickMap(6, 6, 1)
        brick_map.add_brick(Point(0, 0, 0), Brick("red", 2, 1))
        brick_map.add_brick(Point(2, 2, 0), Brick("blue", 1, 1))

        response = self.client.post('/create-map', json={
            "map_id": "test_create_map",
            "map": brick_map.to_json()
        })

        data = response.get_json()
        self.assertEqual(response.status_code, 201)
        self.assertIn('map_id', data)
        self.assertEqual(data['message'], 'Map created successfully')

        stored_map = storage.load_map(data['map_id'])
        self.assertEqual(stored_map.to_json(), brick_map.to_json())

    def test_read_map(self):
        # First, create a map
        map_id = "map_1"
        brick_map = BrickMap(5, 5, 1)
        storage.save_map(map_id, brick_map)

        # Now read the map
        response = self.client.get(f'/read-map/{map_id}')
        data = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['map_id'], map_id)
        self.assertEqual(data["map"], brick_map.to_json())

    def test_update_map(self):
        # First, create a map
        map_id = "map_1"
        brick_map = BrickMap(5, 5, 1)
        storage.save_map(map_id, brick_map)

        # Update the map
        response = self.client.put(f'/update-map/{map_id}', json=brick_map.to_json())

        stored_map = storage.load_map(map_id)

        data = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['message'], f'Map with id {map_id} updated successfully')
        self.assertEqual(stored_map.to_json(), brick_map.to_json())
        self.assertEqual(stored_map.width, 6)
        self.assertEqual(stored_map.height, 6)

    def test_delete_map(self):
        # First, create a map
        map_id = "test_delete_map"
        brick_map = BrickMap(5, 5, 1)
        storage.save_map(map_id, brick_map)

        # Delete the map
        response = self.client.delete(f'/delete-map/{map_id}')
        data = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['message'], f'Map with id {map_id} deleted successfully')
        self.assertNotIn(map_id, storage.list_maps())

    def test_read_nonexistent_map(self):
        response = self.client.get('/read-map/nonexistent_id')
        data = response.get_json()
        self.assertEqual(response.status_code, 404)
        self.assertEqual(data['error'], 'Map with id nonexistent_id not found')


if __name__ == '__main__':
    unittest.main()
