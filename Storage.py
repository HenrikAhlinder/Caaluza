import sqlite3
from Brick import BrickMap, Point, Brick
import json

DB_FILE = os.environ.get(
    "MAPS_DB_PATH",
    os.path.join(os.path.dirname(__file__), "maps_store.sqlite")
)

class MapStorage:
    """Class to manage the storage of maps using SQLite."""

    def __init__(self):
        """Initialize the SQLite database."""
        self._create_table()

    def _create_table(self):
        """Create the maps table if it doesn't already exist."""
        conn = sqlite3.connect(DB_FILE)
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS maps (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    author TEXT
                )
            """)

    def save_map(self, map_id, author, brick_map):
        """Save or update a map in the database."""
        conn = sqlite3.connect(DB_FILE)
        with conn:
            conn.execute("""
                INSERT INTO maps (id, data, author) VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET data=excluded.data, author=excluded.author""", 
                 (map_id, json.dumps(brick_map.to_dict()), author))

    def load_map(self, map_id):
        """Load a map from the database by its ID."""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.execute("SELECT data FROM maps WHERE id = ?", (map_id,))
        row = cursor.fetchone()
        if row is not None:
            return BrickMap.from_dict(json.loads(row[0]))
        return None

    def delete_map(self, map_id):
        """Delete a map from the database."""
        conn = sqlite3.connect(DB_FILE)
        with conn:
            conn.execute("DELETE FROM maps WHERE id = ?", (map_id,))

    def list_maps(self):
        """List all map IDs in the database."""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.execute("SELECT id FROM maps")
        return [row[0] for row in cursor]
