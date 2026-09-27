import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./HeroSection.css";

// Document query variations for interactive exploration
const DOCUMENT_QUERIES = {
  default: {
    id: "default",
    question: "What is photosynthesis?",
    leadText: "Photosynthesis is the process by which plants convert ",
    highlightText: "light energy",
    tailText: " into chemical energy. Chlorophyll absorbs the light energy that drives the reactions involved in producing chemical energy for the plant.",
    evidenceQuote: "“Light energy is absorbed by chlorophyll molecules, which are primarily synthesized within plant leaves.”",
    sourceRef: "Page 12 · Photosynthesis",
    source: "Grounded in · Chapter 04 · Photosynthesis"
  },
  chlorophyll: {
    id: "chlorophyll",
    buttonLabel: "What role does chlorophyll play?",
    question: "What role does chlorophyll play?",
    leadText: "",
    highlightText: "Chlorophyll absorbs light energy",
    tailText: " that drives the reactions involved in producing chemical energy for the plant.",
    evidenceQuote: "“Chlorophyll molecules capture photons within the thylakoid membrane to drive photosynthetic phosphorylation.”",
    sourceRef: "Page 12 · Photosynthesis",
    source: "Grounded in · Chapter 04 · Photosynthesis"
  },
  energy: {
    id: "energy",
    buttonLabel: "How does light energy become chemical energy?",
    question: "How does light energy become chemical energy?",
    leadText: "",
    highlightText: "Light energy absorbed by chlorophyll",
    tailText: " drives the reactions involved in producing chemical energy for the plant.",
    evidenceQuote: "“Absorbed radiant energy is converted through electron transport into stored chemical potential (ATP and NADPH).”",
    sourceRef: "Page 12 · Photosynthesis",
    source: "Grounded in · Chapter 04 · Photosynthesis"
  }
};

