"""
server.py - REST Bridge with Hybrid PostgreSQL/SQLite History Persistence for TransformAI
"""
import os
import shutil
import sqlite3
import json
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from file_handler import run_pipeline, OUTPUT_TYPES
from init_db import get_connection, setup_database

DATABASE_URL = os.environ.get("DATABASE_URL")
RENDER_EXTERNAL_URL = os.environ.get("RENDER_EXTERNAL_URL", "[https://sih-project-ps-154.onrender.com](https://sih-project-ps-154.onrender.com)")

app = FastAPI(title="TransformAI API")

# Ensure table schema is ready when server boots
setup_database()

# Enable CORS for frontend deployment (Vercel and local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Output directory for saving and serving downloadable deliverables
OUTPUT_DIR = os.path.abspath("./output_files")
os.makedirs(OUTPUT_DIR, exist_ok=True)
app.mount("/downloads", StaticFiles(directory=OUTPUT_DIR), name="downloads")


def save_transformation_record(
    input_type: str,
    source_preview: str,
    selected_outputs: list,
    parameters: dict,
    results: dict
) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    ph = "%s" if DATABASE_URL else "?"
    query = f"""
        INSERT INTO transformations (
            timestamp, input_type, source_preview,
            selected_outputs, parameters_json, results_json
        ) VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph})
    """
    
    if DATABASE_URL:
        query += " RETURNING id;"
        cursor.execute(query, (
            current_time,
            input_type,
            source_preview[:250],
            ",".join(selected_outputs),
            json.dumps(parameters),
            json.dumps(results)
        ))
        inserted_id = cursor.fetchone()[0]
    else:
        cursor.execute(query, (
            current_time,
            input_type,
            source_preview[:250],
            ",".join(selected_outputs),
            json.dumps(parameters),
            json.dumps(results)
        ))
        inserted_id = cursor.lastrowid

    conn.commit()
    conn.close()
    return inserted_id


# ---------------------------------------------------------------------------
# API ENDPOINTS
# ---------------------------------------------------------------------------

@app.post("/api/transform")
async def transform_endpoint(
    text_content: str = Form(""),
    outputs: str = Form(""),
    audience: str = Form("General Public"),
    tone: str = Form("Professional"),
    language: str = Form("English"),
    detail: str = Form("Detailed"),
    objective: str = Form("Inform"),
    description: str = Form(""),
    file: UploadFile = File(None)
):
    raw_outputs = [o.strip() for o in outputs.split(",") if o.strip()]

    # Map frontend 'text_file' to 'plain_summary'
    selected_outputs = [
        "plain_summary" if o == "text_file" else o
        for o in raw_outputs
        if (o in OUTPUT_TYPES or o == "text_file")
    ]
    selected_outputs = list(dict.fromkeys(selected_outputs))

    if not selected_outputs:
        raise HTTPException(status_code=400, detail="No valid deliverables selected.")

    batch_stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    temp_input_path = ""
    input_type = "text"
    source_preview = text_content.strip()

    try:
        if file and file.filename:
            input_type = os.path.splitext(file.filename)[1].lstrip(".").lower() or "file"
            source_preview = file.filename
            temp_input_path = os.path.join(OUTPUT_DIR, f"upload_{batch_stamp}_{file.filename}")
            with open(temp_input_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        else:
            temp_input_path = os.path.join(OUTPUT_DIR, f"temp_{batch_stamp}.txt")
            with open(temp_input_path, "w", encoding="utf-8") as f:
                f.write(text_content)

        raw_results = run_pipeline(
            file_path=temp_input_path,
            selected_outputs=selected_outputs,
            output_dir=OUTPUT_DIR,
            audience=audience,
            tone=tone,
            language=language,
            detail_level=detail.lower(),
            objective=objective,
            description=description
        )

        response_payload = {}
        for out_id in selected_outputs:
            if out_id in raw_results:
                item = raw_results[out_id]
                if item["status"] == "ok":
                    orig_file = item["deliverable"]
                    ext = os.path.splitext(orig_file)[1]
                    
                    versioned_name = f"{out_id}_{batch_stamp}{ext}"
                    versioned_path = os.path.join(OUTPUT_DIR, versioned_name)
                    
                    if os.path.exists(orig_file):
                        shutil.copy(orig_file, versioned_path)

                    payload = {
                        "status": "ok",
                        "text": item.get("text", ""),
                        "flags": item.get("flags", []),
                        "downloadUrl": f"{RENDER_EXTERNAL_URL}/downloads/{versioned_name}",
                        "filename": versioned_name
                    }
                    response_payload[out_id] = payload
                    if out_id == "plain_summary":
                        response_payload["text_file"] = payload
                else:
                    response_payload[out_id] = {"status": "error", "message": item["message"]}

        parameters_record = {
            "audience": audience,
            "tone": tone,
            "language": language,
            "detail": detail,
            "objective": objective,
            "description": description
        }

        record_id = save_transformation_record(
            input_type=input_type,
            source_preview=source_preview,
            selected_outputs=selected_outputs,
            parameters=parameters_record,
            results=response_payload
        )

        return {
            "success": True,
            "record_id": record_id,
            "results": response_payload
        }

    finally:
        if temp_input_path and os.path.exists(temp_input_path):
            try:
                os.remove(temp_input_path)
            except Exception:
                pass


@app.get("/api/history")
async def get_history(query: str = ""):
    """Fetch history entries with unified search across preview, date/time, and format."""
    conn = get_connection()
    if DATABASE_URL:
        from psycopg2.extras import RealDictCursor
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        ph = "%s"
    else:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        ph = "?"

    sql = """
        SELECT id, timestamp, input_type, source_preview, selected_outputs, parameters_json, results_json
        FROM transformations
    """
    if query.strip():
        search_pattern = f"%{query.strip()}%"
        sql += f" WHERE source_preview LIKE {ph} OR timestamp LIKE {ph} OR selected_outputs LIKE {ph}"
        cursor.execute(sql + " ORDER BY id DESC", (search_pattern, search_pattern, search_pattern))
    else:
        cursor.execute(sql + " ORDER BY id DESC")

    rows = cursor.fetchall()
    conn.close()

    history = []
    for r in rows:
        history.append({
            "id": r["id"],
            "timestamp": r["timestamp"],
            "inputType": r["input_type"],
            "sourcePreview": r["source_preview"],
            "selectedOutputs": [o for o in r["selected_outputs"].split(",") if o],
            "parameters": json.loads(r["parameters_json"]),
            "results": json.loads(r["results_json"])
        })

    return {"success": True, "history": history}


@app.delete("/api/history/{record_id}")
async def delete_history_item(record_id: int):
    """Delete a single history entry by ID."""
    conn = get_connection()
    cursor = conn.cursor()
    ph = "%s" if DATABASE_URL else "?"
    cursor.execute(f"DELETE FROM transformations WHERE id = {ph}", (record_id,))
    conn.commit()
    conn.close()
    return {"success": True, "deleted_id": record_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)