# init_db.py
import sqlite3
import os

DB_NAME = "transform_history.db"

def setup_database():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transformations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            input_type TEXT NOT NULL,
            source_preview TEXT NOT NULL,
            selected_outputs TEXT NOT NULL,
            parameters_json TEXT NOT NULL,
            results_json TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()
    print(f"Database initialized: {os.path.abspath(DB_NAME)}")

if __name__ == "__main__":
    setup_database()