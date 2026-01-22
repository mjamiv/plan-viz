import { useState, useEffect } from "react";

export default function Dashboard({ apiBase, document }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (document?.id) {
      fetchMetrics();
    }
  }, [document?.id]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/metrics/${document.id}`);
      if (!response.ok) throw new Error("Failed to fetch metrics");
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!document) {
    return <p className="empty">Upload a document to view metrics.</p>;
  }

  if (loading) {
    return <p>Loading metrics...</p>;
  }

  if (error) {
    return <p className="run-error">Error: {error}</p>;
  }

  if (!metrics || metrics.total_runs === 0) {
    return (
      <div className="dashboard">
        <h3>Performance Dashboard</h3>
        <p className="empty">No runs yet. Process the document to see metrics.</p>
      </div>
    );
  }

  const stageTypes = Object.keys(metrics.by_stage || {});

  return (
    <div className="dashboard">
      <h3>Performance Dashboard</h3>
      <p>Document: {metrics.document_filename} | Total Runs: {metrics.total_runs}</p>

      <div className="dashboard-grid">
        {stageTypes.map((stageType) => {
          const stageRuns = metrics.by_stage[stageType] || [];
          if (stageRuns.length === 0) return null;

          return (
            <div key={stageType} className="dashboard-card">
              <h4>{stageType.toUpperCase()}</h4>
              <div className="dashboard-stats">
                <div className="stat">
                  <span className="stat-value">{stageRuns.length}</span>
                  <span className="stat-label">Runs</span>
                </div>
                {stageRuns.some((r) => r.elapsed_ms) && (
                  <div className="stat">
                    <span className="stat-value">
                      {Math.min(...stageRuns.filter((r) => r.elapsed_ms).map((r) => r.elapsed_ms))}ms
                    </span>
                    <span className="stat-label">Fastest</span>
                  </div>
                )}
                {stageRuns.some((r) => r.avg_confidence) && (
                  <div className="stat">
                    <span className="stat-value">
                      {(Math.max(...stageRuns.filter((r) => r.avg_confidence).map((r) => r.avg_confidence)) * 100).toFixed(1)}%
                    </span>
                    <span className="stat-label">Best Conf.</span>
                  </div>
                )}
              </div>

              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Time</th>
                    <th>Items</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {stageRuns.map((run) => (
                    <tr key={run.run_id}>
                      <td>{run.provider || "N/A"}</td>
                      <td>{run.elapsed_ms ? `${run.elapsed_ms}ms` : "N/A"}</td>
                      <td>
                        {run.word_count || run.detection_count || run.token_count || "N/A"}
                      </td>
                      <td>
                        {run.avg_confidence
                          ? `${(run.avg_confidence * 100).toFixed(1)}%`
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <div className="dashboard-charts">
        <h4>Performance Comparison</h4>
        {stageTypes.map((stageType) => {
          const stageRuns = metrics.by_stage[stageType] || [];
          const validRuns = stageRuns.filter((r) => r.elapsed_ms);
          if (validRuns.length < 2) return null;

          const maxTime = Math.max(...validRuns.map((r) => r.elapsed_ms));

          return (
            <div key={stageType} className="chart-section">
              <h5>{stageType} - Processing Time</h5>
              <div className="bar-chart">
                {validRuns.map((run) => (
                  <div key={run.run_id} className="bar-row">
                    <span className="bar-label">{run.provider}</span>
                    <div className="bar-container">
                      <div
                        className="bar"
                        style={{ width: `${(run.elapsed_ms / maxTime) * 100}%` }}
                      />
                      <span className="bar-value">{run.elapsed_ms}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {stageTypes.map((stageType) => {
          const stageRuns = metrics.by_stage[stageType] || [];
          const validRuns = stageRuns.filter((r) => r.avg_confidence);
          if (validRuns.length < 2) return null;

          return (
            <div key={`${stageType}-conf`} className="chart-section">
              <h5>{stageType} - Confidence</h5>
              <div className="bar-chart">
                {validRuns.map((run) => (
                  <div key={run.run_id} className="bar-row">
                    <span className="bar-label">{run.provider}</span>
                    <div className="bar-container">
                      <div
                        className="bar confidence"
                        style={{ width: `${run.avg_confidence * 100}%` }}
                      />
                      <span className="bar-value">
                        {(run.avg_confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
