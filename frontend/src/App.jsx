import { useState } from "react";
import Upload from "./components/Upload.jsx";
import Viewer from "./components/Viewer.jsx";
import Comparison from "./components/Comparison.jsx";
import Dashboard from "./components/Dashboard.jsx";
import AnnotationReview from "./components/AnnotationReview.jsx";
import About from "./components/About.jsx";
import { Agentation } from "agentation";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function App() {
  const [document, setDocument] = useState(null);
  const [runs, setRuns] = useState([]);
  const [status, setStatus] = useState("");
  const [promptKey, setPromptKey] = useState("general_notes");
  const [customPrompt, setCustomPrompt] = useState("");
  const [vlmProvider, setVlmProvider] = useState("openai");
  const [vlmModel, setVlmModel] = useState("gpt-4o");
  const [apiKey, setApiKey] = useState("");
  const [ocrProvider, setOcrProvider] = useState("tesseract");
  const [pages, setPages] = useState([]);
  const [activeRunId, setActiveRunId] = useState(null);
  const [activeTab, setActiveTab] = useState("viewer");
  const [currentPage, setCurrentPage] = useState("main");

  const handleUpload = async (file) => {
    console.log("[Upload] Starting upload:", file.name, file.size, "bytes");
    setStatus("Uploading...");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch(`${API_BASE}/upload/`, {
        method: "POST",
        body: formData,
      });
      console.log("[Upload] Response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Upload] Failed:", response.status, errorText);
        setStatus("Upload failed.");
        return;
      }
      const data = await response.json();
      console.log("[Upload] Success:", data);
      setDocument(data);
      setRuns([]);
      setPages([]);
      setActiveRunId(null);
      setStatus("Uploaded. Ready to process.");
    } catch (err) {
      console.error("[Upload] Error:", err);
      setStatus(`Upload error: ${err.message}`);
    }
  };

  const handleProcess = async () => {
    if (!document) return;
    console.log("[Process] Starting for document:", document.id);
    setStatus("Processing...");
    try {
      const response = await fetch(`${API_BASE}/process/${document.id}`, {
        method: "POST",
      });
      console.log("[Process] Response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Process] Failed:", response.status, errorText);
        setStatus("Processing failed.");
        return;
      }
      const run = await response.json();
      console.log("[Process] Success:", run);
      setRuns((prev) => [run, ...prev]);
      if (run.output?.pages) {
        setPages(run.output.pages);
      }
      setActiveRunId(run.id);
      setStatus(`Run ${run.status}`);
    } catch (err) {
      console.error("[Process] Error:", err);
      setStatus(`Process error: ${err.message}`);
    }
  };

  const handleOcr = async () => {
    if (!document) return;
    console.log("[OCR] Starting for document:", document.id, "provider:", ocrProvider);
    setStatus("Running OCR...");
    try {
      const response = await fetch(`${API_BASE}/ocr/${document.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: ocrProvider }),
      });
      console.log("[OCR] Response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[OCR] Failed:", response.status, errorText);
        setStatus("OCR failed.");
        return;
      }
      const run = await response.json();
      console.log("[OCR] Success:", run);
      setRuns((prev) => [run, ...prev]);
      setActiveRunId(run.id);
      setStatus(`OCR ${run.status}`);
    } catch (err) {
      console.error("[OCR] Error:", err);
      setStatus(`OCR error: ${err.message}`);
    }
  };

  const handleVlm = async () => {
    if (!document) return;
    const payload = {
      prompt_key: promptKey,
      model: vlmModel,
      provider: vlmProvider,
      api_key: apiKey,
    };
    if (promptKey === "custom" && customPrompt) {
      payload.custom_prompt = customPrompt;
    }
    console.log("[VLM] Starting request:", { documentId: document.id, ...payload, api_key: apiKey ? "***" : "(empty)" });
    setStatus("Running VLM...");
    try {
      const response = await fetch(`${API_BASE}/vlm/${document.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("[VLM] Response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[VLM] HTTP Error:", response.status, errorText);
        setStatus("VLM failed.");
        return;
      }
      const run = await response.json();
      console.log("[VLM] Response data:", run);
      if (run.output?.error) {
        console.error("[VLM] Backend error:", run.output.error);
      }
      if (run.output?.output?.raw) {
        console.log("[VLM] Model response:", run.output.output.raw.substring(0, 500));
      }
      setRuns((prev) => [run, ...prev]);
      setActiveRunId(run.id);
      setStatus(`VLM ${run.status}`);
    } catch (err) {
      console.error("[VLM] Fetch error:", err);
      setStatus(`VLM error: ${err.message}`);
    }
  };

  if (currentPage === "about") {
    return (
      <>
        <div className="app">
          <nav className="nav">
            <button className="nav-link" onClick={() => setCurrentPage("main")}>
              Back to App
            </button>
          </nav>
          <About />
        </div>
        <Agentation />
      </>
    );
  }

  return (
    <>
      <div className="app">
        <header>
          <div className="header-row">
            <div>
              <h1>viz plan <span className="version-tag">v0</span></h1>
              <p className="tagline">PDF ingestion with VLM analysis</p>
            </div>
            <nav className="nav">
              <button className="nav-link about-btn" onClick={() => setCurrentPage("about")}>
                <span className="dance-text">
                  <span className="dance-char" style={{ animationDelay: "0ms" }}>A</span>
                  <span className="dance-char" style={{ animationDelay: "50ms" }}>b</span>
                  <span className="dance-char" style={{ animationDelay: "100ms" }}>o</span>
                  <span className="dance-char" style={{ animationDelay: "150ms" }}>u</span>
                  <span className="dance-char" style={{ animationDelay: "200ms" }}>t</span>
                </span>
              </button>
            </nav>
          </div>
        </header>

        <section className="panel control-panel">
          <div className="control-section">
            <h3 className="section-title">Document</h3>
            <div className="control-group">
              <Upload onUpload={handleUpload} />
              <button
                className="btn btn-primary"
                onClick={handleProcess}
                disabled={!document}
              >
                Render Pages
              </button>
            </div>
          </div>

          <div className="divider" />

          <div className="control-section">
            <h3 className="section-title">VLM Analysis</h3>
            <div className="control-grid">
              <div className="control-group">
                <label className="label">Provider</label>
                <select
                  className="input"
                  value={vlmProvider}
                  onChange={(event) => {
                    setVlmProvider(event.target.value);
                    setVlmModel(event.target.value === "openai" ? "gpt-4o" : "qwen2-vl:7b");
                  }}
                >
                  <option value="openai">OpenAI</option>
                  <option value="ollama">Ollama</option>
                </select>
              </div>

              {vlmProvider === "openai" && (
                <div className="control-group">
                  <label className="label">API Key</label>
                  <input
                    type="password"
                    className="input"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="sk-..."
                  />
                </div>
              )}

              <div className="control-group">
                <label className="label">Model</label>
                {vlmProvider === "openai" ? (
                  <select
                    className="input"
                    value={vlmModel}
                    onChange={(event) => setVlmModel(event.target.value)}
                  >
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </select>
                ) : (
                  <input
                    className="input"
                    value={vlmModel}
                    onChange={(event) => setVlmModel(event.target.value)}
                    placeholder="qwen2-vl:7b"
                  />
                )}
              </div>

              <div className="control-group">
                <label className="label">Prompt</label>
                <select
                  className="input"
                  value={promptKey}
                  onChange={(event) => setPromptKey(event.target.value)}
                >
                  <option value="general_notes">Pull General Notes</option>
                  <option value="drawing_contents">Identify Drawing Contents</option>
                  <option value="design_codes">List Design Codes</option>
                  <option value="component_dimensions">Component & Dimension Summary</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {promptKey === "custom" && (
                <div className="control-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Custom Prompt</label>
                  <input
                    className="input"
                    value={customPrompt}
                    onChange={(event) => setCustomPrompt(event.target.value)}
                    placeholder="Enter your custom prompt..."
                  />
                </div>
              )}

            </div>

            <div className="control-actions">
              <button
                className="btn btn-primary"
                onClick={handleVlm}
                disabled={!document}
              >
                Run VLM
              </button>
            </div>
          </div>

          <div className="divider" />

          <div className="control-section">
            <h3 className="section-title">OCR</h3>
            <div className="control-group">
              <div className="control-group" style={{ flexDirection: "column", alignItems: "stretch", gap: "6px" }}>
                <label className="label">Provider</label>
                <select
                  className="input"
                  value={ocrProvider}
                  onChange={(event) => setOcrProvider(event.target.value)}
                  style={{ width: "160px" }}
                >
                  <option value="tesseract">Tesseract</option>
                  <option value="paddleocr">PaddleOCR</option>
                  <option value="easyocr">EasyOCR</option>
                  <option value="surya">Surya</option>
                </select>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleOcr}
                disabled={!document}
                style={{ marginTop: "auto" }}
              >
                Run OCR
              </button>
            </div>
          </div>

          {status && <p className="status-text" style={{ marginTop: "16px" }}>{status}</p>}
        </section>

        <div className="tabs">
          <button
            className={`tab ${activeTab === "viewer" ? "active" : ""}`}
            onClick={() => setActiveTab("viewer")}
          >
            Viewer
          </button>
          <button
            className={`tab ${activeTab === "comparison" ? "active" : ""}`}
            onClick={() => setActiveTab("comparison")}
          >
            Compare OCR
          </button>
          <button
            className={`tab ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`tab ${activeTab === "review" ? "active" : ""}`}
            onClick={() => setActiveTab("review")}
          >
            Review
          </button>
        </div>

        <section className="panel">
          {activeTab === "viewer" && (
            <Viewer
              apiBase={API_BASE}
              document={document}
              runs={runs}
              pages={pages}
              activeRunId={activeRunId}
              onSelectRun={setActiveRunId}
            />
          )}
          {activeTab === "comparison" && (
            <Comparison
              apiBase={API_BASE}
              document={document}
              runs={runs}
            />
          )}
          {activeTab === "dashboard" && (
            <Dashboard
              apiBase={API_BASE}
              document={document}
            />
          )}
          {activeTab === "review" && (
            <AnnotationReview
              apiBase={API_BASE}
              document={document}
              runs={runs}
              pages={pages}
            />
          )}
        </section>

        <footer className="footer">
          northstar.lm | 2026
        </footer>
      </div>
      <Agentation />
    </>
  );
}
