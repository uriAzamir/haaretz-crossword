# Haaretz Crossword Solver — CLAUDE.md

## Project overview

Mobile-friendly web app for solving Hebrew arrow crossword puzzles from Haaretz.
Users upload a PNG screenshot; OpenCV detects the grid and classifies each cell;
the frontend overlays an interactive grid on top of the image.

No AI/vision API — color detection only.

## Architecture

```
haaretz-crossword/
├── backend/               Flask API + OpenCV grid detection
│   ├── app.py             API routes (/api/health, /api/analyze)
│   ├── grid_detector.py   OpenCV pipeline (detect grid, classify cells)
│   ├── requirements.txt
│   └── Procfile           gunicorn for Render
├── frontend/              React + Vite, mobile-first, RTL Hebrew
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── UploadScreen.jsx   file picker + API call
│   │   │   ├── PuzzleScreen.jsx   image + overlay layout
│   │   │   ├── GridOverlay.jsx    positions cells over image
│   │   │   └── PuzzleCell.jsx     single cell (clue or answer)
│   │   ├── hooks/
│   │   │   └── usePuzzleState.js  answers, activeCell, localStorage
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
4. Extend 10px past bbox, lower threshold to 8% of max, find all divider lines
5. Gap-fill: if any spacing > 1.5x median, insert interpolated line(s)
6. Sample cell interior (inner 60%) in HSV; H 85-120 + S 25-210 + V 130-255 → CLUE

## API contract

```
POST /api/analyze
  multipart/form-data, field: "image"
  Response:
  {
    "rows": 21, "cols": 16,
    "bbox": { "x": 45, "y": 71, "width": 453, "height": 594 },
    "cells": [{ "row": 0, "col": 0, "type": "clue" }, ...]
  }

GET /api/health  →  { "status": "ok" }
```

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
cp .env.example .env          # edit VITE_API_URL if needed (default: localhost:5000)
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

1. Push repo to GitHub
2. New Web Service on render.com
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `gunicorn app:app`
3. Add environment variable: `FRONTEND_URL=https://your-app.vercel.app`
4. Copy the Render URL (e.g. `https://haaretz-crossword-api.onrender.com`)

### Frontend → Vercel

1. New project on vercel.com, import GitHub repo
   - Root directory: `frontend`
   - Framework preset: Vite
2. Add environment variable: `VITE_API_URL=https://haaretz-crossword-api.onrender.com`
3. Deploy

## Python command on this machine

Use `py` (not `python`): e.g. `py test_step0.py`, `py -m pip install ...`
