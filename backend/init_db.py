import os
import sqlite3

DATABASE_URL = os.environ.get("DATABASE_URL")

def get_connection():
    if DATABASE_URL:
        import psycopg2
        return psycopg2.connect(DATABASE_URL)
    return sqlite3.connect("transform_history.db")

def setup_database():
    conn = get_connection()
    cursor = conn.cursor()
    
    if DATABASE_URL:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transformations (
                id SERIAL PRIMARY KEY,
                timestamp TEXT NOT NULL,
                input_type TEXT NOT NULL,
                source_preview TEXT NOT NULL,
                selected_outputs TEXT NOT NULL,
                parameters_json TEXT NOT NULL,
                results_json TEXT NOT NULL
            );
        """)
    else:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transformations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                input_type TEXT NOT NULL,
                source_preview TEXT NOT NULL,
                selected_outputs TEXT NOT NULL,
                parameters_json TEXT NOT NULL,
                results_json TEXT NOT NULL
            );
        """)
    conn.commit()
    conn.close()

if __name__ == "__main__":
    setup_database()