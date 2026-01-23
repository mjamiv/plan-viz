import { useState, useEffect, useCallback } from "react";

export default function Viewer({
  apiBase,
  document,
  runs,
  pages,
  activeRunId,
  onSelectRun,
}) {
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const zoomIn = () => setZoom((z) => Math.min(z + 25, 400));
  const zoomOut = () => setZoom((z) => Math.max(z - 25, 25));
  const resetZoom = () => setZoom(100);

  const handleMouseDown = (e) => {
    if (e.target.closest('.page-container')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      const container = e.target.closest('.page-container');
      setScrollStart({ x: container.scrollLeft, y: container.scrollTop });
    }
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    const container = document.querySelector('.page-container');
    if (container) {
      container.scrollLeft = scrollStart.x - (e.clientX - panStart.x);
      container.scrollTop = scrollStart.y - (e.clientY - panStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const toggleFullscreen = () => setIsFullscreen((f) => !f);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  if (!document) {
    return <p className="empty">Upload a PDF to begin.</p>;
  }

  const activeRun =
    runs.find((run) => run.id === activeRunId) || runs[0] || null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getVlmResults = (run) => {
    if (!run?.output) return null;

    // Check for VLM-specific output structure
    if (run.output.pages && Array.isArray(run.output.pages)) {
      const results = [];
      run.output.pages.forEach((page) => {
        if (page.output?.parsed) {
          results.push({ page: page.page, data: page.output.parsed });
        } else if (page.output?.raw) {
          results.push({ page: page.page, raw: page.output.raw });
        }
      });
      if (results.length > 0) return results;
    }

    // Fallback to direct parsed output
    if (run.output.parsed) {
      return run.output.parsed;
    }

    return null;
  };

  const formatRunLabel = (stage) => {
    // Extract meaningful label from stage like "vlm:gpt-4o:drawing_contents"
    const parts = stage.split(":");
    if (parts[0] === "vlm" && parts.length >= 3) {
      const promptKey = parts.slice(2).join(":");
      const labels = {
        "general_notes": "General Notes",
        "drawing_contents": "Drawing Contents",
        "design_codes": "Design Codes",
        "component_dimensions": "Components & Dimensions",
        "custom": "Custom Prompt",
      };
      return labels[promptKey] || promptKey;
    }
    return stage;
  };

  const summarizeRun = (run) => {
    const output = run.output;
    if (!output) return null;
    if (output.error) return null;

    if (output.metrics?.elapsed_ms) {
      const seconds = (output.metrics.elapsed_ms / 1000).toFixed(1);
      const pageCount = output.metrics.page_count || 1;
      return `${pageCount} page(s) analyzed in ${seconds}s`;
    }
    if (output.metrics?.word_count) {
      const pageCount = output.metrics.page_count ?? output.pages?.length ?? 0;
      return `${pageCount} page(s), ${output.metrics.word_count} words`;
    }
    if (output.parsed) {
      return "Results available";
    }
    return null;
  };

  const pageOverlay = (page) => {
    if (!activeRun?.output?.pages) return null;
    const pageOutput = activeRun.output.pages.find(
      (item) => item.page === page.page
    );
    if (!pageOutput) return null;

    const overlays = [];
    if (pageOutput.detections && page.width && page.height) {
      pageOutput.detections.forEach((det, index) => {
        const [x1, y1, x2, y2] = det.bbox;
        const left = (x1 / page.width) * 100;
        const top = (y1 / page.height) * 100;
        const width = ((x2 - x1) / page.width) * 100;
        const height = ((y2 - y1) / page.height) * 100;
        overlays.push(
          <div
            key={`det-${index}`}
            className="overlay-box detection"
            style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
            title={`${det.label} (${(det.confidence * 100).toFixed(1)}%)`}
          />
        );
      });
    }
    if (pageOutput.words && page.width && page.height) {
      pageOutput.words.slice(0, 400).forEach((word, index) => {
        const [x1, y1, x2, y2] = word.bbox;
        const left = (x1 / page.width) * 100;
        const top = (y1 / page.height) * 100;
        const width = ((x2 - x1) / page.width) * 100;
        const height = ((y2 - y1) / page.height) * 100;
        overlays.push(
          <div
            key={`ocr-${index}`}
            className="overlay-box ocr"
            style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
            title={word.text}
          />
        );
      });
    }
    if (pageOutput.tokens) {
      pageOutput.tokens.slice(0, 300).forEach((token, index) => {
        const [x1, y1, x2, y2] = token.bbox;
        const left = x1 / 10;
        const top = y1 / 10;
        const width = (x2 - x1) / 10;
        const height = (y2 - y1) / 10;
        overlays.push(
          <div
            key={`tok-${index}`}
            className="overlay-box layout"
            style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
            title={`${token.word} (${token.label})`}
          />
        );
      });
    }
    return overlays;
  };

  const vlmResults = activeRun ? getVlmResults(activeRun) : null;

  return (
    <div className="viewer">
      <div className="viewer-header">
        <div className="doc-meta">
          <span className="meta-item">{document.filename}</span>
          <span className="meta-divider">·</span>
          <span className="meta-item">{document.page_count} pages</span>
        </div>
        {runs.length > 0 && (
          <div className="exports">
            <a className="button" href={`${apiBase}/results/${document.id}/export.csv`}>
              CSV
            </a>
            <a className="button" href={`${apiBase}/results/${document.id}/export.json`}>
              JSON
            </a>
          </div>
        )}
      </div>

      <div className="viewer-layout">
        <div className="viewer-sidebar">
          <h3>Runs</h3>
          {runs.length === 0 ? (
            <p className="empty">No runs yet.</p>
          ) : (
            <ul className="runs">
              {runs.map((run) => (
                <li key={run.id}>
                  <button
                    type="button"
                    className={run.id === activeRun?.id ? "run active" : "run"}
                    onClick={() => onSelectRun(run.id)}
                  >
                    <span className="run-label">{formatRunLabel(run.stage)}</span>
                    <span className={`run-status ${run.status}`}>{run.status}</span>
                  </button>
                  {summarizeRun(run) && (
                    <div className="run-summary">{summarizeRun(run)}</div>
                  )}
                  {run.output?.error && (
                    <div className="run-error">{run.output.error}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="viewer-main">
          {vlmResults && (
            <div className="results-panel">
              <div className="results-header">
                <h3>Results</h3>
                <div className="results-actions">
                  {activeRun?.output?.artifact?.url && (
                    <a
                      className="btn-link"
                      href={`${apiBase}${activeRun.output.artifact.url}`}
                    >
                      Download
                    </a>
                  )}
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(JSON.stringify(vlmResults, null, 2))}
                  >
                    {copied ? "Copied!" : "Copy JSON"}
                  </button>
                </div>
              </div>
              <div className="results-content">
                {Array.isArray(vlmResults) ? (
                  vlmResults.map((result, idx) => (
                    <div key={idx} className="result-card">
                      <div className="result-card-header">
                        <span className="result-page">Page {result.page}</span>
                      </div>
                      <div className="result-card-body">
                        {result.data ? (
                          <pre>{JSON.stringify(result.data, null, 2)}</pre>
                        ) : result.raw ? (
                          <pre className="result-raw">{result.raw}</pre>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="result-card">
                    <div className="result-card-body">
                      <pre>{JSON.stringify(vlmResults, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {pages.length > 0 && (
            <>
              {!isFullscreen && (
                <div className="pdf-controls">
                  <button onClick={zoomOut} disabled={zoom <= 25} title="Zoom out">
                    −
                  </button>
                  <span className="zoom-level">{zoom}%</span>
                  <button onClick={zoomIn} disabled={zoom >= 400} title="Zoom in">
                    +
                  </button>
                  <button onClick={resetZoom} title="Fit to width" className="btn-text">
                    Fit
                  </button>
                  <span className="divider" />
                  <button
                    onClick={() => setCurrentPageIndex((i) => Math.max(0, i - 1))}
                    disabled={currentPageIndex === 0}
                    title="Previous page"
                  >
                    ‹
                  </button>
                  <span className="zoom-level">
                    {currentPageIndex + 1} / {pages.length}
                  </span>
                  <button
                    onClick={() => setCurrentPageIndex((i) => Math.min(pages.length - 1, i + 1))}
                    disabled={currentPageIndex >= pages.length - 1}
                    title="Next page"
                  >
                    ›
                  </button>
                  <span className="divider" />
                  <button onClick={toggleFullscreen} title="Fullscreen" className="btn-text fullscreen-btn">
                    Fullscreen
                  </button>
                </div>
              )}
              {isFullscreen && (
                <>
                  <div className="fullscreen-controls">
                    <button onClick={zoomOut} disabled={zoom <= 25} title="Zoom out">
                      −
                    </button>
                    <span className="zoom-level">{zoom}%</span>
                    <button onClick={zoomIn} disabled={zoom >= 400} title="Zoom in">
                      +
                    </button>
                    <button onClick={resetZoom} title="Fit to width" className="btn-text">
                      Fit
                    </button>
                    <span className="divider" />
                    <button
                      onClick={() => setCurrentPageIndex((i) => Math.max(0, i - 1))}
                      disabled={currentPageIndex === 0}
                      title="Previous page"
                    >
                      ‹
                    </button>
                    <span className="zoom-level">
                      {currentPageIndex + 1} / {pages.length}
                    </span>
                    <button
                      onClick={() => setCurrentPageIndex((i) => Math.min(pages.length - 1, i + 1))}
                      disabled={currentPageIndex >= pages.length - 1}
                      title="Next page"
                    >
                      ›
                    </button>
                  </div>
                  <button className="exit-fullscreen-btn" onClick={toggleFullscreen} title="Exit fullscreen (ESC)">
                    ✕
                  </button>
                </>
              )}
              <div
                className={`page-container ${isPanning ? 'grabbing' : ''} ${isFullscreen ? 'fullscreen' : ''}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {pages.map((page, idx) => (
                  <div
                    key={page.page}
                    className="page"
                    style={{
                      transform: `scale(${zoom / 100})`,
                      display: idx === currentPageIndex ? "block" : "none",
                    }}
                  >
                    <img src={`${apiBase}${page.url}`} alt={`Page ${page.page}`} />
                    <div className="overlay">{pageOverlay(page)}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!vlmResults && pages.length === 0 && (
            <p className="empty">Render pages or run VLM analysis to see results.</p>
          )}
        </div>
      </div>
    </div>
  );
}
