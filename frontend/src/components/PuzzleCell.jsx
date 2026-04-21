import { useRef, useEffect } from "react";

export default function PuzzleCell({ cell, isActive, isInWord, answer, inputRef, onClick, onKey }) {
  const localRef = useRef(null);

  // Expose focus ref to parent
  useEffect(() => {
    if (inputRef) inputRef.current = localRef.current;
  }, [inputRef]);

  if (cell.type === "clue") {
    return <div style={styles.clue} />;
  }

  // Answer cell
  function handleKeyDown(e) {
    e.preventDefault();
    onKey(e.key);
  }

  // On mobile, the input fires onChange with the typed character.
  // We use onKeyDown on desktop and onChange as fallback for mobile IME.
  function handleChange(e) {
    const val = e.target.value;
    if (val) {
      // Take the last character typed (IME may produce a string)
      onKey(val[val.length - 1]);
      e.target.value = "";
    }
  }

  const wordStyle = isInWord ? styles.answerInWord : {};
  const activeStyle = isActive ? styles.answerActive : {};

  return (
    <div
      style={{ ...styles.answer, ...wordStyle, ...activeStyle }}
      onClick={onClick}
    >
      {/* Invisible input captures keyboard */}
      <input
        ref={localRef}
        style={styles.hiddenInput}
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        dir="rtl"
        lang="he"
        value=""
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        readOnly={false}
      />
      {/* Displayed letter */}
      {answer && <span style={styles.letter}>{answer}</span>}
    </div>
  );
}

const styles = {
  clue: {
    // Clue cells: transparent so the original image shows through
    pointerEvents: "none",
  },
  answer: {
    position: "relative",
    cursor: "pointer",
    // Subtle transparent tint so user can see tappable cells
    background: "rgba(255,255,255,0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // Touch target: full cell
    WebkitTapHighlightColor: "transparent",
  },
  answerInWord: {
    background: "rgba(160, 160, 160, 0.35)",
    zIndex: 1,
  },
  answerActive: {
    outline: "1.5px solid rgba(255, 80, 0, 0.95)",
    outlineOffset: "-1.5px",
    zIndex: 2,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
    border: "none",
    background: "transparent",
    padding: 0,
    fontSize: 1,
    zIndex: 2,
  },
  letter: {
    fontSize: "clamp(10px, 2.5vw, 18px)",
    fontWeight: "bold",
    color: "#1a1a1a",
    userSelect: "none",
    pointerEvents: "none",
    lineHeight: 1,
  },
};
