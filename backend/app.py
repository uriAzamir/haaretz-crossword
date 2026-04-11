"""
Flask API for the Haaretz crossword solver.
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from grid_detector import analyze_image

app = Flask(__name__)

# Allow requests from any origin in development;
# in production, restrict to the Vercel frontend URL.
allowed_origins = os.environ.get("FRONTEND_URL", "*")
CORS(app, origins=allowed_origins)


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/analyze")
def analyze():
    if "image" not in request.files:
        return jsonify({"error": "Missing 'image' field in multipart form"}), 400

    file = request.files["image"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    img_bytes = file.read()
    if len(img_bytes) == 0:
        return jsonify({"error": "Empty file"}), 400

    try:
        result = analyze_image(img_bytes)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 422

    return jsonify(result)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
