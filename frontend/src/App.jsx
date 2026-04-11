import { useState } from "react";
import UploadScreen from "./components/UploadScreen";
import PuzzleScreen from "./components/PuzzleScreen";

export default function App() {
  const [puzzle, setPuzzle] = useState(null); // { imageUrl, gridData }

  function handlePuzzleLoaded(imageUrl, gridData) {
    setPuzzle({ imageUrl, gridData });
  }

  function handleReset() {
    if (puzzle) URL.revokeObjectURL(puzzle.imageUrl);
    setPuzzle(null);
  }

  if (!puzzle) {
    return <UploadScreen onPuzzleLoaded={handlePuzzleLoaded} />;
  }

  return (
    <PuzzleScreen
      imageUrl={puzzle.imageUrl}
      gridData={puzzle.gridData}
      onReset={handleReset}
    />
  );
}
