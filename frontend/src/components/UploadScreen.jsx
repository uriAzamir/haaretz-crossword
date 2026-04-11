import { useState, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function UploadScreen({ onPuzzleLoaded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  async function processFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      setError("יש לבחור קובץ תמונה (PNG / JPG)");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `שגיאת שרת (${res.status})`);
      }

      const gridData = await res.json();
      const imageUrl = URL.createObjectURL(file);
      onPuzzleLoaded(imageUrl, gridData);
    } catch (err) {
      setError(err.message || "אירעה שגיאה בעיבוד התמונה");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    processFile(e.target.files[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>תשחץ הארץ</h1>
      <p style={styles.subtitle}>פתרון תשבצי חצים</p>

      <div
        style={{ ...styles.dropzone, ...(dragging ? styles.dropzoneDragging : {}) }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {loading ? (
          <p style={styles.hint}>מנתח את התשחץ…</p>
        ) : (
          <>
            <p style={styles.uploadIcon}>📷</p>
            <p style={styles.hint}>לחץ כאן להעלאת צילום מסך של התשחץ</p>
            <p style={styles.hintSmall}>או גרור תמונה לכאן</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles = {
  page: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#e63946",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
  },
  dropzone: {
    width: "100%",
    maxWidth: 400,
    border: "2px dashed #555",
    borderRadius: 12,
    padding: "40px 24px",
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
  },
  dropzoneDragging: {
    borderColor: "#e63946",
    background: "rgba(230,57,70,0.08)",
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  hint: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 8,
  },
  hintSmall: {
    fontSize: 13,
    color: "#777",
  },
  error: {
    color: "#e63946",
    fontSize: 14,
    textAlign: "center",
  },
};
