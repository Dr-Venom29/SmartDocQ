const FeatureCard = ({ index, tag, title, desc, metaText }) => {
  const defaultTags = [
    "01 // UPLOAD",
    "02 // ASK",
    "03 // SUMMARIZE",
    "04 // STUDY",
    "05 // REMEMBER",
    "06 // IMPROVE",
    "07 // ORGANIZE",
    "08 // PROTECT"
  ];
  const cardTag = tag || defaultTags[index] || `0${index + 1} // MODULE`;

  // Render product specimen UI for the first 3 cards
  const renderConsoleContent = () => {
    if (index === 0) {
      // 01 — UPLOAD Product Specimen UI
      return (
        <div className="specimen-container specimen-upload-box">
          <div className="specimen-dropzone">
            <div className="specimen-drop-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v13M5 10l7 7 7-7"/>
              </svg>
            </div>
            <span className="specimen-drop-title">Drop your document</span>
            <span className="specimen-drop-formats">PDF · DOCX · XLSX</span>
          </div>

          <div className="specimen-upload-divider" />

          <div className="specimen-file-status">
            <div className="specimen-file-info">
              <span className="specimen-filename">smartdocq_report.pdf</span>
              <span className="specimen-percent">82%</span>
            </div>
            <div className="specimen-progress-track">
              <div className="specimen-progress-fill" style={{ width: "82%" }} />
            </div>
          </div>
        </div>
      );
    }

    if (index === 1) {
      // 02 — ASK Product Specimen UI (Grounded Q&A)
      return (
        <div className="specimen-container specimen-qa-box">
          <div className="specimen-qa-entry question-entry">
            <span className="specimen-qa-label q-label">Q</span>
            <span className="specimen-qa-content q-content">What is photosynthesis?</span>
          </div>

          <div className="specimen-qa-entry answer-entry">
            <span className="specimen-qa-label a-label">A</span>
            <div className="specimen-qa-content a-content">
              Photosynthesis is the process by which plants convert{" "}
              <mark className="specimen-highlight">light energy</mark>
              <span className="specimen-cursor" /> into chemical energy...
            </div>
          </div>

          <div className="specimen-qa-citation">
            <span className="specimen-cite-tag">SOURCE</span>
            <span className="specimen-cite-ref">Page 12 · Photosynthesis</span>
          </div>
        </div>
      );
    }

    if (index === 2) {
      // 03 — SUMMARIZE Product Specimen UI (Document -> Summary)
      return (
        <div className="specimen-container specimen-summary-box">
          <div className="specimen-summary-doc">
            <span className="specimen-section-tag">DOCUMENT</span>
            <div className="specimen-skeleton-group">
              <div className="specimen-skeleton-bar bar-1" />
              <div className="specimen-skeleton-bar bar-2" />
              <div className="specimen-skeleton-bar bar-3" />
            </div>
          </div>

          <div className="specimen-summary-arrow" aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v16m0 0l-5-5m5 5l5-5"/>
            </svg>
          </div>

          <div className="specimen-summary-output">
            <span className="specimen-section-tag summary-tag">SUMMARY</span>
            <ul className="specimen-summary-list">
              <li><span className="bullet">•</span> Main concept</li>
              <li><span className="bullet">•</span> Key findings</li>
              <li><span className="bullet">•</span> Important details</li>
            </ul>
          </div>
        </div>
      );
    }

    if (index === 3) {
      // 04 — STUDY Product Specimen UI (Flashcards & Quiz)
      return (
        <div className="specimen-container specimen-flashcard-box">
          <div className="specimen-flashcard-header">
            <span className="specimen-section-tag purple-tag">FLASHCARD</span>
            <span className="specimen-card-counter">04 / 12</span>
          </div>

          <div className="specimen-flashcard-question">
            <span className="flashcard-q-text">What is photosynthesis?</span>
          </div>

          <div className="specimen-flashcard-divider" />

          <div className="specimen-flashcard-answer-revealed">
            <span className="flashcard-answer-label">ANSWER</span>
            <span className="flashcard-a-text">Plants convert light energy into chemical energy.</span>
          </div>

          <div className="specimen-flashcard-controls">
            <span className="flashcard-btn again">
              <span className="btn-bullet">○</span> Again
            </span>
            <span className="flashcard-btn good active">
              <span className="btn-bullet">●</span> Good
            </span>
            <span className="flashcard-btn easy">
              <span className="btn-bullet">○</span> Easy
            </span>
          </div>
        </div>
      );
    }

    if (index === 4) {
      // 05 — REMEMBER: Pure visual memory chain (document -> conversation bubbles -> memory node)
      return (
        <div className="specimen-container specimen-memory-visual">
          <div className="memory-chain-stage">
            {/* Feeding source document */}
            <div className="memory-source-doc" aria-hidden="true">
              <div className="memory-doc-fold" />
              <div className="memory-doc-lines">
                <span className="m-line" />
                <span className="m-line short" />
              </div>
            </div>

            {/* Connecting feed line */}
            <svg className="memory-feed-line" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <path d="M4 24C12 24 14 10 24 6" stroke="rgba(251, 113, 133, 0.45)" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>

            {/* Horizontal chain of conversation bubbles */}
            <div className="memory-bubbles-track" aria-hidden="true">
              {/* Bubble 1: Old / Faded */}
              <div className="memory-bubble b-old">
                <span className="bubble-skel s-1" />
              </div>

              <div className="memory-link-segment" />

              {/* Bubble 2: Mid context */}
              <div className="memory-bubble b-mid">
                <span className="bubble-skel s-2" />
                <span className="bubble-skel s-1" />
              </div>

              <div className="memory-link-segment bright" />

              {/* Bubble 3: Active newest */}
              <div className="memory-bubble b-active">
                <span className="bubble-skel s-rose" />
                <span className="bubble-skel s-rose short" />
              </div>

              <div className="memory-link-segment rose" />

              {/* Glowing memory node */}
              <div className="memory-core-node">
                <div className="node-halo" />
                <div className="node-center" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (index === 5) {
      // 06 — IMPROVE: Pure visual feedback -> refinement loop (draft -> feedback node -> polished result)
      return (
        <div className="specimen-container specimen-improve-visual">
          <div className="improve-loop-stage">
            {/* Background feedback loop curve */}
            <svg className="improve-loop-arc" width="160" height="70" viewBox="0 0 160 70" fill="none" aria-hidden="true">
              <path d="M30 48 C 60 72, 100 72, 130 48" stroke="rgba(34, 211, 238, 0.35)" strokeWidth="1.2" strokeDasharray="3 3" />
              <path d="M125 50 L130 48 L128 42" stroke="rgba(34, 211, 238, 0.6)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            {/* Left: Initial Draft Card */}
            <div className="refine-card card-draft" aria-hidden="true">
              <div className="refine-card-lines">
                <span className="r-line w-full" />
                <span className="r-line w-long" />
                <span className="r-line w-med" />
              </div>
            </div>

            {/* Center: Feedback / Tuning Nodes */}
            <div className="refine-center-hub" aria-hidden="true">
              <div className="feedback-signal-chip">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8.5l3.5 3.5L13 4" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="refine-flow-arrow">
                <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
                  <path d="M1 5h14M11 1l4 4-4 4" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Right: Refined / Sharpened Card with Sparkle */}
            <div className="refine-card card-polished" aria-hidden="true">
              <div className="polished-sparkle">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#22d3ee">
                  <path d="M12 0l2.5 8.5L23 11l-8.5 2.5L12 22l-2.5-8.5L1 11l8.5-2.5z" />
                </svg>
              </div>
              <div className="refine-card-lines polished">
                <span className="r-line cyan-full" />
                <span className="r-line cyan-long" />
                <span className="r-line cyan-med" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (index === 6) {
      // 07 — ORGANIZE: Pure visual document sheets sliding into a neat folder tray
      return (
        <div className="specimen-container specimen-organize-visual">
          {/* Top: Fanned floating document sheets */}
          <div className="fanned-sheets-area" aria-hidden="true">
            <div className="fanned-sheet sheet-left">
              <div className="sheet-fold" />
              <div className="sheet-lines">
                <span className="line w-long" />
                <span className="line w-med" />
                <span className="line w-short" />
              </div>
            </div>
            <div className="fanned-sheet sheet-center">
              <div className="sheet-fold" />
              <div className="sheet-lines">
                <span className="line w-long" />
                <span className="line w-med" />
              </div>
            </div>
            <div className="fanned-sheet sheet-right">
              <div className="sheet-fold" />
              <div className="sheet-lines">
                <span className="line w-long" />
                <span className="line w-short" />
              </div>
            </div>
          </div>

          {/* Downward organizing flow indicator */}
          <div className="sheet-flow-vector" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v8M2.5 5.5l3.5 3.5 3.5-3.5" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Bottom: Neatly stacked folder tray */}
          <div className="folder-dock-tray" aria-hidden="true">
            <div className="folder-tab" />
            <div className="folder-body">
              <div className="docked-sheet-stack">
                <div className="docked-sheet d-sheet-1" />
                <div className="docked-sheet d-sheet-2" />
                <div className="docked-sheet d-sheet-3">
                  <div className="sheet-lines mini">
                    <span className="line" />
                    <span className="line" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (index === 7) {
      // 08 — PROTECT: Pure visual document -> security shield with scanline -> protected document
      return (
        <div className="specimen-container specimen-protect-visual">
          {/* Top: Raw incoming document with active red scanline */}
          <div className="protect-raw-doc" aria-hidden="true">
            <div className="protect-doc-sheet raw">
              <div className="protect-doc-fold" />
              <div className="protect-doc-lines">
                <span className="p-line" />
                <span className="p-line" />
                <span className="p-line short" />
              </div>
              <div className="red-scanline" />
            </div>
          </div>

          {/* Center: Security Field & Central Shield with Lock */}
          <div className="protect-shield-field" aria-hidden="true">
            <div className="security-beam" />
            <div className="shield-emblem-wrap">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(239, 68, 68, 0.16)" />
                <circle cx="12" cy="10.5" r="1.5" stroke="#ffffff" strokeWidth="1.6" />
                <path d="M12 12v2.5" stroke="#ffffff" strokeWidth="1.6" />
              </svg>
            </div>
          </div>

          {/* Bottom: Emerging protected document with verified seal */}
          <div className="protect-safe-doc" aria-hidden="true">
            <div className="protect-doc-sheet safe">
              <div className="protect-doc-fold safe-fold" />
              <div className="protect-doc-lines">
                <span className="p-line safe-line" />
                <span className="p-line safe-line" />
              </div>
              <div className="safe-seal-badge">
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <article 
      className="box" 
      role="listitem"
    >
      <div className="glass">
        {/* Monospace Metadata Tag */}
        <div className="card-header-row">
          <div className="card-tag">{cardTag}</div>
        </div>

        {/* Product UI visual specimen container */}
        <div className="feature-console-window" aria-hidden="true">
          {renderConsoleContent()}
        </div>

        <div className="content">
          <h3>{title}</h3>
          <p>{desc}</p>
        </div>

        {metaText && (
          <div className="card-footer-meta">
            <span className="footer-meta-text">{metaText}</span>
            <span className="footer-meta-arrow" aria-hidden="true">→</span>
          </div>
        )}
      </div>
    </article>
  );
};

export default FeatureCard;