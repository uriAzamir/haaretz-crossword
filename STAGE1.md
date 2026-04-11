# Stage 1 — Complete Build

## What was built

### Step 0 — OpenCV proof-of-concept
- `test_step0.py`: standalone script that loads a PNG, detects the grid, classifies
  each cell as CLUE (light blue) or ANSWER (white), and saves an annotated result image.
- Key finding: two grid lines were missing from projection peaks due to thin/broken
  lines in the image. Fixed with a gap-fill algorithm: if any inter-line spacing exceeds
  1.5× the median, insert interpolated line(s) at the expected position.
- Result: 21 rows × 16 cols detected correctly, 18.8% clue ratio.

### Backend (Python/Flask)
- `backend/app.py`: two endpoints — `GET /api/health`, `POST /api/analyze`
- `backend/grid_detector.py`: full OpenCV pipeline (same logic as test_step0.py)
  returning rows, cols, bbox, and per-cell type classification as JSON
- `backend/requirements.txt`: flask, flask-cors, opencv-python-headless, numpy, gunicorn
- `backend/Procfile`: `web: gunicorn app:app` for Render

### Frontend (React + Vite)
- `UploadScreen.jsx`: drag-drop / file picker, calls `/api/analyze`, shows loading state
- `PuzzleScreen.jsx`: image displayed in scrollable container with overlay positioned on top
- `GridOverlay.jsx`: CSS grid positioned exactly over the puzzle image using bbox percentages
- `PuzzleCell.jsx`: answer cells have a hidden `<input>` for keyboard capture; single
  Hebrew letter per cell; active cell highlighted in yellow; auto-advance to next answer cell
- `usePuzzleState.js`: manages answers Map, activeCell, localStorage persistence,
  backspace (clear current or move to previous), auto-advance on character input
- `index.html`: `lang="he" dir="rtl"`, no zoom (`user-scalable=no`)
- `vercel.json`: SPA rewrite rule

## How to test locally

1. Start backend: `cd backend && py -m flask --app app run`
2. Start frontend: `cd frontend && npm run dev`
3. Open `http://localhost:5173`
4. Upload `crossword_sample.png`
5. Verify grid overlay aligns with the puzzle image
6. Tap a white cell, type Hebrew letters
7. Reload page — answers should be restored from localStorage

## Known constraints / future work

- Grid detection assumes consistent light-blue clue cells and white answer cells
- Images with heavy JPEG compression or unusual color shifts may need threshold tuning
- No zoom/pan gesture on the puzzle image yet (scrollable but not pinch-zoom)
- No completion detection or celebratory state
