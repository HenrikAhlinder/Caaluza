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
    # storage.save_map(data.get("map_id", "default_map"), new_map)  # Save the map in storage
    print(new_map.to_json())

    return jsonify({'message': 'Map created successfully', 'map_id': data.get("map_id", "default_map")}), 201

if __name__ == '__main__':
    app.run(debug=True)