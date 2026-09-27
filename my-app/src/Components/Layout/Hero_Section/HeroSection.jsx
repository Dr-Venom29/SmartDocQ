import { useRef, useLayoutEffect, useState, useEffect } from "react";
import "./HeroSection.css";
import "./HeroCard3D.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useNavigate } from "react-router-dom";
import FeatureCard from "./FeatureCard";
import { FEATURES } from "./featuresData";
import MobileHero from "./MobileHero";
import { useMediaQuery } from "../../../hooks/useMediaQuery";

gsap.registerPlugin(ScrollTrigger);

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

const HeroSection = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const sectionRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const [reduceMotion, setReduceMotion] = useState(false);
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

  // Respect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

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

  // Horizontal scroll animation for desktop feature cards using gsap.context
  useLayoutEffect(() => {
    if (reduceMotion || isMobile) return;

    let ctx = gsap.context(() => {
      const container = containerRef.current;
      const section = sectionRef.current;
      if (!container || !section) return;

      const totalScroll = container.scrollWidth - section.clientWidth;
      if (totalScroll <= 0) return;

      gsap.fromTo(
        container,
        { x: 0 },
        {
          x: -totalScroll,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            pin: true,
            scrub: 1.2, // Inertial lag for buttery smooth scrolling feel
            start: "top top",
            end: () => `+=${totalScroll}`,
            invalidateOnRefresh: true,
            anticipatePin: 1
          }
        }
      );
    });

    return () => {
      ctx.revert(); // Wipes and cleans up only this specific trigger and resets container positioning
    };
  }, [reduceMotion, isMobile]);

  const handleGetStarted = () => {
    const user = localStorage.getItem("user");
    if (user) {
      navigate("/upload");
    } else {
      window.dispatchEvent(new Event("unauthorized"));
    }
  };

  // On mobile — only MobileHero mounts
  if (isMobile) return <MobileHero />;

  return (
    /* ── Desktop only — GSAP + Exploded 3D Document Stack ── */
    <div className="desktop-only-hero">
      <section className="hero-section" aria-labelledby="hero-heading">
        <div className="hero-container">
          
          <div className="hero-left">
            <h1 id="hero-heading" className="hero-heading">
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
          </div>

          <div className="hero-right">
            <div className="hero-document-stage">
              
              {/* Interactive Study Page Document Sheet */}
              <div className="doc-sheet">
                
                {/* Document Header */}
                <div className="doc-page-header">
                  <span className="doc-title-stamp">CHAPTER 04 · CELLULAR_BIOLOGY.pdf</span>
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
                      height="72" 
                      viewBox="0 0 220 72" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="doc-figure-svg" 
                      aria-label="Chloroplast schematic diagram"
                    >
                      {/* Outer double membrane */}
                      <ellipse cx="110" cy="35" rx="96" ry="28" stroke="#242522" strokeWidth="0.8" strokeOpacity="0.38" strokeDasharray="3 2" />
                      <ellipse cx="110" cy="35" rx="92" ry="24" stroke="#242522" strokeWidth="0.9" strokeOpacity="0.75" />
                      
                      {/* Stroma lamellae connecting lines */}
                      <path d="M52 35 H168" stroke="#55756F" strokeWidth="0.8" strokeOpacity="0.55" />
                      <path d="M68 29 C 92 29, 128 41, 152 41" stroke="#55756F" strokeWidth="0.75" strokeOpacity="0.45" />
                      
                      {/* Thylakoid Granum Stack 1 */}
                      <g transform="translate(60, 23)">
                        <rect x="0" y="0" width="20" height="3.5" rx="1.5" fill="#55756F" fillOpacity="0.3" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.8" />
                        <rect x="0" y="5.5" width="20" height="3.5" rx="1.5" fill="#55756F" fillOpacity="0.3" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.8" />
                        <rect x="0" y="11" width="20" height="3.5" rx="1.5" fill="#55756F" fillOpacity="0.3" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.8" />
                        <rect x="0" y="16.5" width="20" height="3.5" rx="1.5" fill="#55756F" fillOpacity="0.3" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.8" />
                      </g>

                      {/* Thylakoid Granum Stack 2 (Center) */}
                      <g transform="translate(100, 21)">
                        <rect x="0" y="0" width="20" height="3.5" rx="1.5" fill="#55756F" fillOpacity="0.35" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.85" />
                        <rect x="0" y="5.5" width="20" height="3.5" rx="1.5" fill="#55756F" fillOpacity="0.35" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.85" />
                        <rect x="0" y="11" width="20" height="3.5" rx="1.5" fill="#55756F" fillOpacity="0.35" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.85" />
                        <rect x="0" y="16.5" width="20" height="3.5" rx="1.5" fill="#55756F" fillOpacity="0.35" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.85" />
                        <rect x="0" y="22" width="20" height="3.5" rx="1.5" fill="#55756F" fillOpacity="0.35" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.85" />
                      </g>

                      {/* Thylakoid Granum Stack 3 */}
                      <g transform="translate(140, 24)">
                        <rect x="0" y="0" width="20" height="3.5" rx="1.5" fill="#55756F" fillOpacity="0.3" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.8" />
                        <rect x="0" y="5.5" width="20" height="3.5" rx="1.5" fill="#55756F" fillOpacity="0.3" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.8" />
                        <rect x="0" y="11" width="20" height="3.5" rx="1.5" fill="#55756F" fillOpacity="0.3" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.8" />
                        <rect x="0" y="16.5" width="20" height="3.5" rx="1.5" fill="#55756F" fillOpacity="0.3" stroke="#242522" strokeWidth="0.7" strokeOpacity="0.8" />
                      </g>

                      {/* Micro labels */}
                      <text x="110" y="11" textAnchor="middle" fill="#242522" fillOpacity="0.55" fontFamily="'DM Mono', monospace" fontSize="5" letterSpacing="0.1em">CHLOROPLAST SCHEMATIC</text>
                      <text x="180" y="45" fill="#55756F" fontFamily="'DM Mono', monospace" fontSize="5" letterSpacing="0.04em">thylakoid</text>
                      <line x1="178" y1="43" x2="162" y2="38" stroke="#55756F" strokeWidth="0.5" strokeOpacity="0.7" />
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

              {/* EXPLORE THIS DOCUMENT — Bespoke Side Panel */}
              <aside className="doc-explore-panel" aria-label="Explore this document">
                <div className="explore-panel-header">
                  <span className="explore-header-dot" />
                  <span className="explore-header-tag">EXPLORE THIS DOCUMENT</span>
                </div>

                <div className="explore-cards-stack">
                  {/* Card 01: Chlorophyll */}
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

                  {/* Card 02: Energy */}
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
          </div>
        </div>
      </section>

      <div className="doc-intelligence-header" style={{ marginTop: "-16px" }}>
        <h2 id="feat" className="doc-intel-heading">
          <span className="heading-line-sans">Make Every Document</span>
          <span className="heading-line-serif">
            <span className="clarity-underline">More Useful</span>.
          </span>
        </h2>
      </div>

      <section className="features-section" ref={sectionRef} aria-label="Product features">
        <div className="features-container" ref={containerRef} role="list">
          {FEATURES.map((f, idx) => (
            <FeatureCard
              key={f.title}
              index={idx}
              tag={f.tag}
              title={f.title}
              desc={f.desc}
              metaText={f.metaText}
            />
          ))}
        </div>
        <div className="doc-intelligence-header" style={{ marginTop: "0px", marginBottom: "20px", padding: "24px 0 32px 0" }}>
          <h2 className="doc-intel-heading" style={{ gap: "10px", marginBottom: "5px" }}>
            <span className="heading-line-sans">From Chaos To</span>
            <span className="heading-line-serif">
              <span className="clarity-underline">Clarity</span>.
            </span>
          </h2>
        </div>
      </section>
    </div>
  );
};

export default HeroSection;