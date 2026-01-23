export default function About() {
  return (
    <div className="about">
      <h1>About viz plan</h1>

      <section className="about-section">
        <h2>Overview</h2>
        <p>
          viz plan is a PDF analysis tool designed for construction drawings
          and architectural plans. It combines modern vision-language models (VLMs)
          with traditional document processing to extract structured information
          from technical documents.
        </p>
      </section>

      <section className="about-section">
        <h2>Features</h2>
        <ul className="feature-list">
          <li>
            <strong>PDF Upload & Rendering</strong>
            <span>Upload construction PDFs and render high-quality page images</span>
          </li>
          <li>
            <strong>VLM Analysis</strong>
            <span>Extract room dimensions, title blocks, electrical layouts, and more using GPT-4o or local Ollama models</span>
          </li>
          <li>
            <strong>Multi-Page Processing</strong>
            <span>Analyze entire documents or limit to specific page ranges</span>
          </li>
          <li>
            <strong>Results Dashboard</strong>
            <span>View, compare, and export analysis results in JSON or CSV format</span>
          </li>
        </ul>
      </section>

      <section className="about-section">
        <h2>Technology</h2>
        <div className="tech-grid">
          <div className="tech-card">
            <h4>Backend</h4>
            <p>FastAPI, SQLite, pdf2image</p>
          </div>
          <div className="tech-card">
            <h4>Frontend</h4>
            <p>React, Vite</p>
          </div>
          <div className="tech-card">
            <h4>VLM Providers</h4>
            <p>OpenAI GPT-4o, Ollama</p>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2>Version</h2>
        <p className="version">v0.1.0</p>
      </section>
    </div>
  );
}
