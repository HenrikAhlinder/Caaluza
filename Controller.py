from flask import Flask, jsonify, request
app = Flask(__name__)

from Brick import Brick, BrickMap, Point
from Storage import MapStorage

storage = MapStorage()

@app.route('/create-map', methods=['POST'])
def create_map():
    """Create a new map."""
    # Parse request JSON
    data = request.get_json()
    map_id = request.args.get('map_id', None)
    brick_map = data.get('map', None)
    try:
        new_map = BrickMap.from_json(brick_map)  # Validate the data structure
    except:
        return jsonify({'error': 'Invalid map data'}), 400

    # Generate unique map ID and store map
    storage.save_map(map_id, new_map)  # Save the map in storage
    return jsonify({'message': 'Map created successfully', 'map_id': map_id}), 201

@app.route('/read-map/<map_id>', methods=['GET'])
def read_map(map_id):
    """Retrieve a map by its ID."""
    # Retrieve map from store
    brick_map = storage.load_map(map_id)
    if brick_map is None:
        return jsonify({'error': f'Map with id {map_id} not found'}), 404

    return jsonify({'map_id': map_id, 'map': brick_map.to_json()}), 200

@app.route('/update-map/<map_id>', methods=['PUT'])
def update_map(map_id):
    """Update a map by its ID."""
    data = request.get_json()
    brick_map = BrickMap.from_json(data)
    storage.save_map(map_id, brick_map)
    return jsonify({'message': f'Map with id {map_id} updated successfully'})

@app.route('/delete-map/<map_id>', methods=['DELETE'])
def delete_map(map_id):
    """Delete a map by its ID."""
    storage.delete_map(map_id)
    return jsonify({'message': f'Map with id {map_id} deleted successfully'})


@app.route('/read-map/dummy', methods=['GET'])
def get_dummy_map():
    # Create a new BrickMap instance
    new_map = BrickMap(5, 5, 1)

    # Add a couple of bricks to demonstrate functionality
    red_brick = Brick("red", 2, 1)
    blue_brick = Brick("blue", 1, 1)
    new_map.add_brick(Point(0, 0, 0), red_brick)
    new_map.add_brick(Point(2, 2, 0), blue_brick)
    
    return new_map.to_json(), 201

@app.route('/create-map/dummy', methods=['POST'])
def create_dummy_map():
    # Create a new BrickMap instance
    new_map = BrickMap(5, 5, 1)
    map_id = "dummy_map_id"

    # Add a couple of bricks to demonstrate functionality
    red_brick = Brick("red", 2, 1)
    blue_brick = Brick("blue", 1, 1)
    new_map.add_brick(Point(0, 0, 0), red_brick)
    new_map.add_brick(Point(2, 2, 0), blue_brick)
    
    # Generate unique map ID and store map
    storage.save_map(map_id, new_map)
    return jsonify({'message': 'Map created successfully', 'map_id': map_id}), 201

if __name__ == '__main__':
    app.run(debug=True)