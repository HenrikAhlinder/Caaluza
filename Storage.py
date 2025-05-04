import os
import json

PERSIST_FILE = "maps_store.json"

class MapStorage:
    """Class to manage the storage of maps."""
    # File to persist maps
    maps_store = {}

    def __init__(self):
        # Persistent store for created maps
        if os.path.exists(PERSIST_FILE):
            with open(PERSIST_FILE, "r") as f:
                self.maps_store = json.load(f)
        else:
            self.maps_store = {}

    # Save maps to file on shutdown
    def save_maps(self):
        with open(PERSIST_FILE, "w") as f:
            json.dump(self.maps_store, f)
