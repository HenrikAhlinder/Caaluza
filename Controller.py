from flask import Flask, jsonify, request, render_template
app = Flask(__name__)

from Brick import BrickMap
from Storage import MapStorage

storage = MapStorage()

colors = [
    {"name": "Yellow", "hex": 0xffff00},
    {"name": "Red", "hex": 0xff0000},
    {"name": "Blue", "hex": 0x0000ff},
    {"name": "Green", "hex": 0x00FF00}
]
sizes = [
    {"name": "1x1", "width": 1, "depth": 1},
    {"name": "1x2", "width": 1, "depth": 2},
    {"name": "1x3", "width": 1, "depth": 3},
    {"name": "1x4", "width": 1, "depth": 4},
    {"name": "2x2", "width": 2, "depth": 2},
    {"name": "2x3", "width": 2, "depth": 3},
    {"name": "2x4", "width": 2, "depth": 4}
]
views = [
    {"name": "Top", "position": {"x": 3, "y": 10, "z": 3}},
    {"name": "0 deg", "position": {"x": -15, "y": 0.0, "z": 3.0}},
    {"name": "90 deg", "position": {"x": 3, "y": 0.0, "z": 20}},
    {"name": "180 deg", "position": {"x": 20, "y": 0.0, "z": 3}},
    {"name": "270 deg", "position": {"x": 3, "y": 0.0, "z": -15}}
]

@app.route('/')
def main_menu():
    """Main menu page with Play and Edit buttons."""
    return render_template('main.html')

@app.route('/edit')
def edit():
    """Edit menu."""
    return render_template('edit.html', colors=colors, sizes=sizes, views=views)

@app.route('/save/<string:map_id>', methods=['POST'])
def save_map(map_id):
    """Save an existing map."""
    # Parse request JSON
    data = request.get_json()

    try:
        new_map = BrickMap.from_dict(data)  # Validate the data structure
    except Exception as e:
        return jsonify({'error': f'Invalid map data: {str(e)}'}), 400
    storage.save_map(map_id, new_map)  # Save the map in storage
    return jsonify({'message': 'Map created successfully', 'map_id': map_id}), 201

@app.route('/load/<string:map_id>', methods=['GET'])
def load_map(map_id):
    """Load an existing map."""
    map_data = storage.load_map(map_id)

    if not map_data:
        return jsonify({'error': 'Map not found'}), 404
    return jsonify({'map_id': map_id, 'map': map_data.to_dict()}), 200


if __name__ == '__main__':
    app.run(debug=True)