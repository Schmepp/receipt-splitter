"""
Flask app that serves the web UI and receipt parsing endpoint.
"""

import base64
import json
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from PIL import Image
import io

import image_extraction


ROOT_DIR = Path(__file__).resolve().parent

app = Flask(__name__)

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)



@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/")
def index():
    return send_from_directory(ROOT_DIR, "index.html")


@app.route("/Bill-Scanner/")
def index_prefixed():
    return send_from_directory(ROOT_DIR, "index.html")


@app.route("/webapp.js")
@app.route("/Bill-Scanner/webapp.js")
def webapp_js():
    return send_from_directory(ROOT_DIR, "webapp.js")


@app.route("/parse-receipt", methods=["POST", "OPTIONS"])
@app.route("/Bill-Scanner/parse-receipt", methods=["POST", "OPTIONS"])
@limiter.limit("10 per minute")
def parse_receipt():
    if request.method == "OPTIONS":
        return jsonify({"ok": True})

    image_file = request.files.get("receipt")
    if image_file is None:
        return jsonify({"error": "No receipt image was uploaded."}), 400
    
    # Ensure file is actually a valid image for security and usability purposes
    try:
        img = Image.open(io.BytesIO(image_file.read()))
        img.verify()
        image_file.seek(0)  # reset file pointer for later read
    except Exception:
        return jsonify({"error": "File is not a valid image."}), 400
    
    try:
        image_data = base64.standard_b64encode(image_file.read()).decode("utf-8")
        media_type = image_file.content_type or "image/jpeg"
        response = image_extraction.extract_receipt_data(image_data, media_type)
        return jsonify(json.loads(response))
    except json.JSONDecodeError:
        return jsonify({"error": "The receipt parser returned invalid JSON."}), 502
    except Exception as exc:
        return jsonify({"error": str(exc) or "Unable to parse receipt."}), 500


if __name__ == "__main__":
    app.run(debug=False, port=5000)