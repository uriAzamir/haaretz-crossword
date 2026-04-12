# Stage 1 — Complete Build

## What was built

### Step 0 — OpenCV proof-of-concept
- `test_step0.py`: standalone script that loads a PNG, detects the grid, classifies
  each cell as CLUE (light blue) or ANSWER (white), saves an annotated result image.
- Key finding: two grid lines were missing from projection peaks due to thin/broken
  lines in the image. Fixed with a gap-fill algorithm: if any inter-line spacing exceeds
  1.5× the median, insert interpolated line(s) at the expected position.
- Result: 21 rows × 16 cols detected correctly on PNG sample; 22 × 16 on PDF.

### Backend (Python/Flask)
- `backend/app.py`: two endpoints — `GET /api/health`, `POST /api/analyze`
- **PDF support**: PyMuPDF renders page 0 at 250 DPI to PNG before passing to OpenCV.
  For PDF uploads, the rendered PNG is returned as base64 in the response so the
  frontend can display it (browsers can't show PDFs in `<img>` tags).
- `backend/grid_detector.py`: full OpenCV pipeline — binary threshold → morphological
  line detection → projection peaks → gap-fill → HSV color classification
- `backend/requirements.txt`: flask, flask-cors, opencv-python-headless, numpy,
  gunicorn, PyMuPDF

### Frontend (React + Vite)
- **UploadScreen**: accepts PDF or image files; calls `/api/analyze`
- **PuzzleScreen**: scrollable container with image and absolutely-positioned overlay
- **GridOverlay**: CSS grid (`direction: ltr`) aligned to image via bbox scaling
- **PuzzleCell**: answer cells have hidden `<input>` for keyboard capture;
  clue cells are transparent and non-interactive
- **Direction toggle**: tap a cell once to activate (across/yellow);
  tap same cell again to switch to down mode (blue). Visual indicator shows current direction.
- **Auto-advance**: across = right-to-left (Hebrew RTL); down = top-to-bottom
- **Backspace**: clears current cell or moves to previous cell in direction
- **usePuzzleState**: manages answers, activeCell, direction; persists to localStorage

### Deployment
- Backend: https://haaretz-crossword.onrender.com (Render, free tier)
- Frontend: https://haaretz-crossword.vercel.app (Vercel)

## Known constraints / future work

- Render free tier spins down after inactivity (~30s cold start)
- No pinch-to-zoom on the puzzle image
- Direction toggle (across/down) behavior on iPhone keyboard not fully validated
- No completion detection or celebratory state
- Grid detection assumes consistent light-blue clue cells; heavy compression may affect accuracy