const MobileHero = () => {
  const navigate = useNavigate();
  const [activeCitation, setActiveCitation] = useState(false);
  const [activeQueryId, setActiveQueryId] = useState("default");
  const [isMorphing, setIsMorphing] = useState(false);

  const currentQuery = DOCUMENT_QUERIES[activeQueryId] || DOCUMENT_QUERIES.default;

  const handleSelectQuery = (id) => {
    if (isMorphing) return;
    const targetId = activeQueryId === id ? "default" : id;
    setActiveCitation(false);
    setIsMorphing(true);
    setTimeout(() => {
      setActiveQueryId(targetId);
      setTimeout(() => {
        setIsMorphing(false);
      }, 160);
    }, 160);
  };

  // Dismiss evidence popover on outside click
  useEffect(() => {
    if (!activeCitation) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".doc-evidence-wrapper")) {
        setActiveCitation(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [activeCitation]);

  const handleGetStarted = () => {
    const user = localStorage.getItem("user");
    if (user) {
      navigate("/upload");
    } else {
      window.dispatchEvent(new Event("unauthorized"));
    }
  };

  return (
    <div className="mobile-only-hero">
      <div className="mobile-hero-container">

        {/* Heading */}
        <h1 className="mobile-hero-heading">
          Your documents.<br />
          Now you can <em className="hero-editorial-word">talk</em> to them.
        </h1>

        {/* Document Metadata Information Block */}
        <div className="hero-metadata-block">
          <div className="meta-header">
            <span className="meta-label">SUPPORTED MATERIAL</span>
          </div>
          <div className="meta-divider" />

          <div className="meta-formats">
            <span className="format-item">PDF</span>
            <span className="format-item">DOCX</span>
            <span className="format-item">XLSX</span>
            <span className="format-item">CSV</span>
            <span className="format-item">TXT</span>
          </div>

          <div className="meta-statement">
            <p>Ask questions across your files.</p>
            <p>Trace answers back to their source.</p>
          </div>

          <div className="meta-action-row">
            <button type="button" className="meta-open-btn" onClick={handleGetStarted}>
              OPEN SMARTDOCQ <span className="btn-arrow">→</span>
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mobile-features-grid">

          {/* AI Chat — sky blue */}
          <div className="mobile-feature-item">
            <div className="feature-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <span className="feature-title-sm">AI Chat</span>
            <span className="feature-desc-sm">Ask your document</span>
          </div>

          {/* Summaries — amber */}
          <div className="mobile-feature-item">
            <div className="feature-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <span className="feature-title-sm">Summaries</span>
            <span className="feature-desc-sm">Instant insights</span>
          </div>

          {/* Quizzes — emerald */}
          <div className="mobile-feature-item">
            <div className="feature-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="12" cy="16" r="1" />
                <path d="M12 8v2a2 2 0 0 0 2 2h0a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2" />
              </svg>
            </div>
            <span className="feature-title-sm">Quizzes</span>
            <span className="feature-desc-sm">Practice smarter</span>
          </div>

          {/* Flashcards — rose */}
          <div className="mobile-feature-item">
            <div className="feature-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                <rect x="8" y="8" width="16" height="16" rx="2" ry="2" />
              </svg>
            </div>
            <span className="feature-title-sm">Flashcards</span>
            <span className="feature-desc-sm">Remember faster</span>
          </div>

        </div>

        {/* Single Tall Dark Document Page with Editorial Annotation */}
        <div className="hero-document-stage">
          <div className="doc-sheet">
            <div className="doc-page-header">
              <span className="doc-title-stamp">CHAPTER 04 · CELLULAR BIOLOGY</span>
            </div>

            <div className="doc-header-rule" />

            {/* Q&A Excerpt */}
            <div className="doc-page-content">
              <div className={`doc-qa-block ${isMorphing ? "is-morphing" : ""}`}>
                <div className="doc-qa-item question-item">
                  <span className="doc-qa-meta-label">QUESTION</span>
                  <p className="doc-qa-question-text">{currentQuery.question}</p>
                </div>

                <div className="doc-qa-item answer-item">
                  <span className="doc-qa-meta-label answer-label">ANSWER</span>
                  <p className="doc-qa-answer-text">
                    {currentQuery.leadText}
                    <span 
                      className={`doc-evidence-wrapper ${activeCitation ? "is-open" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCitation(!activeCitation);
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label="Inspect supporting document evidence"
                    >
                      <mark className="doc-evidence-highlight">{currentQuery.highlightText}</mark>
                      
                      {/* Grounded Evidence Inspection Card */}
                      <span className="evidence-popover" role="dialog" aria-label="Supporting evidence">
                        <span className="popover-header">
                          <span className="popover-tag">EVIDENCE</span>
                          <span 
                            className="popover-close-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCitation(false);
                            }}
                            role="button"
                            aria-label="Dismiss evidence"
                          >
                            ×
                          </span>
                        </span>
                        <span className="popover-quote">
                          {currentQuery.evidenceQuote}
                        </span>
                        <span className="popover-rule" />
                        <span className="popover-source">{currentQuery.sourceRef}</span>
                      </span>
                    </span>
                    {currentQuery.tailText}
                  </p>
                </div>
              </div>

              {/* Supporting Scientific Figure */}
              <div className="doc-figure-box">
                <svg 
                  width="100%" 
                  height="66" 
                  viewBox="0 0 220 66" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="doc-figure-svg" 
                  aria-label="Chloroplast schematic diagram"
                >
                  <ellipse cx="110" cy="32" rx="92" ry="24" stroke="#242522" strokeWidth="0.8" strokeOpacity="0.38" strokeDasharray="3 2" />
                  <ellipse cx="110" cy="32" rx="88" ry="21" stroke="#242522" strokeWidth="0.9" strokeOpacity="0.75" />
                  <path d="M54 32 H166" stroke="#55756F" strokeWidth="0.8" strokeOpacity="0.55" />
                  <g transform="translate(64, 20)">
                    <rect x="0" y="0" width="18" height="3" rx="1.5" fill="#55756F" fillOpacity="0.3" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.8" />
                    <rect x="0" y="5" width="18" height="3" rx="1.5" fill="#55756F" fillOpacity="0.3" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.8" />
                    <rect x="0" y="10" width="18" height="3" rx="1.5" fill="#55756F" fillOpacity="0.3" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.8" />
                  </g>
                  <g transform="translate(101, 18)">
                    <rect x="0" y="0" width="18" height="3" rx="1.5" fill="#55756F" fillOpacity="0.35" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.85" />
                    <rect x="0" y="5" width="18" height="3" rx="1.5" fill="#55756F" fillOpacity="0.35" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.85" />
                    <rect x="0" y="10" width="18" height="3" rx="1.5" fill="#55756F" fillOpacity="0.35" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.85" />
                    <rect x="0" y="15" width="18" height="3" rx="1.5" fill="#55756F" fillOpacity="0.35" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.85" />
                  </g>
                  <g transform="translate(138, 21)">
                    <rect x="0" y="0" width="18" height="3" rx="1.5" fill="#55756F" fillOpacity="0.3" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.8" />
                    <rect x="0" y="5" width="18" height="3" rx="1.5" fill="#55756F" fillOpacity="0.3" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.8" />
                    <rect x="0" y="10" width="18" height="3" rx="1.5" fill="#55756F" fillOpacity="0.3" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.8" />
                  </g>
                  <text x="110" y="10" textAnchor="middle" fill="#242522" fillOpacity="0.55" fontFamily="'DM Mono', monospace" fontSize="5" letterSpacing="0.1em">CHLOROPLAST SCHEMATIC</text>
                </svg>

                <div className="doc-figure-caption">
                  <span className="caption-tag">Fig. 4.2</span>
                  <span className="caption-text">Photosynthetic electron transport and carbohydrate synthesis.</span>
                </div>
              </div>
            </div>

            {/* Grounded Source Rule on Document */}
            <div className="doc-page-footer">
              <div className="doc-footer-rule" />
              <div className="doc-footer-content">
                <span className="doc-source-stamp">{currentQuery.source}</span>
              </div>
            </div>
          </div>

          {/* EXPLORE THIS DOCUMENT — Mobile Stacked Panel */}
          <aside className="doc-explore-panel mobile-explore-panel" aria-label="Explore this document">
            <div className="explore-panel-header">
              <span className="explore-header-dot" />
              <span className="explore-header-tag">EXPLORE THIS DOCUMENT</span>
            </div>

            <div className="explore-cards-stack">
              <button
                type="button"
                className={`explore-card-btn ${activeQueryId === "chlorophyll" ? "active" : ""}`}
                onClick={() => handleSelectQuery("chlorophyll")}
                aria-pressed={activeQueryId === "chlorophyll"}
                aria-label="Ask: What role does chlorophyll play?"
              >
                <div className="explore-card-inner">
                  <div className="explore-card-top">
                    <span className="explore-card-num">01</span>
                    <span className="explore-card-tag">ASK</span>
                  </div>
                  <div className="explore-card-body">
                    <span className="explore-card-query">What role does chlorophyll play?</span>
                    <span className="explore-card-arrow" aria-hidden="true">
                      {activeQueryId === "chlorophyll" ? "✓" : "→"}
                    </span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                className={`explore-card-btn ${activeQueryId === "energy" ? "active" : ""}`}
                onClick={() => handleSelectQuery("energy")}
                aria-pressed={activeQueryId === "energy"}
                aria-label="Ask: How does light energy become chemical energy?"
              >
                <div className="explore-card-inner">
                  <div className="explore-card-top">
                    <span className="explore-card-num">02</span>
                    <span className="explore-card-tag">ASK</span>
                  </div>
                  <div className="explore-card-body">
                    <span className="explore-card-query">How does light energy become chemical energy?</span>
                    <span className="explore-card-arrow" aria-hidden="true">
                      {activeQueryId === "energy" ? "✓" : "→"}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </aside>
        </div>

        {/* Privacy Notice */}
        <div className="mobile-privacy-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p>Private by design.<br />Your documents stay secure.</p>
        </div>

      </div>
    </div>
  );
};

export default MobileHero;
