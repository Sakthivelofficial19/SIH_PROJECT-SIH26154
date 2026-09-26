# test_db.py
import sqlite3
import json
from datetime import datetime

conn = sqlite3.connect("transform_history.db")
cursor = conn.cursor()

# Dummy test data
sample_params = {
    "audience": "Executives",
    "tone": "Professional",
    "language": "English"
}
sample_results = {
    "advisory": {
        "status": "ok",
        "downloadUrl": "http://127.0.0.1:8000/downloads/advisory.pdf",
        "text": "Executive summary sample..."
    }
}

cursor.execute("""
    INSERT INTO transformations (
        timestamp, input_type, source_preview,
        selected_outputs, parameters_json, results_json
    ) VALUES (?, ?, ?, ?, ?, ?)
""", (
    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "text",
    "Sample source text for database verification",
    "advisory",
    json.dumps(sample_params),
    json.dumps(sample_results)
))

conn.commit()

# Read back
cursor.execute("SELECT id, timestamp, source_preview FROM transformations ORDER BY id DESC LIMIT 1")
row = cursor.fetchone()
print(f"Verified insertion! Row ID: {row[0]}, Time: {row[1]}, Preview: {row[2]}")

conn.close()