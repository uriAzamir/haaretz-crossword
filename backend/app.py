"""
Flask API for the Haaretz crossword solver.
"""

import os
import base64
import fitz  # PyMuPDF
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


def pdf_to_image_bytes(pdf_bytes, dpi=250):
    """Render the third page (index 2) of a PDF to PNG bytes."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if len(doc) < 3:
        raise ValueError(f"PDF has only {len(doc)} page(s); expected at least 3")
    page = doc[2]
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
    return pix.tobytes("png")


@app.post("/api/analyze")
def analyze():
    if "image" not in request.files:
        return jsonify({"error": "Missing 'image' field in multipart form"}), 400

    file = request.files["image"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    raw = file.read()
    if len(raw) == 0:
        return jsonify({"error": "Empty file"}), 400

    # Convert PDF → image if needed
    is_pdf = file.filename.lower().endswith(".pdf") or raw[:4] == b"%PDF"
    if is_pdf:
        try:
            img_bytes = pdf_to_image_bytes(raw)
        except Exception as exc:
            return jsonify({"error": f"Could not read PDF: {exc}"}), 422
    else:
        img_bytes = raw

    try:
        result = analyze_image(img_bytes)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 422

    # For PDFs the browser can't display the original file as <img>,
    # so include the rendered PNG as base64 for the frontend to use directly.
    if is_pdf:
        result["image_base64"] = "data:image/png;base64," + base64.b64encode(img_bytes).decode()

    return jsonify(result)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
