import unittest
from flask import Flask
from flask.testing import FlaskClient
from Controller import app, storage
from Brick import Brick, BrickMap, Point

class TestController(unittest.TestCase):
    def setUp(self):
        self.client: FlaskClient = app.test_client()  # Create a test client
        self.client.testing = True
        storage.maps_store.clear()  # Clear the storage before each test

    def test_create_map(self):
        response = self.client.post('/create-map', json={
            "width": 5,
            "height": 5,
            "depth": 1,
            "map": []
        })
        data = response.get_json()
        self.assertEqual(response.status_code, 201)
        self.assertIn('map_id', data)
        self.assertEqual(data['message'], 'Map created successfully')

    def test_read_map(self):
        # First, create a map
        map_id = "map_1"
        brick_map = BrickMap(5, 5, 1)
        storage.maps_store[map_id] = brick_map

        # Now read the map
        response = self.client.get(f'/read-map/{map_id}')
        data = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['map_id'], map_id)
        self.assertIn('description', data)

    def test_update_map(self):
        # First, create a map
        map_id = "map_1"
        brick_map = BrickMap(5, 5, 1)
        storage.maps_store[map_id] = brick_map

        # Update the map
        response = self.client.put(f'/update-map/{map_id}', json={
            "width": 6,
            "height": 6,
            "depth": 1,
            "map": []
        })
        data = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['message'], f'Map with id {map_id} updated successfully')
        self.assertEqual(storage.maps_store[map_id].width, 6)
        self.assertEqual(storage.maps_store[map_id].height, 6)

    def test_delete_map(self):
        # First, create a map
        map_id = "map_1"
        brick_map = BrickMap(5, 5, 1)
        storage.maps_store[map_id] = brick_map

        # Delete the map
        response = self.client.delete(f'/delete-map/{map_id}')
        data = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['message'], f'Map with id {map_id} deleted successfully')
        self.assertNotIn(map_id, storage.maps_store)

    def test_read_nonexistent_map(self):
        response = self.client.get('/read-map/nonexistent_id')
        data = response.get_json()
        self.assertEqual(response.status_code, 404)
        self.assertEqual(data['error'], 'Map with id nonexistent_id not found')


if __name__ == '__main__':
    unittest.main()
