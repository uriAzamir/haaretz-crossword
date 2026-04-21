import { useEffect, useRef } from "react";
import PuzzleCell from "./PuzzleCell";

export default function GridOverlay({ gridData, imgSize, answers, activeCell, direction, onCellClick, onKey }) {
  const { rows, cols, bbox, cells, col_lines, row_lines } = gridData;
  const { rendered, natural } = imgSize;

  // Scale bbox from natural image coords to rendered coords
  const scaleX = rendered.w / natural.w;
  const scaleY = rendered.h / natural.h;

  // Build precise column/row sizes from detected divider lines if available,
  // otherwise fall back to equal fractions.
  const gridTemplateColumns = col_lines && col_lines.length === cols + 1
    ? col_lines.slice(0, -1).map((x, i) => `${(col_lines[i + 1] - x) * scaleX}px`).join(" ")
    : `repeat(${cols}, 1fr)`;

  const gridTemplateRows = row_lines && row_lines.length === rows + 1
    ? row_lines.slice(0, -1).map((y, i) => `${(row_lines[i + 1] - y) * scaleY}px`).join(" ")
    : `repeat(${rows}, 1fr)`;

  const overlayLeft   = col_lines?.length ? col_lines[0] * scaleX : bbox.x * scaleX;
  const overlayTop    = row_lines?.length ? row_lines[0] * scaleY : bbox.y * scaleY;
  const overlayWidth  = col_lines?.length
    ? (col_lines[col_lines.length - 1] - col_lines[0]) * scaleX
    : bbox.width * scaleX;
  const overlayHeight = row_lines?.length
    ? (row_lines[row_lines.length - 1] - row_lines[0]) * scaleY
    : bbox.height * scaleY;

  const overlayStyle = {
    position: "absolute",
    left:   overlayLeft,
    top:    overlayTop,
    width:  overlayWidth,
    height: overlayHeight,
    display: "grid",
    gridTemplateColumns,
    gridTemplateRows,
    // Use LTR so col 0 maps to the leftmost pixel column in the image.
    // The backend numbers columns left-to-right from the PNG.
    direction: "ltr",
  };

  // Build a lookup for fast access
  const cellMap = {};
  for (const cell of cells) {
    cellMap[`${cell.row},${cell.col}`] = cell;
  }

  // Compute the set of cells belonging to the current word
  const wordCells = new Set();
  if (activeCell) {
    const { row: ar, col: ac } = activeCell;
    if (direction === "across") {
      for (let c = ac; c < cols; c++) {
        if ((cellMap[`${ar},${c}`]?.type ?? "answer") === "clue") break;
        wordCells.add(`${ar},${c}`);
      }
      for (let c = ac - 1; c >= 0; c--) {
        if ((cellMap[`${ar},${c}`]?.type ?? "answer") === "clue") break;
        wordCells.add(`${ar},${c}`);
      }
    } else {
      for (let r = ar; r < rows; r++) {
        if ((cellMap[`${r},${ac}`]?.type ?? "answer") === "clue") break;
        wordCells.add(`${r},${ac}`);
      }
      for (let r = ar - 1; r >= 0; r--) {
        if ((cellMap[`${r},${ac}`]?.type ?? "answer") === "clue") break;
        wordCells.add(`${r},${ac}`);
      }
    }
  }

  // Focus management: keep a ref to the active input
  const activeInputRef = useRef(null);

  useEffect(() => {
    if (activeCell && activeInputRef.current) {
      activeInputRef.current.focus({ preventScroll: true });
      activeInputRef.current.parentElement?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "smooth",
      });
    }
  }, [activeCell]);

  return (
    <div style={overlayStyle}>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const cell = cellMap[`${r},${c}`] || { row: r, col: c, type: "answer" };
          const key = `${r},${c}`;
          const isActive = activeCell?.row === r && activeCell?.col === c;
          const isInWord = wordCells.has(key);
          const answer = answers[key] || "";

          return (
            <PuzzleCell
              key={key}
              cell={cell}
              isActive={isActive}
              isInWord={isInWord}
              answer={answer}
              inputRef={isActive ? activeInputRef : null}
              onClick={() => {
                if (cell.type === "answer") onCellClick(r, c);
              }}
              onKey={onKey}
            />
          );
        })
      )}
    </div>
  );
}
