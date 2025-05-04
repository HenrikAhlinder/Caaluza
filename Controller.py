from flask import Flask, jsonify, request

app = Flask(__name__)

from Brick import Brick, BrickMap, Point

# In-memory store for created maps
maps_store = {}

@app.route('/create-map', methods=['POST'])
def create_map():
    """
    Create a new map.
    
    Returns:
        JSON response confirming map creation.
    """
    # Parse request JSON
    data = request.get_json()
    width = data.get("width", 5)
    height = data.get("height", 5)
    depth = data.get("depth", 1)
    
    # Create a new BrickMap instance
    new_map = BrickMap(width, height, depth)

    # Add a couple of bricks to demonstrate functionality
    red_brick = Brick("red", 2, 1)
    blue_brick = Brick("blue", 1, 1)
    new_map.add_brick(Point(0, 0, 0), red_brick)
    new_map.add_brick(Point(2, 2, 0), blue_brick)
    
    # Generate unique map ID and store map
    map_id = f"map_{len(maps_store) + 1}"
    maps_store[map_id] = new_map

    return jsonify({'message': 'Map created successfully', 'map_id': map_id}), 201

@app.route('/read-map/<map_id>', methods=['GET'])
def read_map(map_id):
    """
    Retrieve a map by its ID.

    Args:
        map_id (str): The ID of the map to retrieve.

    Returns:
        JSON response with the retrieved map details.
    """
    # Retrieve map from store AI!
    return jsonify({'message': f'Retrieved map with id {map_id}'})

@app.route('/update-map/<map_id>', methods=['PUT'])
def update_map(map_id):
    """
    Update a map by its ID.

    Args:
        map_id (str): The ID of the map to update.

    Returns:
        JSON response confirming map update.
    """
    return jsonify({'message': f'Map with id {map_id} updated successfully'})

@app.route('/delete-map/<map_id>', methods=['DELETE'])
def delete_map(map_id):
    """
    Delete a map by its ID.

    Args:
        map_id (str): The ID of the map to delete.

    Returns:
        JSON response confirming map deletion.
    """
    return jsonify({'message': f'Map with id {map_id} deleted successfully'})

if __name__ == '__main__':
    app.run(debug=True)
