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
          const isActive = activeCell?.row === r && activeCell?.col === c;
          const answer = answers[`${r},${c}`] || "";

          return (
            <PuzzleCell
              key={`${r},${c}`}
              cell={cell}
              isActive={isActive}
              direction={direction}
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
