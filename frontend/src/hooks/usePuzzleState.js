import { useState, useEffect, useCallback } from "react";

/**
 * Derives a simple string key from the grid structure so different puzzles
 * get separate localStorage slots.
 */
function gridKey(rows, cols, cells) {
  const cluePositions = cells
    .filter((c) => c.type === "clue")
    .map((c) => `${c.row},${c.col}`)
    .join("|");
  return `crossword_${rows}x${cols}_${cluePositions.length}`;
}

/**
 * Returns all answer cells in reading order (RTL: right-to-left per row,
 * then top-to-bottom). Used for auto-advance.
 */
function answerCellsInOrder(cells, cols) {
  return cells
    .filter((c) => c.type === "answer")
    .sort((a, b) =>
      a.row !== b.row ? a.row - b.row : (cols - 1 - a.col) - (cols - 1 - b.col)
    );
}

export function usePuzzleState(gridData) {
  const [answers, setAnswers] = useState({});
  const [activeCell, setActiveCell] = useState(null);

  // Load saved progress from localStorage when a new puzzle is loaded
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
  }, [gridData]);

  // Persist answers to localStorage whenever they change
  useEffect(() => {
    if (!gridData || Object.keys(answers).length === 0) return;
    const key = gridKey(gridData.rows, gridData.cols, gridData.cells);
    try {
      localStorage.setItem(key, JSON.stringify(answers));
    } catch {
      // Quota exceeded — silently ignore
    }
  }, [answers, gridData]);

  const setAnswer = useCallback(
    (row, col, char) => {
      setAnswers((prev) => {
        const next = { ...prev, [`${row},${col}`]: char };
        return next;
      });
    },
    []
  );

  const clearAnswer = useCallback((row, col) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[`${row},${col}`];
      return next;
    });
  }, []);

  /**
   * Handle a keypress on the active cell.
   * Returns the next cell to activate (or null to stay).
   */
  const handleKey = useCallback(
    (key) => {
      if (!activeCell || !gridData) return;
      const { row, col } = activeCell;
      const cellKey = `${row},${col}`;

      if (key === "Backspace" || key === "Delete") {
        if (answers[cellKey]) {
          // Clear current cell and stay
          clearAnswer(row, col);
        } else {
          // Already empty — move to previous answer cell
          const ordered = answerCellsInOrder(gridData.cells, gridData.cols);
          const idx = ordered.findIndex((c) => c.row === row && c.col === col);
          if (idx > 0) {
            const prev = ordered[idx - 1];
            clearAnswer(prev.row, prev.col);
            setActiveCell({ row: prev.row, col: prev.col });
          }
        }
        return;
      }

      // Accept a single printable character (Hebrew or Latin)
      if (key.length === 1) {
        setAnswer(row, col, key);

        // Auto-advance to next answer cell
        const ordered = answerCellsInOrder(gridData.cells, gridData.cols);
        const idx = ordered.findIndex((c) => c.row === row && c.col === col);
        if (idx >= 0 && idx < ordered.length - 1) {
          const next = ordered[idx + 1];
          setActiveCell({ row: next.row, col: next.col });
        }
      }
    },
    [activeCell, answers, gridData, setAnswer, clearAnswer]
  );

  return { answers, activeCell, setActiveCell, handleKey };
}
