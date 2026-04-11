"""
Step 0: OpenCV grid detection proof-of-concept.
Loads crossword_sample.png, detects the grid, classifies each cell as
CLUE (light blue) or ANSWER (white), saves an annotated result image.

Run: py test_step0.py
"""

import sys
import cv2
import numpy as np

import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

IMAGE_PATH = "crossword_sample.png"
OUTPUT_PATH = "step0_result.png"


def find_line_positions(projection, min_val, min_gap=5):
    """Return center positions of peaks in a 1-D projection array."""
    positions = []
    in_peak = False
    peak_start = 0
    for i, val in enumerate(projection):
        if val >= min_val:
            if not in_peak:
                in_peak = True
                peak_start = i
        else:
            if in_peak:
                positions.append((peak_start + i) // 2)
                in_peak = False
    if in_peak:
        positions.append((peak_start + len(projection)) // 2)
    # Merge positions that are too close
    merged = []
    for p in positions:
        if merged and p - merged[-1] < min_gap:
            merged[-1] = (merged[-1] + p) // 2
        else:
            merged.append(p)
    return merged


def main():
    img = cv2.imread(IMAGE_PATH)
    if img is None:
        print(f"ERROR: Cannot load '{IMAGE_PATH}'")
        sys.exit(1)

    h, w = img.shape[:2]
    print(f"Image loaded: {w}x{h} px")

    # ── Preprocessing ────────────────────────────────────────────────────────
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)

    # ── Detect horizontal and vertical line segments ──────────────────────────
    h_klen = max(10, w // 15)
    v_klen = max(10, h // 15)

    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (h_klen, 1))
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, v_klen))
    h_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel)
    v_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel)

    h_proj = np.sum(h_lines.astype(np.int64), axis=1)
    v_proj = np.sum(v_lines.astype(np.int64), axis=0)

    # ── Grid bounding box ────────────────────────────────────────────────────
    h_thresh_bbox = max(h_proj.max() * 0.05, 255)
    v_thresh_bbox = max(v_proj.max() * 0.05, 255)

    h_active = np.where(h_proj >= h_thresh_bbox)[0]
    v_active = np.where(v_proj >= v_thresh_bbox)[0]

    if len(h_active) == 0 or len(v_active) == 0:
        print("ERROR: No grid lines found")
        sys.exit(1)

    top    = int(h_active[0])
    bottom = int(h_active[-1])
    left   = int(v_active[0])
    right  = int(v_active[-1])

    print(f"Grid bbox: left={left}, top={top}, right={right}, bottom={bottom}")

    # ── Find individual row/col dividers ──────────────────────────────────────
    # IMPORTANT: extend the slice a few pixels PAST the boundary so the
    # outermost lines (which sit right at top/bottom/left/right) are captured.
    MARGIN = 10
    h_sub = h_proj[max(0, top - MARGIN) : min(h, bottom + MARGIN)]
    v_sub = v_proj[max(0, left - MARGIN) : min(w, right + MARGIN)]

    row_thresh = max(h_sub.max() * 0.08, 255)
    col_thresh = max(v_sub.max() * 0.08, 255)

    row_offsets = find_line_positions(h_sub, row_thresh, min_gap=3)
    col_offsets = find_line_positions(v_sub, col_thresh, min_gap=3)

    # Convert offsets back to full-image coordinates
    row_lines = [max(0, top - MARGIN) + r for r in row_offsets]
    col_lines = [max(0, left - MARGIN) + c for c in col_offsets]

    # Fill in missing lines: if a gap is > 1.5x the median spacing,
    # there is a hidden line — insert one at the midpoint.
    def fill_missing_lines(lines):
        if len(lines) < 2:
            return lines
        spacings = [lines[i+1] - lines[i] for i in range(len(lines)-1)]
        median_gap = sorted(spacings)[len(spacings) // 2]
        result = [lines[0]]
        for i in range(1, len(lines)):
            gap = lines[i] - result[-1]
            if gap > median_gap * 1.5:
                n_missing = round(gap / median_gap) - 1
                for k in range(1, n_missing + 1):
                    result.append(result[0] + round(result[-1] - result[0] + median_gap * k)
                                  if False else lines[i-1] + round(gap * k / (n_missing + 1)))
            result.append(lines[i])
        return result

    row_lines = fill_missing_lines(row_lines)
    col_lines = fill_missing_lines(col_lines)

    n_rows = len(row_lines) - 1
    n_cols = len(col_lines) - 1

    print(f"Row lines detected: {len(row_lines)} => {n_rows} rows")
    print(f"Col lines detected: {len(col_lines)} => {n_cols} cols")

    if n_rows < 2 or n_cols < 2:
        print("ERROR: Not enough lines detected")
        sys.exit(1)

    # ── Classify cells ────────────────────────────────────────────────────────
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    lower_blue = np.array([85,  25, 130])
    upper_blue = np.array([120, 210, 255])
    blue_mask = cv2.inRange(hsv, lower_blue, upper_blue)

    cells = []
    cell_map = []

    for r in range(n_rows):
        row = []
        for c in range(n_cols):
            y1, y2 = row_lines[r] + 3, row_lines[r + 1] - 3
            x1, x2 = col_lines[c] + 3, col_lines[c + 1] - 3

            if y2 <= y1 or x2 <= x1:
                row.append("?")
                cells.append({"row": r, "col": c, "type": "answer", "blue_ratio": 0})
                continue

            my = max(1, (y2 - y1) // 5)
            mx = max(1, (x2 - x1) // 5)
            patch = blue_mask[y1 + my : y2 - my, x1 + mx : x2 - mx]
            blue_ratio = patch.mean() / 255.0

            cell_type = "clue" if blue_ratio > 0.05 else "answer"
            row.append("C" if cell_type == "clue" else ".")
            cells.append({"row": r, "col": c, "type": cell_type, "blue_ratio": blue_ratio})

        cell_map.append(row)

    n_clue   = sum(1 for c in cells if c["type"] == "clue")
    n_answer = sum(1 for c in cells if c["type"] == "answer")
    print(f"\nCell classification: {n_clue} CLUE, {n_answer} ANSWER, {len(cells)} total")

    print(f"\nCell map ({n_rows}r x {n_cols}c)  C=Clue  .=Answer")
    for row in cell_map:
        print(" ".join(row))

    # ── Annotated output ──────────────────────────────────────────────────────
    # Strategy: draw semi-transparent fills so the original image shows through,
    # then a solid border on top so cells are clearly marked.

    overlay = img.copy()

    for cell in cells:
        r, c = cell["row"], cell["col"]
        y1, y2 = row_lines[r] + 2, row_lines[r + 1] - 2
        x1, x2 = col_lines[c] + 2, col_lines[c + 1] - 2
        if y2 <= y1 or x2 <= x1:
            continue
        if cell["type"] == "clue":
            # Red fill over clue cells
            cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 0, 220), -1)
        else:
            # Green fill over answer cells
            cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 180, 0), -1)

    # Blend: 35% overlay, 65% original
    out = cv2.addWeighted(overlay, 0.35, img, 0.65, 0)

    # Draw the outer grid bounding box
    cv2.rectangle(out, (left, top), (right, bottom), (0, 0, 255), 3)

    # Draw detected grid lines
    for rl in row_lines:
        cv2.line(out, (left, rl), (right, rl), (255, 255, 0), 1)
    for cl in col_lines:
        cv2.line(out, (cl, top), (cl, bottom), (255, 255, 0), 1)

    cv2.imwrite(OUTPUT_PATH, out)
    print(f"\nAnnotated image saved: {OUTPUT_PATH}")
    print("  RED tint   = CLUE cell (light blue in original)")
    print("  GREEN tint = ANSWER cell (white in original)")
    print("  YELLOW lines = detected grid dividers")
    print("  RED border   = grid bounding box")

    # ── Sanity checks ─────────────────────────────────────────────────────────
    print("\n-- Sanity checks --")
    row_ok = 18 <= n_rows <= 24
    col_ok = 14 <= n_cols <= 18
    print(f"Rows {n_rows}: {'OK' if row_ok else 'WRONG (expected 21)'}")
    print(f"Cols {n_cols}: {'OK' if col_ok else 'WRONG (expected 16)'}")
    clue_pct = n_clue / max(len(cells), 1)
    print(f"Clue ratio: {clue_pct:.1%}")

    if row_ok and col_ok:
        print("\nStep 0 PASSED")
    else:
        print("\nStep 0 needs tuning")


if __name__ == "__main__":
    main()
