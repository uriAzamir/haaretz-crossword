"""
Grid detection and cell classification for Haaretz arrow crossword puzzles.
Uses OpenCV color detection — no AI/vision APIs.
"""

import cv2
import numpy as np


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
    # Merge positions that are too close together
    merged = []
    for p in positions:
        if merged and p - merged[-1] < min_gap:
            merged[-1] = (merged[-1] + p) // 2
        else:
            merged.append(p)
    return merged


def analyze_image(img_bytes: bytes) -> dict:
    """
    Analyze a crossword puzzle image and return grid structure.

    Args:
        img_bytes: Raw PNG/JPG image bytes.

    Returns:
        {
            "rows": int,
            "cols": int,
            "bbox": {"x": int, "y": int, "width": int, "height": int},
            "cells": [{"row": int, "col": int, "type": "clue"|"answer"}, ...]
        }

    Raises:
        ValueError: If the grid cannot be detected.
    """
    # Decode image
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")

    h, w = img.shape[:2]

    # ── Binary threshold to isolate dark grid lines ──────────────────────────
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)

    # ── Detect long horizontal and vertical line segments ────────────────────
    h_klen = max(10, w // 15)
    v_klen = max(10, h // 15)

    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (h_klen, 1))
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, v_klen))
    h_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel)
    v_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel)

    h_proj = np.sum(h_lines.astype(np.int64), axis=1)
    v_proj = np.sum(v_lines.astype(np.int64), axis=0)

    if h_proj.max() == 0 or v_proj.max() == 0:
        raise ValueError("No grid lines detected in image")

    # ── Grid bounding box ────────────────────────────────────────────────────
    h_thresh_bbox = max(h_proj.max() * 0.05, 255)
    v_thresh_bbox = max(v_proj.max() * 0.05, 255)

    h_active = np.where(h_proj >= h_thresh_bbox)[0]
    v_active = np.where(v_proj >= v_thresh_bbox)[0]

    if len(h_active) == 0 or len(v_active) == 0:
        raise ValueError("Could not determine grid bounding box")

    top    = int(h_active[0])
    bottom = int(h_active[-1])
    left   = int(v_active[0])
    right  = int(v_active[-1])

    # ── Find individual row / column dividers ────────────────────────────────
    # Extend slightly past the boundary so the outermost lines are included.
    MARGIN = 10
    h_sub = h_proj[max(0, top - MARGIN) : min(h, bottom + MARGIN)]
    v_sub = v_proj[max(0, left - MARGIN) : min(w, right + MARGIN)]

    row_thresh = max(h_sub.max() * 0.08, 255)
    col_thresh = max(v_sub.max() * 0.08, 255)

    row_offsets = find_line_positions(h_sub, row_thresh, min_gap=3)
    col_offsets = find_line_positions(v_sub, col_thresh, min_gap=3)

    row_lines = [max(0, top - MARGIN) + r for r in row_offsets]
    col_lines = [max(0, left - MARGIN) + c for c in col_offsets]

    n_rows = len(row_lines) - 1
    n_cols = len(col_lines) - 1

    # Fill gaps: if a spacing is >1.5x the median, a line was missed —
    # infer it at the expected position(s).
    def fill_missing_lines(lines):
        if len(lines) < 2:
            return lines
        spacings = sorted([lines[i + 1] - lines[i] for i in range(len(lines) - 1)])
        median_gap = spacings[len(spacings) // 2]
        result = [lines[0]]
        for i in range(1, len(lines)):
            gap = lines[i] - result[-1]
            if gap > median_gap * 1.5:
                n_missing = round(gap / median_gap) - 1
                for k in range(1, n_missing + 1):
                    result.append(lines[i - 1] + round(gap * k / (n_missing + 1)))
            result.append(lines[i])
        return result

    row_lines = fill_missing_lines(row_lines)
    col_lines = fill_missing_lines(col_lines)

    # Clip any lines that crept in outside the bbox due to the MARGIN extension
    row_lines = [r for r in row_lines if top - MARGIN <= r <= bottom + MARGIN]
    col_lines = [c for c in col_lines if left - MARGIN <= c <= right + MARGIN]

    n_rows = len(row_lines) - 1
    n_cols = len(col_lines) - 1

    if n_rows < 2 or n_cols < 2:
        raise ValueError(
            f"Too few grid lines detected: {n_rows} rows, {n_cols} cols"
        )

    # ── Classify each cell by interior color ─────────────────────────────────
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # Light blue: H ~85-120 (OpenCV 0-179 scale), S ~25-210, V ~130-255
    lower_blue = np.array([85,  25, 130])
    upper_blue = np.array([120, 210, 255])
    blue_mask = cv2.inRange(hsv, lower_blue, upper_blue)

    cells = []
    for r in range(n_rows):
        for c in range(n_cols):
            y1, y2 = row_lines[r] + 3, row_lines[r + 1] - 3
            x1, x2 = col_lines[c] + 3, col_lines[c + 1] - 3

            if y2 <= y1 or x2 <= x1:
                cell_type = "answer"
            else:
                my = max(1, (y2 - y1) // 5)
                mx = max(1, (x2 - x1) // 5)
                patch = blue_mask[y1 + my : y2 - my, x1 + mx : x2 - mx]
                blue_ratio = patch.mean() / 255.0
                cell_type = "clue" if blue_ratio > 0.05 else "answer"

            cells.append({"row": r, "col": c, "type": cell_type})

    return {
        "rows": n_rows,
        "cols": n_cols,
        "bbox": {
            "x": left,
            "y": top,
            "width": right - left,
            "height": bottom - top,
        },
        "col_lines": [int(x) for x in col_lines],
        "row_lines": [int(y) for y in row_lines],
        "cells": cells,
    }
