import os
import json
from Brick import BrickMap

PERSIST_FILE = "maps_store.json"

class MapStorage:
    """Class to manage the storage of maps."""
    # File to persist maps
    maps_store = {}

    def __init__(self):
        # Persistent store for created maps
        if os.path.exists(PERSIST_FILE):
            with open(PERSIST_FILE, "r") as f:
                serialized_maps = json.load(f)
                # Deserialize BrickMap objects
                self.maps_store = {map_id: BrickMap.from_json(data) for map_id, data in serialized_maps.items()}
        else:
            self.maps_store = {}

    # Save maps to file on shutdown
    def save_maps(self):
        with open(PERSIST_FILE, "w") as f:
            # Serialize BrickMap objects to JSON-compatible dictionaries
            serialized_maps = {map_id: brick_map.to_json() for map_id, brick_map in self.maps_store.items()}
            json.dump(serialized_maps, f)
