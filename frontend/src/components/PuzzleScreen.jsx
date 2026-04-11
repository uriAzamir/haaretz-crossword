import { useRef, useState, useEffect } from "react";
import GridOverlay from "./GridOverlay";
import { usePuzzleState } from "../hooks/usePuzzleState";

export default function PuzzleScreen({ imageUrl, gridData, onReset }) {
  const imgRef = useRef(null);
  const [imgSize, setImgSize] = useState(null); // { rendered: {w,h}, natural: {w,h} }
  const { answers, activeCell, setActiveCell, handleKey } = usePuzzleState(gridData);

  // Recalculate rendered size on load and resize
  function updateSize() {
    const el = imgRef.current;
    if (!el) return;
    setImgSize({
      rendered: { w: el.offsetWidth, h: el.offsetHeight },
      natural:  { w: el.naturalWidth, h: el.naturalHeight },
    });
  }

  useEffect(() => {
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Dismiss active cell when tapping outside the grid
  function handleContainerClick(e) {
    if (e.target === e.currentTarget) setActiveCell(null);
  }

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <span style={styles.titleText}>תשחץ הארץ</span>
        <button style={styles.resetBtn} onClick={onReset}>תשחץ חדש</button>
      </div>

      {/* Puzzle area */}
      <div style={styles.puzzleWrapper} onClick={handleContainerClick}>
        <div style={styles.imageContainer}>
          <img
            ref={imgRef}
            src={imageUrl}
            alt="תשחץ"
            style={styles.puzzleImage}
            onLoad={updateSize}
            draggable={false}
          />

          {imgSize && (
            <GridOverlay
              gridData={gridData}
              imgSize={imgSize}
              answers={answers}
              activeCell={activeCell}
              onCellClick={setActiveCell}
              onKey={handleKey}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 16px",
    background: "#111",
    borderBottom: "1px solid #333",
    flexShrink: 0,
  },
  titleText: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#e63946",
  },
  resetBtn: {
    background: "transparent",
    color: "#aaa",
    fontSize: 14,
    padding: "4px 10px",
    border: "1px solid #444",
    borderRadius: 6,
  },
  puzzleWrapper: {
    flex: 1,
    overflow: "auto",
    WebkitOverflowScrolling: "touch",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: 8,
  },
  imageContainer: {
    position: "relative",
    display: "inline-block",
    lineHeight: 0,
  },
  puzzleImage: {
    width: "100%",
    maxWidth: "100%",
    display: "block",
    userSelect: "none",
    WebkitUserSelect: "none",
  },
};
