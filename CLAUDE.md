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
3. Project onto axes; use 5% of max to find grid bounding box (`top`, `bottom`, `left`, `right`)
4. Search from `top`/`left` downward/rightward (+ 10px margin at end only) at 8% threshold; find all divider lines
5. Gap-fill: if any spacing > 1.5x median, insert interpolated line(s) at expected position
6. Sample cell interior (inner 60%) in HSV; H 85-120 + S 25-210 + V 130-255 → CLUE
7. Return `row_lines` and `col_lines` (exact pixel positions of every divider) alongside cells

Note: the search starts exactly at `top`/`left` (not before) to avoid picking up page
decorations or border artifacts above/left of the grid creating phantom rows/cols.

## API contract

```
POST /api/analyze
  multipart/form-data, field: "image" (PDF or image file)
  Response:
  {
    "rows": 22, "cols": 16,
    "bbox": { "x": 191, "y": 200, "width": 1834, "height": 2502 },
    "row_lines": [200, 314, 428, ...],   // absolute y-positions of every horizontal divider
    "col_lines": [191, 306, 421, ...],   // absolute x-positions of every vertical divider
    "cells": [{ "row": 0, "col": 0, "type": "clue" }, ...],
    "image_base64": "data:image/png;base64,..."  // only present for PDF uploads
  }

GET /api/health  →  { "status": "ok" }
```

The `image_base64` field is included only for PDF uploads (since `<img>` cannot display
a PDF blob URL). The frontend uses it as the image source directly.

## PDF handling

- Backend detects PDF by filename extension or `%PDF` magic bytes
- PyMuPDF renders **page 2 (index 2, the 3rd page)** at 250 DPI → PNG bytes → passed to OpenCV pipeline
- The Haaretz weekly PDF contains multiple games; the crossword is always on page 3
- Rendered PNG returned as base64 in the response for the frontend to display

## Solving interface

- Tapping a cell activates it and highlights the **entire current word** in gray
- The active cell itself gets a distinct darker gray outline/frame
- Tap the **same cell again** to toggle across ↔ down direction
- Auto-advances to the next cell within the same word only; stops at word boundary
- Backspace: clears current cell; if already empty, moves back within the same word only
- Active cell is always scrolled into view automatically
- Answers saved to localStorage (keyed by grid structure); survive page reload

## Grid overlay alignment

The backend returns `row_lines` and `col_lines` — the exact pixel positions of every
divider line in the original image. The frontend uses these to build a pixel-precise
CSS grid instead of equal `1fr` fractions:

```js
// Overlay positioned at first detected line, sized to span all lines
left   = col_lines[0] * scaleX
top    = row_lines[0] * scaleY
width  = (col_lines[last] - col_lines[0]) * scaleX
height = (row_lines[last] - row_lines[0]) * scaleY

// Each column/row sized exactly from the detected line spacings
gridTemplateColumns = "20px 31px 28px ..."   // one value per column
gridTemplateRows    = "22px 30px 29px ..."   // one value per row
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
