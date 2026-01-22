import { useState, useEffect } from "react";

export default function Comparison({ apiBase, document, runs }) {
  const [selectedRuns, setSelectedRuns] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);

  // Filter OCR runs only
  const ocrRuns = runs.filter((run) => run.stage.startsWith("ocr:"));

  useEffect(() => {
    if (selectedRuns.length >= 2) {
      loadComparisonData();
    }
  }, [selectedRuns]);

  const loadComparisonData = async () => {
    // Extract words from selected runs for comparison
    const data = selectedRuns.map((runId) => {
      const run = runs.find((r) => r.id === runId);
      if (!run?.output?.pages) return null;
      return {
        runId,
        stage: run.stage,
        provider: run.stage.split(":")[1] || "unknown",
        pages: run.output.pages,
        metrics: run.output.metrics,
      };
    }).filter(Boolean);
    setComparisonData(data);
  };

  const toggleRunSelection = (runId) => {
    setSelectedRuns((prev) =>
      prev.includes(runId)
        ? prev.filter((id) => id !== runId)
        : [...prev, runId]
    );
  };

  const getWordCount = (data) => {
    if (!data?.pages) return 0;
    return data.pages.reduce((sum, page) => sum + (page.words?.length || 0), 0);
  };

  const getAvgConfidence = (data) => {
    if (!data?.pages) return null;
    const confidences = [];
    data.pages.forEach((page) => {
      (page.words || []).forEach((word) => {
        if (word.confidence !== null && word.confidence !== undefined) {
          confidences.push(word.confidence);
        }
      });
    });
    if (confidences.length === 0) return null;
    return (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2);
  };

  if (!document) {
    return <p className="empty">Upload a document first.</p>;
  }

  if (ocrRuns.length < 2) {
    return (
      <div className="comparison">
        <h3>Side-by-Side OCR Comparison</h3>
        <p className="empty">
          Run OCR with at least 2 different providers to compare results.
        </p>
      </div>
    );
  }

  return (
    <div className="comparison">
      <h3>Side-by-Side OCR Comparison</h3>
      <p>Select runs to compare:</p>
      <div className="comparison-select">
        {ocrRuns.map((run) => (
          <label key={run.id} className="comparison-option">
            <input
              type="checkbox"
              checked={selectedRuns.includes(run.id)}
              onChange={() => toggleRunSelection(run.id)}
            />
            <span>{run.stage.split(":")[1] || run.stage}</span>
          </label>
        ))}
      </div>

      {comparisonData && comparisonData.length >= 2 && (
        <>
          <div className="comparison-summary">
            <h4>Summary</h4>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Words Found</th>
                  <th>Avg Confidence</th>
                  <th>Time (ms)</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((data) => (
                  <tr key={data.runId}>
                    <td>{data.provider}</td>
                    <td>{getWordCount(data)}</td>
                    <td>{getAvgConfidence(data) || "N/A"}</td>
                    <td>{data.metrics?.elapsed_ms || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="comparison-grid">
            {comparisonData.map((data) => (
              <div key={data.runId} className="comparison-column">
                <h4>{data.provider}</h4>
                <div className="comparison-text">
                  {data.pages?.map((page) => (
                    <div key={page.page} className="comparison-page">
                      <strong>Page {page.page}</strong>
                      <p>
                        {(page.words || [])
                          .map((w) => w.text)
                          .join(" ")
                          .slice(0, 500)}
                        {(page.words || []).length > 0 && "..."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
