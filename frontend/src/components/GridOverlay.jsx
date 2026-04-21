import { useEffect, useRef } from "react";
import PuzzleCell from "./PuzzleCell";

export default function GridOverlay({ gridData, imgSize, answers, activeCell, direction, onCellClick, onKey }) {
  const { rows, cols, bbox, cells } = gridData;
  const { rendered, natural } = imgSize;

  // Scale bbox from natural image coords to rendered coords
  const scaleX = rendered.w / natural.w;
  const scaleY = rendered.h / natural.h;

  const overlayStyle = {
    position: "absolute",
    left:   bbox.x * scaleX,
    top:    bbox.y * scaleY,
    width:  bbox.width  * scaleX,
    height: bbox.height * scaleY,
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows:    `repeat(${rows}, 1fr)`,
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
