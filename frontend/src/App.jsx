import { useState } from "react";
import Upload from "./components/Upload.jsx";
import Viewer from "./components/Viewer.jsx";
import Comparison from "./components/Comparison.jsx";
import Dashboard from "./components/Dashboard.jsx";
import AnnotationReview from "./components/AnnotationReview.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function App() {
  const [document, setDocument] = useState(null);
  const [runs, setRuns] = useState([]);
  const [status, setStatus] = useState("");
  const [ocrProvider, setOcrProvider] = useState("tesseract");
  const [promptKey, setPromptKey] = useState("room_dimensions");
  const [vlmModel, setVlmModel] = useState("qwen2-vl:7b");
  const [vlmMaxPages, setVlmMaxPages] = useState("");
  const [layoutProvider, setLayoutProvider] = useState("layoutlmv3");
  const [detectProvider, setDetectProvider] = useState("yolov8");
  const [detectTargets, setDetectTargets] = useState(
    "doors, windows, walls, outlets"
  );
  const [pages, setPages] = useState([]);
  const [activeRunId, setActiveRunId] = useState(null);
  const [activeTab, setActiveTab] = useState("viewer");

  const handleUpload = async (file) => {
    setStatus("Uploading...");
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE}/upload/`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      setStatus("Upload failed.");
      return;
    }
    const data = await response.json();
    setDocument(data);
    setRuns([]);
    setPages([]);
    setActiveRunId(null);
    setStatus("Uploaded. Ready to process.");
  };

  const handleProcess = async () => {
    if (!document) return;
    setStatus("Processing...");
    const response = await fetch(`${API_BASE}/process/${document.id}`, {
      method: "POST",
    });
    if (!response.ok) {
      setStatus("Processing failed.");
      return;
    }
    const run = await response.json();
    setRuns((prev) => [run, ...prev]);
    if (run.output?.pages) {
      setPages(run.output.pages);
    }
    setActiveRunId(run.id);
    setStatus(`Run ${run.status}`);
  };

  const handleOcr = async () => {
    if (!document) return;
    setStatus("Running OCR...");
    const response = await fetch(`${API_BASE}/ocr/${document.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: ocrProvider }),
    });
    if (!response.ok) {
      setStatus("OCR failed.");
      return;
    }
    const run = await response.json();
    setRuns((prev) => [run, ...prev]);
    setActiveRunId(run.id);
    setStatus(`OCR ${run.status}`);
  };

  const handleVlm = async () => {
    if (!document) return;
    setStatus("Running VLM...");
    const payload = { prompt_key: promptKey, model: vlmModel };
    if (vlmMaxPages && parseInt(vlmMaxPages) > 0) {
      payload.max_pages = parseInt(vlmMaxPages);
    }
    const response = await fetch(`${API_BASE}/vlm/${document.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setStatus("VLM failed.");
      return;
    }
    const run = await response.json();
    setRuns((prev) => [run, ...prev]);
    setActiveRunId(run.id);
    setStatus(`VLM ${run.status}`);
  };

  const handleLayout = async () => {
    if (!document) return;
    setStatus("Running layout analysis...");
    const response = await fetch(`${API_BASE}/layout/${document.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: layoutProvider }),
    });
    if (!response.ok) {
      setStatus("Layout failed.");
      return;
    }
    const run = await response.json();
    setRuns((prev) => [run, ...prev]);
    setActiveRunId(run.id);
    setStatus(`Layout ${run.status}`);
  };

  const handleDetect = async () => {
    if (!document) return;
    setStatus("Running detection...");
    const response = await fetch(`${API_BASE}/detect/${document.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: detectProvider,
        targets: detectTargets
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    });
    if (!response.ok) {
      setStatus("Detection failed.");
      return;
    }
    const run = await response.json();
    setRuns((prev) => [run, ...prev]);
    setActiveRunId(run.id);
    setStatus(`Detection ${run.status}`);
  };

  return (
    <div className="app">
      <header>
        <h1>Construction Vision</h1>
        <p>Baseline PDF ingestion with OCR, VLM, layout, and detection runs.</p>
      </header>
      <section className="panel">
        <Upload onUpload={handleUpload} />
        <button
          className="primary"
          onClick={handleProcess}
          disabled={!document}
        >
          Render Pages
        </button>
        <div className="row">
          <label className="select">
            <span>OCR Provider</span>
            <select
              value={ocrProvider}
              onChange={(event) => setOcrProvider(event.target.value)}
            >
              <option value="tesseract">Tesseract</option>
              <option value="paddleocr">PaddleOCR</option>
              <option value="surya">Surya</option>
              <option value="easyocr">EasyOCR</option>
            </select>
          </label>
          <button
            className="primary"
            onClick={handleOcr}
            disabled={!document}
          >
            Run OCR
          </button>
        </div>
        <div className="row">
          <label className="select">
            <span>VLM Prompt</span>
            <select
              value={promptKey}
              onChange={(event) => setPromptKey(event.target.value)}
            >
              <option value="room_dimensions">Room dimensions</option>
              <option value="title_block">Title block</option>
              <option value="electrical_layout">Electrical layout</option>
              <option value="revision_history">Revision history</option>
              <option value="drawing_scale">Drawing scale</option>
            </select>
          </label>
          <label className="select">
            <span>Model</span>
            <input
              value={vlmModel}
              onChange={(event) => setVlmModel(event.target.value)}
            />
          </label>
          <label className="select">
            <span>Max Pages</span>
            <input
              type="number"
              min="1"
              value={vlmMaxPages}
              onChange={(event) => setVlmMaxPages(event.target.value)}
              placeholder="All"
              style={{ width: "70px" }}
            />
          </label>
          <button
            className="primary"
            onClick={handleVlm}
            disabled={!document}
          >
            Run VLM
          </button>
        </div>
        <div className="row">
          <label className="select">
            <span>Layout</span>
            <select
              value={layoutProvider}
              onChange={(event) => setLayoutProvider(event.target.value)}
            >
              <option value="layoutlmv3">LayoutLMv3</option>
            </select>
          </label>
          <button
            className="primary"
            onClick={handleLayout}
            disabled={!document}
          >
            Run Layout
          </button>
        </div>
        <div className="row">
          <label className="select">
            <span>Detection</span>
            <select
              value={detectProvider}
              onChange={(event) => setDetectProvider(event.target.value)}
            >
              <option value="yolov8">YOLOv8</option>
              <option value="grounding_dino">Grounding DINO</option>
            </select>
          </label>
          <label className="select">
            <span>Targets</span>
            <input
              value={detectTargets}
              onChange={(event) => setDetectTargets(event.target.value)}
            />
          </label>
          <button
            className="primary"
            onClick={handleDetect}
            disabled={!document}
          >
            Run Detection
          </button>
        </div>
        <p className="status">{status}</p>
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
    </div>
  );
}
