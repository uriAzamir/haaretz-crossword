# Haaretz Crossword Solver — CLAUDE.md

## Project overview

Mobile-friendly web app for solving Hebrew arrow crossword puzzles from Haaretz.
Users upload a PDF (one page) or PNG screenshot; OpenCV detects the grid and classifies
each cell as CLUE (light blue) or ANSWER (white); the frontend overlays an interactive
grid on top of the rendered image.

No AI/vision API — color detection only.

## Live URLs

- **Frontend**: https://haaretz-crossword.vercel.app
- **Backend**: https://haaretz-crossword.onrender.com

> Note: Render free tier spins down after inactivity. First request after idle may take ~30s.

## Architecture

```
haaretz-crossword/
├── backend/               Flask API + OpenCV grid detection
│   ├── app.py             API routes (/api/health, /api/analyze)
│   ├── grid_detector.py   OpenCV pipeline (detect grid, classify cells)
│   ├── requirements.txt   flask, flask-cors, opencv-python-headless, numpy, gunicorn, PyMuPDF
│   └── Procfile           gunicorn for Render
├── frontend/              React + Vite, mobile-first, RTL Hebrew
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── UploadScreen.jsx   file picker + API call (PDF or image)
│   │   │   ├── PuzzleScreen.jsx   image + overlay layout
│   │   │   ├── GridOverlay.jsx    positions cells over image (LTR to match OpenCV cols)
│   │   │   └── PuzzleCell.jsx     single cell (clue or answer, direction-aware highlight)
│   │   ├── hooks/
│   │   │   └── usePuzzleState.js  answers, activeCell, direction, localStorage
│   │   └── index.css
│   ├── vercel.json
│   └── .env.example
├── test_step0.py          Standalone OpenCV proof-of-concept (not part of app)
├── crossword_sample.png   Sample puzzle image for testing
├── CLAUDE.md              (this file)
└── STAGE1.md              Stage 1 build notes
```

## Grid detection algorithm (grid_detector.py)

1. Threshold grayscale image at 150 to isolate dark grid lines
2. Morphological open with long h/v kernels to extract full line segments
3. Project onto axes; use 5% of max to find grid bounding box
4. Extend 10px past bbox edges; lower threshold to 8% of max; find all divider lines
5. Gap-fill: if any spacing > 1.5x median, insert interpolated line(s) at expected position
6. Sample cell interior (inner 60%) in HSV; H 85-120 + S 25-210 + V 130-255 → CLUE

## API contract

```
POST /api/analyze
  multipart/form-data, field: "image" (PDF or image file)
  Response:
  {
    "rows": 22, "cols": 16,
    "bbox": { "x": 191, "y": 200, "width": 1834, "height": 2502 },
    "cells": [{ "row": 0, "col": 0, "type": "clue" }, ...],
    "image_base64": "data:image/png;base64,..."  // only present for PDF uploads
  }

GET /api/health  →  { "status": "ok" }
```

The `image_base64` field is included only for PDF uploads (since `<img>` cannot display
a PDF blob URL). The frontend uses it as the image source directly.

## PDF handling

- Backend detects PDF by filename extension or `%PDF` magic bytes
- PyMuPDF renders page 0 at 250 DPI → PNG bytes → passed to OpenCV pipeline
- Rendered PNG returned as base64 in the response for the frontend to display

## Solving interface

- **Across mode** (yellow highlight, orange right bar): auto-advances right-to-left (Hebrew RTL)
- **Down mode** (blue highlight, blue top bar): auto-advances top-to-bottom
- Tap a cell to activate it; tap the **same cell again** to toggle across ↔ down
- Backspace: clears current cell; if already empty, moves to previous cell and clears it
- Answers saved to localStorage (keyed by grid structure); survive page reload

## Grid overlay alignment

The backend returns `bbox` in original image pixel coordinates.
The frontend scales to rendered image size:

```js
left   = (bbox.x / natural.w) * rendered.w
top    = (bbox.y / natural.h) * rendered.h
width  = (bbox.width  / natural.w) * rendered.w
height = (bbox.height / natural.h) * rendered.h
```

The CSS grid uses `direction: ltr` to match OpenCV's left-to-right column numbering.

## Running locally

### Backend
```bash
cd backend
py -m pip install -r requirements.txt
py -m flask --app app run
# Listening on http://localhost:5000
```

### Frontend
```bash
cd frontend
cp .env.example .env          # VITE_API_URL defaults to http://localhost:5000
npm install
npm run dev
# Open http://localhost:5173
```

### Step 0 test (OpenCV only)
```bash
py -m pip install opencv-python numpy
py test_step0.py              # reads crossword_sample.png, writes step0_result.png
```

## Deployment

### Backend → Render
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app`
- Optional env var: `FRONTEND_URL=https://haaretz-crossword.vercel.app`

### Frontend → Vercel
- Root directory: `frontend`
- Framework preset: Vite
- Env var: `VITE_API_URL=https://haaretz-crossword.onrender.com`

## Python command on this machine

Use `py` (not `python`): e.g. `py test_step0.py`, `py -m pip install ...`
