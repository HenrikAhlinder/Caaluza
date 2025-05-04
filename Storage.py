import sqlite3
from Brick import BrickMap, Point, Brick

DB_FILE = "maps_store.sqlite"

class MapStorage:
    """Class to manage the storage of maps using SQLite."""

    def __init__(self):
        """Initialize the SQLite database."""
        self.conn = sqlite3.connect(DB_FILE)
        self._create_table()

    def _create_table(self):
        """Create the maps table if it doesn't already exist."""
        with self.conn:
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS maps (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL
                )
            """)

    def save_map(self, map_id, brick_map):
        """Save or update a map in the database."""
        with self.conn:
            self.conn.execute("""
                INSERT INTO maps (id, data) VALUES (?, ?)
                ON CONFLICT(id) DO UPDATE SET data=excluded.data
            """, (map_id, brick_map.to_json()))

    def load_map(self, map_id):
        """Load a map from the database by its ID."""
        cursor = self.conn.execute("SELECT data FROM maps WHERE id = ?", (map_id,))
        row = cursor.fetchone()
        if row:
            return BrickMap.from_json(row[0])
        return None

    def delete_map(self, map_id):
        """Delete a map from the database."""
        with self.conn:
            self.conn.execute("DELETE FROM maps WHERE id = ?", (map_id,))

    def list_maps(self):
        """List all map IDs in the database."""
        cursor = self.conn.execute("SELECT id FROM maps")
        return [row[0] for row in cursor.fetchall()]

if __name__ == "__main__":
    storage = MapStorage()
    # Example usage
    brick_map = BrickMap(5, 5, 1)
    brick_map.add_brick(Point(0, 0, 0), Brick("red", 2, 1))
    storage.save_map("map_1", brick_map)
    loaded_map = storage.load_map("map_1")
    print(loaded_map.to_json())  # Should print the JSON representation of the map
