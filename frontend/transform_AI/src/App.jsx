import { useState, useEffect, useCallback } from "react";
import "./App.css";

// Centralized Backend URL for Render Cloud Service
const API_BASE_URL = "https://sih-project-ps-154.onrender.com";

const INPUT_MODES = [
  { id: "text", label: "Direct Text", accept: null, icon: "📝" },
  { id: "txt_file", label: "Text File (.txt)", accept: ".txt,.md,.log", icon: "📄" },
  { id: "pdf", label: "PDF Document", accept: ".pdf", icon: "📑" },
  { id: "pptx", label: "PowerPoint Deck", accept: ".pptx,.ppt", icon: "📊" },
  { id: "audio", label: "Audio Track", accept: ".mp3,.wav,.m4a,.aac,.ogg,.flac", icon: "🎙️" },
  { id: "video", label: "Video File", accept: ".mp4,.mov,.mkv,.avi,.webm", icon: "🎬" },
  { id: "image", label: "Image", accept: ".png,.jpg,.jpeg,.webp", icon: "🖼️" },
];

const OUTPUT_OPTIONS = [
  { id: "plain_summary", icon: "📄", title: "Plain Text Summary", desc: "Structured readable text block" },
  { id: "text_file", icon: "💾", title: "Text File (.txt)", desc: "Clean downloadable text file" },
  { id: "audio_briefing", icon: "🎙️", title: "Audio Briefing (.mp3)", desc: "Spoken narration audio file" },
  { id: "advisory", icon: "🛡️", title: "Advisory", desc: "Formal structured guidance document" },
  { id: "executive_summary", icon: "📋", title: "Executive Summary", desc: "Concise decision briefing" },
  { id: "linkedin_post", icon: "💼", title: "LinkedIn Post", desc: "Professional social commentary" },
  { id: "x_thread", icon: "𝕏", title: "X / Twitter Thread", desc: "Distilled multi-tweet series" },
  { id: "infographic", icon: "📊", title: "Infographic Brief", desc: "Panel copy & visual design specs" },
  { id: "presentation", icon: "📑", title: "Presentation", desc: "Slides, bullet points, speaker notes" },
  { id: "video_package", icon: "🎬", title: "Video Package", desc: "Narration script & scene storyboard" },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  // Ingestion Inputs (with session storage recovery)
  const [inputMode, setInputMode] = useState(() => sessionStorage.getItem("inputMode") || "text");
  const [sourceText, setSourceText] = useState(() => sessionStorage.getItem("sourceText") || "");
  const [fileObject, setFileObject] = useState(null);
  const [fileName, setFileName] = useState("");
  const [description, setDescription] = useState(() => sessionStorage.getItem("description") || "");

  // Deliverables Selection
  const [selectedOutputs, setSelectedOutputs] = useState(() => {
    const saved = sessionStorage.getItem("selectedOutputs");
    return saved ? JSON.parse(saved) : ["plain_summary", "audio_briefing"];
  });

  // Parameters
  const [audience, setAudience] = useState(() => sessionStorage.getItem("audience") || "Cybersecurity Professionals");
  const [tone, setTone] = useState(() => sessionStorage.getItem("tone") || "Professional");
  const [language, setLanguage] = useState(() => sessionStorage.getItem("language") || "English");
  const [detail, setDetail] = useState(() => sessionStorage.getItem("detail") || "Detailed");
  const [objective, setObjective] = useState(() => sessionStorage.getItem("objective") || "Inform");

  // Output Execution States
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(() => sessionStorage.getItem("showResults") === "true");
  const [resultsData, setResultsData] = useState(() => {
    const saved = sessionStorage.getItem("resultsData");
    return saved ? JSON.parse(saved) : {};
  });
  const [plainSummaryText, setPlainSummaryText] = useState(() => sessionStorage.getItem("plainSummaryText") || "");

  // History States
  const [historyList, setHistoryList] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Synchronize state changes to sessionStorage automatically
  useEffect(() => {
    sessionStorage.setItem("inputMode", inputMode);
    sessionStorage.setItem("sourceText", sourceText);
    sessionStorage.setItem("description", description);
    sessionStorage.setItem("selectedOutputs", JSON.stringify(selectedOutputs));
    sessionStorage.setItem("audience", audience);
    sessionStorage.setItem("tone", tone);
    sessionStorage.setItem("language", language);
    sessionStorage.setItem("detail", detail);
    sessionStorage.setItem("objective", objective);
    sessionStorage.setItem("showResults", showResults);
    sessionStorage.setItem("resultsData", JSON.stringify(resultsData));
    sessionStorage.setItem("plainSummaryText", plainSummaryText);
  }, [
    inputMode, sourceText, description, selectedOutputs, audience,
    tone, language, detail, objective, showResults, resultsData, plainSummaryText
  ]);

  // Load history records from backend PostgreSQL / SQLite
  const fetchHistory = useCallback(async (query = "") => {
    setIsLoadingHistory(true);
    try {
      const url = query.trim()
        ? `${API_BASE_URL}/api/history?query=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/api/history`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setHistoryList(data.history);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (currentPage === "history") {
      fetchHistory(historySearch);
    }
  }, [currentPage, historySearch, fetchHistory]);

  const toggleOutput = (id, e) => {
    if (e) e.preventDefault();
    setSelectedOutputs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleInputModeChange = (modeId, e) => {
    if (e) e.preventDefault();
    setInputMode(modeId);
    setFileObject(null);
    setFileName("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileObject(file);
      setFileName(file.name);
    }
  };

  // Safe background blob download
  const triggerDirectDownload = async (url, fallbackFilename, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("File retrieval error");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fallbackFilename || "deliverable";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert("Failed to download file directly. Please check backend connection.");
    }
  };

  const handleTransform = async (e) => {
    if (e) e.preventDefault();

    if (inputMode === "text" && !sourceText.trim()) {
      alert("Please enter source text first.");
      return;
    }
    if (inputMode !== "text" && !fileObject) {
      alert(`Please upload a valid ${INPUT_MODES.find((m) => m.id === inputMode)?.label}.`);
      return;
    }
    if (selectedOutputs.length === 0) {
      alert("Please select at least one output format.");
      return;
    }

    setIsGenerating(true);

    const backendOutputs = selectedOutputs.map((o) =>
      o === "text_file" ? "plain_summary" : o
    );

    const formData = new FormData();
    formData.append("text_content", sourceText);
    formData.append("outputs", backendOutputs.join(","));
    formData.append("audience", audience);
    formData.append("tone", tone);
    formData.append("language", language);
    formData.append("detail", detail);
    formData.append("objective", objective);
    formData.append("description", description);

    if (fileObject) {
      formData.append("file", fileObject);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/transform`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP status ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        const adjustedResults = { ...data.results };
        if (adjustedResults["plain_summary"]) {
          setPlainSummaryText(adjustedResults["plain_summary"].text || "");
          if (selectedOutputs.includes("text_file")) {
            adjustedResults["text_file"] = adjustedResults["plain_summary"];
          }
        }
        setResultsData(adjustedResults);
        setShowResults(true);
      } else {
        alert("Transformation failed on the backend.");
      }
    } catch (err) {
      console.error(err);
      alert("Could not connect to backend server. If Render was idle, please allow 30-50 seconds for the free-tier instance to wake up, then try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Restore past session directly into Dashboard
  const restoreSession = (item) => {
    setAudience(item.parameters.audience || "General Public");
    setTone(item.parameters.tone || "Professional");
    setLanguage(item.parameters.language || "English");
    setDetail(item.parameters.detail || "Detailed");
    setObjective(item.parameters.objective || "Inform");
    setDescription(item.parameters.description || "");
    setSelectedOutputs(item.selectedOutputs || []);
    setResultsData(item.results || {});
    if (item.results?.plain_summary) {
      setPlainSummaryText(item.results.plain_summary.text || "");
    }
    setShowResults(true);
    setSelectedHistoryItem(null);
    setCurrentPage("dashboard");
  };

  const deleteHistoryRecord = async (id, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!window.confirm("Are you sure you want to delete this history record?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/history/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedHistoryItem?.id === id) setSelectedHistoryItem(null);
        fetchHistory(historySearch);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">⚡</div>
          <div>
            <h1>TransformAI</h1>
            <span>Content Intelligence Platform</span>
          </div>
        </div>

        <nav className="navigation">
          <button
            type="button"
            className={`nav-item ${currentPage === "dashboard" ? "active" : ""}`}
            onClick={(e) => { e.preventDefault(); setCurrentPage("dashboard"); }}
          >
            <span>⌂</span> Dashboard
          </button>

          <button
            type="button"
            className={`nav-item ${currentPage === "history" ? "active" : ""}`}
            onClick={(e) => { e.preventDefault(); setCurrentPage("history"); }}
          >
            <span>🕒</span> History
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="status">
            <span className="status-dot"></span> AI Engine Ready
          </div>
        </div>
      </aside>

      <main className="main">
        {/* ===================== DASHBOARD VIEW ===================== */}
        {currentPage === "dashboard" && (
          <div>
            <header className="topbar">
              <div>
                <p className="eyebrow">CONTENT TRANSFORMATION STUDIO</p>
                <h2>Transform information into communication.</h2>
                <p className="subtitle">Single Multimodal Source • Multi-Artifact Delivery</p>
              </div>
              <div className="topbar-badge">
                <span className="live-dot"></span> System Connected
              </div>
            </header>

            <section className="workspace">
              {/* SECTION 01: INPUT CONTROLS */}
              <div className="panel source-panel">
                <div className="section-heading">
                  <div>
                    <span className="step">01</span>
                    <div>
                      <h3>Source Content</h3>
                      <p>Select input type, insert source content, and add optional directives.</p>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                  {INPUT_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={(e) => handleInputModeChange(m.id, e)}
                      style={{
                        border: inputMode === m.id ? "2px solid #2563eb" : "1px solid #cbd5e1",
                        background: inputMode === m.id ? "#eff6ff" : "#ffffff",
                        color: inputMode === m.id ? "#1e40af" : "#475569",
                        padding: "8px 14px",
                        borderRadius: "8px",
                        fontWeight: 600,
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <span>{m.icon}</span> {m.label}
                    </button>
                  ))}
                </div>

                {inputMode === "text" ? (
                  <textarea
                    key="source-text-input"
                    className="source-textarea"
                    placeholder="Enter source text here..."
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    rows={8}
                  />
                ) : (
                  <div
                    style={{
                      border: "2px dashed #93c5fd",
                      background: "#f8fafc",
                      borderRadius: "12px",
                      padding: "32px 18px",
                      textAlign: "center"
                    }}
                  >
                    <div style={{ fontSize: "36px", marginBottom: "6px" }}>
                      {INPUT_MODES.find((m) => m.id === inputMode)?.icon}
                    </div>
                    <strong style={{ display: "block", fontSize: "14px", color: "#1e293b" }}>
                      Upload {INPUT_MODES.find((m) => m.id === inputMode)?.label}
                    </strong>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 16px" }}>
                      Permitted file types: {INPUT_MODES.find((m) => m.id === inputMode)?.accept}
                    </p>

                    <label className="upload-button" style={{ display: "inline-block", cursor: "pointer" }}>
                      {fileName ? "Change File" : "Choose File"}
                      <input
                        type="file"
                        accept={INPUT_MODES.find((m) => m.id === inputMode)?.accept}
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                      />
                    </label>

                    {fileName && (
                      <div className="file-preview" style={{ maxWidth: "420px", margin: "16px auto 0" }}>
                        <span>📁</span>
                        <div>
                          <strong>{fileName}</strong>
                          <small>Ready for processing</small>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: "18px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700, color: "#374151" }}>
                    🎯 Description / Directives (Optional)
                  </label>
                  <textarea
                    key="description-text-input"
                    rows={3}
                    placeholder="Enter optional focus directives..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: "12px",
                      lineHeight: "1.5",
                      outline: "none",
                      resize: "vertical",
                      color: "#1e293b"
                    }}
                  />
                </div>
              </div>

              {/* SECTION 02: DELIVERABLES SELECTION */}
              <div className="panel">
                <div className="section-heading">
                  <div>
                    <span className="step">02</span>
                    <div>
                      <h3>Target Deliverable Formats</h3>
                      <p>Select the outputs to generate from the input.</p>
                    </div>
                  </div>
                  <span className="selection-count">{selectedOutputs.length} selected</span>
                </div>

                <div className="output-grid">
                  {OUTPUT_OPTIONS.map((option) => {
                    const selected = selectedOutputs.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`output-card ${selected ? "selected" : ""}`}
                        onClick={(e) => toggleOutput(option.id, e)}
                      >
                        <div className="output-top">
                          <span className="output-icon">{option.icon}</span>
                          <span className={`checkbox ${selected ? "checked" : ""}`}>
                            {selected ? "✓" : ""}
                          </span>
                        </div>
                        <strong>{option.title}</strong>
                        <small>{option.desc}</small>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 03: PARAMETERS */}
              <div className="panel">
                <div className="section-heading">
                  <div>
                    <span className="step">03</span>
                    <div>
                      <h3>Transformation Parameters</h3>
                      <p>Configure audience, tone, and synthesis attributes.</p>
                    </div>
                  </div>
                </div>

                <div className="parameters-grid">
                  <label>
                    <span>Target Audience</span>
                    <select value={audience} onChange={(e) => setAudience(e.target.value)}>
                      <option>Cybersecurity Professionals</option>
                      <option>General Public</option>
                      <option>Students</option>
                      <option>Government Officials</option>
                      <option>Executives</option>
                      <option>Technical Professionals</option>
                    </select>
                  </label>

                  <label>
                    <span>Tone</span>
                    <select value={tone} onChange={(e) => setTone(e.target.value)}>
                      <option>Professional</option>
                      <option>Technical</option>
                      <option>Educational</option>
                      <option>Urgent</option>
                      <option>Public Awareness</option>
                    </select>
                  </label>

                  <label>
                    <span>Language</span>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                      <option>English</option>
                      <option>Tamil</option>
                      <option>Hindi</option>
                      <option>Malayalam</option>
                      <option>Telugu</option>
                    </select>
                  </label>

                  <label>
                    <span>Level of Detail</span>
                    <select value={detail} onChange={(e) => setDetail(e.target.value)}>
                      <option>Detailed</option>
                      <option>Brief</option>
                      <option>Balanced</option>
                      <option>Highly Detailed</option>
                    </select>
                  </label>

                  <label className="wide-field">
                    <span>Communication Objective</span>
                    <select value={objective} onChange={(e) => setObjective(e.target.value)}>
                      <option>Inform</option>
                      <option>Warn</option>
                      <option>Educate</option>
                      <option>Summarize</option>
                      <option>Public Awareness</option>
                      <option>Executive Decision Support</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* GENERATION TRIGGER */}
              <div className="generate-area">
                <div>
                  <strong>Ready to transform?</strong>
                  <p>Parameters and directives will guide the synthesis engine.</p>
                </div>
                <button
                  type="button"
                  className="generate-button"
                  onClick={handleTransform}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <span className="spinner"></span> Transforming...
                    </>
                  ) : (
                    <>⚡ Transform Content</>
                  )}
                </button>
              </div>

              {/* SECTION 04: GENERATED OUTPUTS */}
              {showResults && (
                <section className="results-section">
                  <div className="results-heading">
                    <div>
                      <span className="step">04</span>
                      <div>
                        <h3>Generated Artefacts</h3>
                        <p>Artifacts produced by the multimodal transformation engine.</p>
                      </div>
                    </div>
                    <span className="success-badge">✓ Transformation Complete</span>
                  </div>

                  {selectedOutputs.includes("plain_summary") && resultsData["plain_summary"] && (
                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid #93c5fd",
                        borderRadius: "14px",
                        padding: "20px",
                        marginBottom: "24px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div>
                          <strong style={{ fontSize: "15px", color: "#1e3a8a" }}>📄 Plain Text Summary Deliverable</strong>
                          <span style={{ display: "block", fontSize: "11px", color: "#64748b" }}>
                            Editable text summary
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="upload-button"
                            onClick={(e) => {
                              e.preventDefault();
                              navigator.clipboard.writeText(plainSummaryText);
                            }}
                          >
                            Copy Text
                          </button>
                          {resultsData["plain_summary"].downloadUrl && (
                            <button
                              type="button"
                              className="upload-button"
                              onClick={(e) =>
                                triggerDirectDownload(
                                  resultsData["plain_summary"].downloadUrl,
                                  "plain_summary.txt",
                                  e
                                )
                              }
                            >
                              Download TXT
                            </button>
                          )}
                        </div>
                      </div>

                      <textarea
                        key="plain-summary-editable-output"
                        style={{
                          width: "100%",
                          minHeight: "180px",
                          fontFamily: "monospace",
                          fontSize: "12.5px",
                          padding: "14px",
                          borderRadius: "10px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          lineHeight: "1.6",
                          color: "#0f172a",
                          resize: "vertical"
                        }}
                        value={plainSummaryText}
                        onChange={(e) => setPlainSummaryText(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="results-grid">
                    {selectedOutputs
                      .filter((id) => id !== "plain_summary")
                      .map((id) => {
                        const res = resultsData[id];
                        const opt = OUTPUT_OPTIONS.find((item) => item.id === id);

                        return (
                          <article className="result-card" key={id}>
                            <div className="result-card-header">
                              <div>
                                <span className="result-icon">{opt?.icon}</span>
                                <div>
                                  <h4>{opt?.title}</h4>
                                  <span>{audience} • {tone}</span>
                                </div>
                              </div>
                            </div>

                            <div className="result-content">
                              {id === "audio_briefing" && res && res.status === "ok" && res.downloadUrl && (
                                <div style={{ marginBottom: "12px" }}>
                                  <audio
                                    controls
                                    style={{ width: "100%", height: "36px", borderRadius: "8px" }}
                                    src={res.downloadUrl}
                                  />
                                </div>
                              )}

                              <p style={{ whiteSpace: "pre-wrap", maxHeight: "240px", overflowY: "auto" }}>
                                {res ? (res.status === "ok" ? res.text : `Error: ${res.message}`) : "Processing..."}
                              </p>
                            </div>

                            <div className="result-actions">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (res && res.text) navigator.clipboard.writeText(res.text);
                                }}
                              >
                                Copy
                              </button>
                              {res && res.downloadUrl && (
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    triggerDirectDownload(res.downloadUrl, res.filename, e)
                                  }
                                >
                                  Download
                                </button>
                              )}
                            </div>
                          </article>
                        );
                      })}
                  </div>
                </section>
              )}
            </section>
          </div>
        )}

        {/* ===================== HISTORY VIEW ===================== */}
        {currentPage === "history" && (
          <div>
            <header className="topbar">
              <div>
                <p className="eyebrow">PERSISTENT TRANSACTION LEDGER</p>
                <h2>Transformation History & Artefacts</h2>
                <p className="subtitle">Search and inspect all previous synthesis operations.</p>
              </div>
              <button
                type="button"
                className="upload-button"
                onClick={() => fetchHistory(historySearch)}
              >
                🔄 Refresh
              </button>
            </header>

            <section className="workspace">
              {/* Search Bar */}
              <div className="panel" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <span style={{ fontSize: "18px" }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search by keyword, date (e.g. 2026-09-26), timestamp, or format (e.g. audio, pdf)..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    style={{
                      width: "100%",
                      border: "none",
                      outline: "none",
                      fontSize: "13.5px",
                      color: "#1e293b",
                      background: "transparent"
                    }}
                  />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => setHistorySearch("")}
                      style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8" }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* History Compact List */}
              {isLoadingHistory ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  <span className="spinner"></span> Loading history records...
                </div>
              ) : historyList.length === 0 ? (
                <div className="panel" style={{ textAlign: "center", padding: "48px 24px", color: "#64748b" }}>
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>📭</div>
                  <strong>No transformations found</strong>
                  <p style={{ fontSize: "13px", marginTop: "4px" }}>
                    {historySearch ? "Try adjusting your search criteria." : "Run your first transformation to see history records here."}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {historyList.map((item, index) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedHistoryItem(item)}
                      style={{
                        background: "#ffffff",
                        border: selectedHistoryItem?.id === item.id ? "2px solid #2563eb" : "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "16px 20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                        {/* Serial Number Badge */}
                        <span
                          style={{
                            background: "#f1f5f9",
                            color: "#475569",
                            fontWeight: 700,
                            fontSize: "12px",
                            padding: "6px 10px",
                            borderRadius: "8px",
                            minWidth: "32px",
                            textAlign: "center"
                          }}
                        >
                          #{index + 1}
                        </span>

                        <span style={{ fontSize: "22px" }}>
                          {item.inputType === "text" ? "📝" : "📁"}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <strong style={{ fontSize: "13.5px", color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.sourcePreview}
                            </strong>
                            <span style={{ fontSize: "11px", color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: "6px" }}>
                              {item.timestamp}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {item.selectedOutputs.map((out) => {
                              const opt = OUTPUT_OPTIONS.find((o) => o.id === out);
                              return (
                                <span
                                  key={out}
                                  style={{
                                    fontSize: "11px",
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    background: "#eff6ff",
                                    color: "#1e40af",
                                    fontWeight: 500
                                  }}
                                >
                                  {opt ? `${opt.icon} ${opt.title}` : out}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px", marginLeft: "12px" }}>
                        <button
                          type="button"
                          className="upload-button"
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHistoryItem(item);
                          }}
                        >
                          View Artefacts
                        </button>
                        <button
                          type="button"
                          onClick={(e) => deleteHistoryRecord(item.id, e)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#ef4444",
                            cursor: "pointer",
                            padding: "6px",
                            borderRadius: "6px"
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Detailed Inspection Drawer */}
              {selectedHistoryItem && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    width: "560px",
                    maxWidth: "90vw",
                    height: "100vh",
                    background: "#ffffff",
                    boxShadow: "-8px 0 24px rgba(0,0,0,0.12)",
                    padding: "28px",
                    overflowY: "auto",
                    zIndex: 1000,
                    display: "flex",
                    flexDirection: "column"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div>
                      <h3 style={{ margin: "0", fontSize: "18px" }}>Operation Artefacts</h3>
                      <small style={{ color: "#64748b" }}>{selectedHistoryItem.timestamp}</small>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedHistoryItem(null)}
                      style={{ border: "none", background: "#f1f5f9", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontWeight: 700 }}
                    >
                      ✕ Close
                    </button>
                  </div>

                  {/* Metadata / Source */}
                  <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", marginBottom: "20px", fontSize: "12px" }}>
                    <div style={{ marginBottom: "6px" }}>
                      <strong>Source Context: </strong>
                      <span style={{ color: "#334155" }}>{selectedHistoryItem.sourcePreview}</span>
                    </div>
                    <div>
                      <strong>Parameters: </strong>
                      <span style={{ color: "#334155" }}>
                        {selectedHistoryItem.parameters.audience} • {selectedHistoryItem.parameters.tone} • {selectedHistoryItem.parameters.language}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <button
                      type="button"
                      className="generate-button"
                      style={{ width: "100%", padding: "10px", fontSize: "13px" }}
                      onClick={() => restoreSession(selectedHistoryItem)}
                    >
                      ↺ Restore this run to Active Dashboard
                    </button>
                  </div>

                  <h4 style={{ fontSize: "14px", marginBottom: "12px", color: "#0f172a" }}>Generated Deliverables</h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {selectedHistoryItem.selectedOutputs.map((outId) => {
                      const res = selectedHistoryItem.results[outId];
                      const opt = OUTPUT_OPTIONS.find((o) => o.id === outId);
                      if (!res) return null;

                      return (
                        <div
                          key={outId}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            padding: "14px",
                            background: "#ffffff"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <strong style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>{opt?.icon}</span> {opt?.title || outId}
                            </strong>
                            {res.downloadUrl && (
                              <button
                                type="button"
                                className="upload-button"
                                style={{ padding: "4px 10px", fontSize: "11px" }}
                                onClick={(e) => triggerDirectDownload(res.downloadUrl, res.filename, e)}
                              >
                                Download
                              </button>
                            )}
                          </div>

                          {outId === "audio_briefing" && res.downloadUrl && (
                            <div style={{ margin: "10px 0" }}>
                              <audio controls style={{ width: "100%", height: "34px" }} src={res.downloadUrl} />
                            </div>
                          )}

                          <pre
                            style={{
                              background: "#f8fafc",
                              padding: "10px",
                              borderRadius: "8px",
                              fontSize: "11.5px",
                              maxHeight: "180px",
                              overflowY: "auto",
                              whiteSpace: "pre-wrap",
                              fontFamily: "inherit",
                              color: "#334155",
                              border: "1px solid #f1f5f9"
                            }}
                          >
                            {res.text || "No preview text stored."}
                          </pre>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        <footer>
          <span>TransformAI • Gen AI Content Transformation Platform</span>
          <span>SIH 2026 Evaluation Prototype</span>
        </footer>
      </main>
    </div>
  );
}