from flask import Flask, jsonify, request, render_template
app = Flask(__name__)

from Brick import Brick, BrickMap, Point
from Storage import MapStorage

storage = MapStorage()


@app.route('/')
def main_menu():
    """Main menu page with Play and Edit buttons."""
    return render_template('main.html')

@app.route('/edit')
def edit():
    """Edit menu."""
    return render_template('edit.html')

@app.route('/save-map', methods=['POST'])
def create_map():
    """Create a new map."""
    # Parse request JSON
    data = request.get_json()

    try:
        new_map = BrickMap.from_dict(data)  # Validate the data structure
    except Exception as e:
        return jsonify({'error': f'Invalid map data: {str(e)}'}), 400
    storage.save_map(data.get("map_id", "default_map"), new_map)  # Save the map in storage
    return jsonify({'message': 'Map created successfully', 'map_id': data.get("map_id", "default_map")}), 201

@app.route('/load/<string:map_id>', methods=['GET'])
def load_map(map_id):
    """Load an existing map."""
    map_data = storage.load_map(map_id)

    if not map_data:
        return jsonify({'error': 'Map not found'}), 404
    return jsonify({'map_id': map_id, 'map': map_data.to_dict()}), 200


if __name__ == '__main__':
    app.run(debug=True)