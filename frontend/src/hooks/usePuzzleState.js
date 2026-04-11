import { useState, useEffect, useCallback } from "react";

function gridKey(rows, cols, cells) {
  const cluePositions = cells
    .filter((c) => c.type === "clue")
    .map((c) => `${c.row},${c.col}`)
    .join("|");
  return `crossword_${rows}x${cols}_${cluePositions.length}`;
}

// Hebrew "across" = right-to-left = col decreasing.
// "down" = top-to-bottom = row increasing.

function nextAnswerCell(cells, row, col, direction) {
  const answer = cells.filter((c) => c.type === "answer");
  if (direction === "across") {
    // Move LEFT (col decreases) within same row
    const sameRow = answer
      .filter((c) => c.row === row && c.col < col)
      .sort((a, b) => b.col - a.col); // highest col first (nearest left)
    if (sameRow.length) return sameRow[0];
    // Wrap to next row: start from rightmost answer cell
    return answer
      .filter((c) => c.row > row)
      .sort((a, b) => a.row !== b.row ? a.row - b.row : b.col - a.col)[0] || null;
  } else {
    // Move DOWN (row increases) within same col
    const sameCol = answer
      .filter((c) => c.col === col && c.row > row)
      .sort((a, b) => a.row - b.row);
    if (sameCol.length) return sameCol[0];
    // Wrap to next col: start from topmost answer cell
    return answer
      .filter((c) => c.col > col)
      .sort((a, b) => a.col !== b.col ? a.col - b.col : a.row - b.row)[0] || null;
  }
}

function prevAnswerCell(cells, row, col, direction) {
  const answer = cells.filter((c) => c.type === "answer");
  if (direction === "across") {
    // Backspace goes RIGHT (col increases) — opposite of advance
    const sameRow = answer
      .filter((c) => c.row === row && c.col > col)
      .sort((a, b) => a.col - b.col);
    if (sameRow.length) return sameRow[0];
    return answer
      .filter((c) => c.row < row)
      .sort((a, b) => b.row !== a.row ? b.row - a.row : a.col - b.col)[0] || null;
  } else {
    // Backspace goes UP (row decreases)
    const sameCol = answer
      .filter((c) => c.col === col && c.row < row)
      .sort((a, b) => b.row - a.row);
    if (sameCol.length) return sameCol[0];
    return answer
      .filter((c) => c.col < col)
      .sort((a, b) => b.col !== a.col ? b.col - a.col : b.row - a.row)[0] || null;
  }
}

export function usePuzzleState(gridData) {
  const [answers, setAnswers] = useState({});
  const [activeCell, setActiveCell] = useState(null);
  const [direction, setDirection] = useState("across");

  useEffect(() => {
    if (!gridData) return;
    const key = gridKey(gridData.rows, gridData.cols, gridData.cells);
    try {
      const saved = localStorage.getItem(key);
      setAnswers(saved ? JSON.parse(saved) : {});
    } catch {
      setAnswers({});
    }
    setActiveCell(null);
    setDirection("across");
  }, [gridData]);

  useEffect(() => {
    if (!gridData || Object.keys(answers).length === 0) return;
    const key = gridKey(gridData.rows, gridData.cols, gridData.cells);
    try {
      localStorage.setItem(key, JSON.stringify(answers));
    } catch {}
  }, [answers, gridData]);

  // Tap a cell: activate it, or toggle direction if already active
  const handleCellClick = useCallback((row, col) => {
    setActiveCell((prev) => {
      if (prev?.row === row && prev?.col === col) {
        setDirection((d) => (d === "across" ? "down" : "across"));
        return prev;
      }
      return { row, col };
    });
  }, []);

  const handleKey = useCallback(
    (key) => {
      if (!activeCell || !gridData) return;
      const { row, col } = activeCell;
      const cellKey = `${row},${col}`;

      if (key === "Backspace" || key === "Delete") {
        if (answers[cellKey]) {
          setAnswers((prev) => {
            const next = { ...prev };
            delete next[cellKey];
            return next;
          });
        } else {
          const prev = prevAnswerCell(gridData.cells, row, col, direction);
          if (prev) {
            setAnswers((a) => {
              const next = { ...a };
              delete next[`${prev.row},${prev.col}`];
              return next;
            });
            setActiveCell({ row: prev.row, col: prev.col });
          }
        }
        return;
      }

      if (key.length === 1) {
        setAnswers((prev) => ({ ...prev, [cellKey]: key }));
        const next = nextAnswerCell(gridData.cells, row, col, direction);
        if (next) setActiveCell({ row: next.row, col: next.col });
      }
    },
    [activeCell, answers, direction, gridData]
  );

  return { answers, activeCell, direction, handleCellClick, handleKey };
}
