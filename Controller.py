from flask import Flask, jsonify, request, render_template
app = Flask(__name__)

from Brick import BrickMap, Brick
from Storage import MapStorage

from datetime import datetime

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
    {"name": "North", "position": {"x": 3, "y": 0.0, "z": -20}},
    {"name": "South", "position": {"x": 3, "y": 0.0, "z": 20}},
    {"name": "West", "position": {"x": -20, "y": 0.0, "z": 3.0}},
    {"name": "East", "position": {"x": 20, "y": 0.0, "z": 3}},
]

# TODO: Remove this and replace with sane overwrite solution
last_failed_save_attempt: dict[str, datetime] = {}

@app.route('/')
def main_menu():
    """Main menu page with Play and Edit buttons."""
    return render_template('main.html')

@app.route('/play')
def play():
    """Play mode - select map and camera view."""
    map_ids = [map for map in storage.list_maps()]
    maps = []
    for map_id in map_ids:
        maps.append({
            'id': map_id
        })
    return render_template('play.html', maps=maps, views=views)

@app.route('/select')
def select_map():
    """Map selection page."""
    map_ids = [map for map in storage.list_maps()]
    maps = []
    for map_id in map_ids:
        maps.append({
            'id': map_id
        })
    return render_template('map_select.html', maps=maps)

@app.route('/edit')
def create_new_map():
    return render_template('edit.html', colors=colors, sizes=sizes, views=views, mode="edit")

@app.route('/show/<string:map_id>')
def show_map(map_id):
    map_data = storage.load_map(map_id)

    view = request.args.get('view')
    mode = request.args.get('mode', 'edit')

    if not map_data:
        return jsonify({'error': 'Map not found'}), 404
    return render_template('edit.html', colors=colors, sizes=sizes, views=views, 
                           existing_map={'map_id': map_id, 'map': map_data.to_dict()},
                           view=view, mode=mode)

@app.route('/map/<string:map_id>', methods=['POST'])
def save_map(map_id: str):
    """Save an existing map."""
    # Parse request JSON
    data = request.get_json()
    map_id = map_id.strip().lower()

    if map_id in storage.list_maps():
        current_time = datetime.now()
        last_saved = last_failed_save_attempt.get(map_id, None)
        if last_saved is None or (current_time - last_saved).total_seconds() > 30:
            last_failed_save_attempt[map_id] = datetime.now()
            return jsonify({'error': 'Map ID already exists. Save again if you want to overwrite'}), 400

    try:
        new_map = BrickMap.from_dict(data)
    except Exception as e:
        return jsonify({'error': f'Invalid map data: {str(e)}'}), 400
    storage.save_map(map_id, new_map)
    return jsonify({'message': 'Map created successfully', 'map_id': map_id}), 201


@app.route('/map/<string:map_id>', methods=['GET'])
def load_map(map_id):
    """Load an existing map."""
    map_data = storage.load_map(map_id)
    map_id = map_id.strip().lower()

    if not map_data:
        return jsonify({'error': 'Map not found'}), 404
    return jsonify({'map_id': map_id, 'map': map_data.to_dict()}), 200


@app.route('/generate', methods=['GET'])
def generate_map():
    from Mapgenerator.Mapgenerator import generate_map as genmap

    map_data = genmap()

    bricks: list[Brick] = []
    for brickdef in map_data:
        xs = [p.x for p in brickdef.points]
        zs = [p.z for p in brickdef.points]
        y = [p.y for p in brickdef.points][0]

        width = abs(min(xs) - max(xs)) + 1
        depth = abs(min(zs) - max(zs)) + 1
        width, depth = min(width, depth), max(width, depth)
        newbrick = Brick(brickdef.color, f"{width}x{depth} {brickdef.color}", list(brickdef.points))

        bricks.append(newbrick)

    if not bricks:
        return jsonify({'error': 'No bricks generated'}), 404

    brickmap = BrickMap(name = "Generated map")
    brickmap.bricks = bricks
    return jsonify({'map_id': "generated_map", 'map': brickmap.to_dict()}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
