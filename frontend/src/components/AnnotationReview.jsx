import { useState, useMemo } from "react";

export default function AnnotationReview({ apiBase, document, runs, pages }) {
  const [selectedPage, setSelectedPage] = useState(1);
  const [selectedRun, setSelectedRun] = useState(null);
  const [filter, setFilter] = useState("");
  const [showOverlay, setShowOverlay] = useState(true);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);

  // Get runs that have annotation data
  const annotatedRuns = runs.filter(
    (run) =>
      run.output?.pages?.some(
        (p) => p.words?.length > 0 || p.detections?.length > 0 || p.tokens?.length > 0
      )
  );

  const currentRun = selectedRun
    ? runs.find((r) => r.id === selectedRun)
    : annotatedRuns[0];

  const currentPageData = useMemo(() => {
    if (!currentRun?.output?.pages) return null;
    return currentRun.output.pages.find((p) => p.page === selectedPage);
  }, [currentRun, selectedPage]);

  const annotations = useMemo(() => {
    if (!currentPageData) return [];
    const items = [];

    // OCR words
    (currentPageData.words || []).forEach((word, idx) => {
      items.push({
        id: `word-${idx}`,
        type: "ocr",
        text: word.text,
        bbox: word.bbox,
        confidence: word.confidence,
      });
    });

    // Detections
    (currentPageData.detections || []).forEach((det, idx) => {
      items.push({
        id: `det-${idx}`,
        type: "detection",
        text: det.label,
        bbox: det.bbox,
        confidence: det.confidence,
      });
    });

    // Layout tokens
    (currentPageData.tokens || []).forEach((tok, idx) => {
      items.push({
        id: `tok-${idx}`,
        type: "layout",
        text: tok.word,
        label: tok.label,
        bbox: tok.bbox,
        confidence: tok.score,
      });
    });

    return items;
  }, [currentPageData]);

  const filteredAnnotations = useMemo(() => {
    if (!filter) return annotations;
    const lowerFilter = filter.toLowerCase();
    return annotations.filter(
      (a) =>
        a.text?.toLowerCase().includes(lowerFilter) ||
        a.label?.toLowerCase().includes(lowerFilter)
    );
  }, [annotations, filter]);

  const currentPageImage = pages.find((p) => p.page === selectedPage);

  if (!document) {
    return <p className="empty">Upload a document first.</p>;
  }

  if (pages.length === 0) {
    return (
      <div className="annotation-review">
        <h3>Annotation Review</h3>
        <p className="empty">Render pages first to review annotations.</p>
      </div>
    );
  }

  if (annotatedRuns.length === 0) {
    return (
      <div className="annotation-review">
        <h3>Annotation Review</h3>
        <p className="empty">Run OCR, detection, or layout analysis to review annotations.</p>
      </div>
    );
  }

  const getOverlayStyle = (annotation) => {
    if (!currentPageImage || !annotation.bbox) return {};
    const [x1, y1, x2, y2] = annotation.bbox;

    // Handle normalized coordinates (0-1000 range for layout)
    const isNormalized = x2 <= 1000 && y2 <= 1000 && annotation.type === "layout";

    if (isNormalized) {
      return {
        left: `${x1 / 10}%`,
        top: `${y1 / 10}%`,
        width: `${(x2 - x1) / 10}%`,
        height: `${(y2 - y1) / 10}%`,
      };
    }

    return {
      left: `${(x1 / currentPageImage.width) * 100}%`,
      top: `${(y1 / currentPageImage.height) * 100}%`,
      width: `${((x2 - x1) / currentPageImage.width) * 100}%`,
      height: `${((y2 - y1) / currentPageImage.height) * 100}%`,
    };
  };

  return (
    <div className="annotation-review">
      <h3>Annotation Review</h3>

      <div className="review-controls">
        <label className="select">
          <span>Run</span>
          <select
            value={selectedRun || ""}
            onChange={(e) => setSelectedRun(e.target.value ? parseInt(e.target.value) : null)}
          >
            {annotatedRuns.map((run) => (
              <option key={run.id} value={run.id}>
                {run.stage}
              </option>
            ))}
          </select>
        </label>

        <label className="select">
          <span>Page</span>
          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(parseInt(e.target.value))}
          >
            {pages.map((p) => (
              <option key={p.page} value={p.page}>
                Page {p.page}
              </option>
            ))}
          </select>
        </label>

        <label className="select">
          <span>Filter</span>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search annotations..."
          />
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showOverlay}
            onChange={(e) => setShowOverlay(e.target.checked)}
          />
          <span>Show Overlay</span>
        </label>
      </div>

      <div className="review-content">
        <div className="review-image">
          {currentPageImage && (
            <div className="page">
              <img src={`${apiBase}${currentPageImage.url}`} alt={`Page ${selectedPage}`} />
              {showOverlay && (
                <div className="overlay">
                  {filteredAnnotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      className={`overlay-box ${annotation.type} ${
                        selectedAnnotation === annotation.id ? "selected" : ""
                      }`}
                      style={getOverlayStyle(annotation)}
                      onClick={() => setSelectedAnnotation(annotation.id)}
                      title={`${annotation.text}${annotation.label ? ` (${annotation.label})` : ""}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="review-list">
          <h4>Annotations ({filteredAnnotations.length})</h4>
          <div className="annotation-list">
            {filteredAnnotations.slice(0, 200).map((annotation) => (
              <div
                key={annotation.id}
                className={`annotation-item ${annotation.type} ${
                  selectedAnnotation === annotation.id ? "selected" : ""
                }`}
                onClick={() => setSelectedAnnotation(annotation.id)}
              >
                <span className="annotation-type">{annotation.type}</span>
                <span className="annotation-text">{annotation.text}</span>
                {annotation.label && (
                  <span className="annotation-label">{annotation.label}</span>
                )}
                {annotation.confidence !== null && annotation.confidence !== undefined && (
                  <span className="annotation-confidence">
                    {(annotation.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
            {filteredAnnotations.length > 200 && (
              <p className="truncated">
                Showing 200 of {filteredAnnotations.length} annotations
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
