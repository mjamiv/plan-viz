export default function Viewer({
  apiBase,
  document,
  runs,
  pages,
  activeRunId,
  onSelectRun,
}) {
  if (!document) {
    return <p className="empty">Upload a PDF to begin.</p>;
  }

  const activeRun =
    runs.find((run) => run.id === activeRunId) || runs[0] || null;

  const summarizeRun = (run) => {
    const output = run.output;
    if (!output) return null;
    if (output.pages && Array.isArray(output.pages)) {
      const pageCount = output.pages.length;
      if (output.pages[0]?.detections) {
        const total = output.pages.reduce(
          (sum, page) => sum + (page.detections?.length || 0),
          0
        );
        return `${pageCount} page(s), ${total} detections`;
      }
      if (output.pages[0]?.tokens) {
        const total = output.pages.reduce(
          (sum, page) => sum + (page.token_count || 0),
          0
        );
        return `${pageCount} page(s), ${total} tokens`;
      }
    }
    if (output.parsed) {
      return "Parsed JSON available";
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

  return (
    <div className="viewer">
      <h2>Document</h2>
      <dl>
        <div>
          <dt>Name</dt>
          <dd>{document.filename}</dd>
        </div>
        <div>
          <dt>Pages</dt>
          <dd>{document.page_count}</dd>
        </div>
        <div>
          <dt>Stored</dt>
          <dd>{document.stored_path}</dd>
        </div>
      </dl>
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
                <strong>{run.stage}</strong> — {run.status}
              </button>
              {summarizeRun(run) ? (
                <div className="run-summary">{summarizeRun(run)}</div>
              ) : null}
              {run.output?.error ? (
                <div className="run-error">{run.output.error}</div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <h3>Preview</h3>
      {pages.length === 0 ? (
        <p className="empty">Render pages to view overlays.</p>
      ) : (
        <div className="pages">
          {pages.map((page) => (
            <div key={page.page} className="page">
              <img src={`${apiBase}${page.url}`} alt={`Page ${page.page}`} />
              <div className="overlay">{pageOverlay(page)}</div>
            </div>
          ))}
        </div>
      )}
      {activeRun?.output?.parsed ? (
        <>
          <h3>VLM Output</h3>
          <pre className="output">
            {JSON.stringify(activeRun.output.parsed, null, 2)}
          </pre>
        </>
      ) : null}
    </div>
  );
}
