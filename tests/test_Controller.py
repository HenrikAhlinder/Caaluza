import unittest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from flask import Flask
from flask.testing import FlaskClient
from Controller import app, storage, last_failed_save_attempt
from Brick import Brick, BrickMap, Point

class TestController(unittest.TestCase):
    def setUp(self):
        self.client: FlaskClient = app.test_client()  # Create a test client
        self.client.testing = True
        app.config['TESTING'] = True

        # Clear all maps from storage before each test
        for map_id in storage.list_maps():
            storage.delete_map(map_id)
        
        # Clear the failed save attempt tracking
        last_failed_save_attempt.clear()

    def test_save_map(self):
        brick_map = BrickMap(6, 1, 6, "Test Map", "2024-01-01T00:00:00")
        red_brick = Brick("red", "2x1 red", [Point(0, 0, 0), Point(1, 0, 0)])
        blue_brick = Brick("blue", "1x1 blue", [Point(2, 0, 2)])
        brick_map.bricks = [red_brick, blue_brick]

        response = self.client.post('/map/test_save_map', json=brick_map.to_dict())

        data = response.get_json()
        self.assertEqual(response.status_code, 201)
        self.assertIn('map_id', data)
        self.assertEqual(data['message'], 'Map created successfully')

        stored_map = storage.load_map(data['map_id'])
        self.assertEqual(stored_map.to_dict(), brick_map.to_dict())

    def test_load_map(self):
        # First, create a map
        map_id = "test_load_map"
        brick_map = BrickMap(6, 1, 6, "Test Map", "2024-01-01T00:00:00")
        red_brick = Brick("red", "2x1 red", [Point(0, 0, 0), Point(1, 0, 0)])
        brick_map.bricks = [red_brick]
        storage.save_map(map_id, brick_map)

        # Now load the map
        response = self.client.get(f'/map/{map_id}')
        data = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['map_id'], map_id)
        self.assertEqual(data["map"], brick_map.to_dict())

    def test_overwrite_map_protection(self):
        # First, create a map via HTTP endpoint
        map_id = "test_overwrite"
        brick_map = BrickMap(6, 1, 6, "Test Map", "2024-01-01T00:00:00")
        red_brick = Brick("red", "2x1 red", [Point(0, 0, 0), Point(1, 0, 0)])
        brick_map.bricks = [red_brick]
        
        # Save the map initially
        response = self.client.post(f'/map/{map_id}', json=brick_map.to_dict())
        self.assertEqual(response.status_code, 201)

        # Try to save again - should get error first time
        response = self.client.post(f'/map/{map_id}', json=brick_map.to_dict())
        data = response.get_json()
        self.assertEqual(response.status_code, 400)
        self.assertIn('already exists', data['error'])

        # Save again immediately - should succeed since we already recorded the first attempt
        response = self.client.post(f'/map/{map_id}', json=brick_map.to_dict())
        data = response.get_json()
        self.assertEqual(response.status_code, 201)
        self.assertIn('Map created successfully', data['message'])

    def test_generate_map(self):
        # Test the generate endpoint
        response = self.client.get('/generate')
        data = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertIn('map_id', data)
        self.assertEqual(data['map_id'], 'generated_map')
        self.assertIn('map', data)
        self.assertIn('bricks', data['map'])
        self.assertIn('metadata', data['map'])
        self.assertEqual(data['map']['metadata']['name'], 'Generated map')

    def test_load_nonexistent_map(self):
        response = self.client.get('/map/nonexistent_id')
        data = response.get_json()
        self.assertEqual(response.status_code, 404)
        self.assertEqual(data['error'], 'Map not found')

    def test_main_menu_route(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)

    def test_edit_route(self):
        response = self.client.get('/edit')
        self.assertEqual(response.status_code, 200)

    def test_save_invalid_map_data(self):
        # Test saving with invalid data structure
        response = self.client.post('/map/test_invalid', json={'invalid': 'data'})
        data = response.get_json()
        self.assertEqual(response.status_code, 400)
        self.assertIn('Invalid map data', data['error'])


if __name__ == '__main__':
    unittest.main()
