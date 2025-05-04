from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/create_map', methods=['POST'])
def create_map():
    """
    Create a new map.
    
    Returns:
        JSON response confirming map creation.
    """
    return jsonify({'message': 'Map created successfully'}), 201

@app.route('/read_map/<map_id>', methods=['GET'])
def read_map(map_id):
    """
    Retrieve a map by its ID.

    Args:
        map_id (str): The ID of the map to retrieve.

    Returns:
        JSON response with the retrieved map details.
    return jsonify({'message': f'Retrieved map with id {map_id}'})

@app.route('/update_map/<map_id>', methods=['PUT'])
def update_map(map_id):
    """
    Update a map by its ID.

    Args:
        map_id (str): The ID of the map to update.

    Returns:
        JSON response confirming map update.
    """
    return jsonify({'message': f'Map with id {map_id} updated successfully'})

@app.route('/delete_map/<map_id>', methods=['DELETE'])
def delete_map(map_id):
    """
    Delete a map by its ID.

    Args:
        map_id (str): The ID of the map to delete.

    Returns:
        JSON response confirming map deletion.
    return jsonify({'message': f'Map with id {map_id} deleted successfully'})

if __name__ == '__main__':
    app.run(debug=True)
