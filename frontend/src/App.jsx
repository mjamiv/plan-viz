import { useState } from "react";
import Upload from "./components/Upload.jsx";
import Viewer from "./components/Viewer.jsx";
import Comparison from "./components/Comparison.jsx";
import Dashboard from "./components/Dashboard.jsx";
import AnnotationReview from "./components/AnnotationReview.jsx";
import { Agentation } from "agentation";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function App() {
  const [document, setDocument] = useState(null);
  const [runs, setRuns] = useState([]);
  const [status, setStatus] = useState("");
  const [promptKey, setPromptKey] = useState("room_dimensions");
  const [vlmProvider, setVlmProvider] = useState("openai");
  const [vlmModel, setVlmModel] = useState("gpt-4o");
  const [apiKey, setApiKey] = useState("");
  const [vlmMaxPages, setVlmMaxPages] = useState("");
  const [pages, setPages] = useState([]);
  const [activeRunId, setActiveRunId] = useState(null);
  const [activeTab, setActiveTab] = useState("viewer");

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

  const handleVlm = async () => {
    if (!document) return;
    const payload = {
      prompt_key: promptKey,
      model: vlmModel,
      provider: vlmProvider,
      api_key: apiKey,
    };
    if (vlmMaxPages && parseInt(vlmMaxPages) > 0) {
      payload.max_pages = parseInt(vlmMaxPages);
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

  return (
    <>
      <div className="app">
      <header>
        <h1>viz plan - v0</h1>
        <p>PDF ingestion with VLM analysis.</p>
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
            <span>VLM Provider</span>
            <select
              value={vlmProvider}
              onChange={(event) => {
                setVlmProvider(event.target.value);
                setVlmModel(event.target.value === "openai" ? "gpt-4o" : "qwen2-vl:7b");
              }}
            >
              <option value="openai">OpenAI</option>
              <option value="ollama">Ollama</option>
            </select>
          </label>
          {vlmProvider === "openai" && (
            <label className="select">
              <span>API Key</span>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-..."
              />
            </label>
          )}
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
            {vlmProvider === "openai" ? (
              <select
                value={vlmModel}
                onChange={(event) => setVlmModel(event.target.value)}
              >
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
              </select>
            ) : (
              <input
                value={vlmModel}
                onChange={(event) => setVlmModel(event.target.value)}
                placeholder="qwen2-vl:7b"
              />
            )}
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
      <Agentation />
    </>
  );
}
