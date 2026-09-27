import { useRef, useLayoutEffect, useState, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import "./ChaosToClaritySection.css";

gsap.registerPlugin(ScrollTrigger);

const PAPERS = [
  {
    id: "bio",
    title: "BIOLOGY_101.pdf",
    tag: "LECTURE NOTES",
    type: "PDF",
    date: "OCT 26",
    badge: "14 Key Concepts",
    accent: "#10b981",
    depth: 1.0,
    chaos: { x: -260, y: -40, z: 90, rotate: -8, scale: 1.02 },
    parallax: { yOffset: -180, xOffset: 35 },
    stackIndex: 0,
    content: {
      heading: "Chapter 4: Photosynthesis & Energy",
      snippet: "Light energy converted to chemical ATP & NADPH in thylakoid membranes.",
      meta: "Grounded · Page 12 · 98.4% Confidence",
      highlight: "Light energy → chemical energy",
      hasDiagram: true
    }
  },
  {
    id: "research",
    title: "CARBON_SEQUESTRATION.pdf",
    tag: "RESEARCH PAPER",
    type: "PDF",
    date: "SEP 14",
    badge: "128 Citations",
    accent: "#00f2fe",
    depth: 0.95,
    chaos: { x: 270, y: 50, z: 70, rotate: 6.5, scale: 0.98 },
    parallax: { yOffset: -160, xOffset: -45 },
    stackIndex: 1,
    content: {
      heading: "Biochar Soil Carbon Meta-Analysis",
      snippet: "18% average increase in soil organic carbon stocks across 125 field trials.",
      meta: "DOI: 10.1016/j.soil.2023.04 · Peer Reviewed",
      highlight: "+18% soil carbon retention",
      hasChart: true
    }
  },
  {
    id: "finance",
    title: "Q3_FINANCIALS.xlsx",
    tag: "SPREADSHEET",
    type: "XLSX",
    date: "OCT 15",
    badge: "Tables Structured",
    accent: "#f59e0b",
    depth: 0.70,
    chaos: { x: -410, y: 110, z: -30, rotate: 10, scale: 0.92 },
    parallax: { yOffset: -110, xOffset: 60 },
    stackIndex: 2,
    content: {
      heading: "Global Markets Performance Q3",
      snippet: "Revenue: $5.24M (+12.8% YoY) · Gross Profit Margin: 48.6%",
      meta: "Parsed: 1,240 cells · Currency: USD",
      highlight: "EBITDA: $1.28M (+17.9%)",
      hasTable: true
    }
  },
  {
    id: "canvas",
    title: "URBAN_CANVAS.pdf",
    tag: "BOOK CHAPTER",
    type: "PDF",
    date: "AUG 22",
    badge: "Highlights Extracted",
    accent: "#a855f7",
    depth: 0.65,
    chaos: { x: 390, y: -100, z: -50, rotate: -11, scale: 0.90 },
    parallax: { yOffset: -95, xOffset: -55 },
    stackIndex: 3,
    content: {
      heading: "Chapter 4: The Urban Canvas",
      snippet: "Street art serves as a powerful medium for social commentary and community expression.",
      meta: "Annotations: 8 highlighted passages",
      highlight: "Direct public engagement",
      hasHighlight: true
    }
  },
  {
    id: "arch",
    title: "SYSTEM_SPEC_v1.2.docx",
    tag: "PROJECT BRIEF",
    type: "DOCX",
    date: "OCT 20",
    badge: "Architecture Verified",
    accent: "#6366f1",
    depth: 0.55,
    chaos: { x: -60, y: -200, z: -80, rotate: 4.5, scale: 0.88 },
    parallax: { yOffset: -75, xOffset: 25 },
    stackIndex: 4,
    content: {
      heading: "Platform Architecture Flow",
      snippet: "API Gateway → Auth Service → Application Server → Vector Database.",
      meta: "Requirements: 6/6 verified",
      highlight: "High Availability (99.9%)",
      hasChecklist: true
    }
  },
  {
    id: "legal",
    title: "COMPLIANCE_NDA.pdf",
    tag: "CONTRACT",
    type: "PDF",
    date: "JUL 08",
    badge: "PII Scanned & Clear",
    accent: "#f43f5e",
    depth: 0.35,
    chaos: { x: -300, y: 210, z: -150, rotate: -13, scale: 0.82 },
    parallax: { yOffset: -45, xOffset: 30 },
    stackIndex: 5,
    content: {
      heading: "Master Mutual Non-Disclosure",
      snippet: "Standard protective covenants for shared proprietary document embeddings.",
      meta: "PII Status: 0 sensitive items detected",
      highlight: "Encrypted at Rest (AES-256)",
      hasStamp: true
    }
  },
  {
    id: "rag",
    title: "HYBRID_RETRIEVAL.pdf",
    tag: "TECHNICAL SPEC",
    type: "PDF",
    date: "OCT 02",
    badge: "RRF Index Active",
    accent: "#00f2fe",
    depth: 0.30,
    chaos: { x: 290, y: 190, z: -170, rotate: 7.5, scale: 0.80 },
    parallax: { yOffset: -40, xOffset: -30 },
    stackIndex: 6,
    content: {
      heading: "Dense + Sparse Hybrid Search",
      snippet: "Reciprocal Rank Fusion k=60 combining vector cosine similarity with BM25.",
      meta: "Vector Index: text-embedding-3-small",
      highlight: "Reciprocal Rank Fusion",
      hasFormula: true
    }
  },
  {
    id: "notes",
    title: "INTERVIEW_SYNTHESIS.txt",
    tag: "RAW TEXT",
    type: "TXT",
    date: "OCT 25",
    badge: "Key Themes Mapped",
    accent: "#ec4899",
    depth: 0.25,
    chaos: { x: 160, y: -230, z: -210, rotate: -6, scale: 0.78 },
    parallax: { yOffset: -30, xOffset: -15 },
    stackIndex: 7,
    content: {
      heading: "User Feedback & Synthesis",
      snippet: "Need instant answers across 50+ PDFs without manually reading all pages.",
      meta: "Extracted: 4 core user friction points",
      highlight: "Unified search across all docs",
      hasNotes: true
    }
  }
];

export default function ChaosToClaritySection() {
  const sectionRef = useRef(null);
  const viewportRef = useRef(null);
  const papersRef = useRef([]);
  const scanGlowRef = useRef(null);
  const heroCardRef = useRef(null);
  const finalMessageRef = useRef(null);

  const reduceMotion = useReducedMotion();
  const isMobile = useMediaQuery("(max-width: 900px)");

  useLayoutEffect(() => {
    if (reduceMotion || isMobile) return;

    const section = sectionRef.current;
    const viewport = viewportRef.current;
    const paperElements = papersRef.current.filter(Boolean);
    const scanGlow = scanGlowRef.current;
    const heroCard = heroCardRef.current;
    const finalMessage = finalMessageRef.current;

    if (!section || !viewport || paperElements.length === 0) return;

    let ctx = gsap.context(() => {
      // Main Master Timeline pinned to scroll
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          pin: viewport,
          scrub: 1.1,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });

      // Initial Setup
      gsap.set(scanGlow, { opacity: 0 });
      gsap.set(heroCard, { opacity: 0, y: 40, scale: 0.94 });
      gsap.set(finalMessage, { opacity: 0, y: 30 });

      // Initial scatter positions
      paperElements.forEach((paper, i) => {
        const config = PAPERS[i];
        gsap.set(paper, {
          x: config.chaos.x,
          y: config.chaos.y,
          z: config.chaos.z,
          rotationZ: config.chaos.rotate,
          rotationX: (config.chaos.rotate * 0.4),
          rotationY: (config.chaos.rotate * -0.5),
          scale: config.chaos.scale,
          opacity: Math.max(0.45, config.depth),
          filter: config.depth < 0.5 ? `blur(${(0.5 - config.depth) * 6}px)` : "blur(0px)"
        });
      });

      // Phase 1 (0.00 -> 0.35): Parallax Drift & Chaos Expansion

      paperElements.forEach((paper, i) => {
        const config = PAPERS[i];
        tl.to(
          paper,
          {
            x: config.chaos.x + config.parallax.xOffset,
            y: config.chaos.y + config.parallax.yOffset,
            rotationZ: config.chaos.rotate * 1.3,
            ease: "none",
            duration: 0.4
          },
          0
        );
      });

      // Phase 2 (0.35 -> 0.60): Intelligence Scan Passes
      tl.fromTo(
        scanGlow,
        { opacity: 0, scaleY: 0.2 },
        { opacity: 0.5, scaleY: 1, ease: "power1.inOut", duration: 0.2, yoyo: true, repeat: 1 },
        0.38
      );

      // As scan sweeps, papers sharpen and clarify
      paperElements.forEach((paper, i) => {
        const config = PAPERS[i];
        const scanStart = 0.36 + (i * 0.025);
        
        tl.to(
          paper,
          {
            filter: "blur(0px)",
            opacity: 0.95,
            duration: 0.15,
            ease: "power2.out"
          },
          scanStart
        );

        const badges = paper.querySelectorAll(".paper-micro-badge, .paper-highlight-pill");
        if (badges.length) {
          tl.to(
            badges,
            {
              opacity: 1,
              scale: 1,
              duration: 0.12,
              ease: "back.out(1.7)"
            },
            scanStart + 0.05
          );
        }
      });

      // Phase 3 (0.60 -> 0.85): Convergence & Stacking
      paperElements.forEach((paper, i) => {
        const config = PAPERS[i];
        // Stack target offsets (subtle 3D cascade)
        const stackY = 40 + (config.stackIndex * 6);
        const stackZ = (8 - config.stackIndex) * 12;
        const stackRotate = (config.stackIndex % 2 === 0 ? 1 : -1) * (config.stackIndex * 0.7);

        tl.to(
          paper,
          {
            x: 0,
            y: stackY,
            z: stackZ,
            rotationZ: stackRotate,
            rotationX: 12,
            rotationY: 0,
            scale: 0.98 - (config.stackIndex * 0.02),
            opacity: config.stackIndex < 4 ? 1 - (config.stackIndex * 0.15) : 0.2,
            boxShadow: "0 20px 45px rgba(0, 0, 0, 0.65)",
            ease: "power3.inOut",
            duration: 0.25
          },
          0.60
        );
      });

      // Phase 4 (0.85 -> 1.00): Clarity — Workspace Elevation
      tl.to(
        paperElements.slice(1),
        {
          opacity: 0.12,
          y: "+=30",
          scale: 0.92,
          duration: 0.15,
          ease: "power2.out"
        },
        0.85
      );

      tl.to(
        paperElements[0],
        {
          opacity: 0,
          scale: 0.95,
          duration: 0.1,
          ease: "power2.in"
        },
        0.85
      );

      tl.to(
        heroCard,
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.15,
          ease: "back.out(1.2)"
        },
        0.85
      );

      tl.to(
        finalMessage,
        {
          opacity: 1,
          y: 0,
          duration: 0.15,
          ease: "power2.out"
        },
        0.88
      );
    });

    return () => ctx.revert();
  }, [reduceMotion, isMobile]);

  return (
    <section 
      className="chaos-clarity-section" 
      ref={sectionRef} 
      aria-label="From Chaos to Clarity transformation sequence"
    >
      <div className="chaos-clarity-viewport" ref={viewportRef}>
        
        {/* Ambient atmospheric backdrop */}
        <div className="chaos-ambient-bg" aria-hidden="true">
          <div className="chaos-radial-glow" />
          <div className="chaos-grid-lines" />
          <div className="chaos-scan-beam" ref={scanGlowRef} />
        </div>

        {/* 3D Paper Field */}
        <div className="chaos-3d-stage" aria-hidden="true">
          {/* Floating Papers */}
          <div className="chaos-papers-container">
            {PAPERS.map((p, idx) => (
              <article
                key={p.id}
                className={`paper-sheet paper-type-${p.type.toLowerCase()}`}
                ref={(el) => (papersRef.current[idx] = el)}
                style={{
                  '--paper-accent': p.accent,
                  '--paper-depth': p.depth
                }}
              >
                {/* Paper Header Strip */}
                <div className="paper-top-bar">
                  <div className="paper-file-identity">
                    <span className="paper-type-pill">{p.type}</span>
                    <span className="paper-filename">{p.title}</span>
                  </div>
                  <span className="paper-date">{p.date}</span>
                </div>

                <div className="paper-separator" />

                {/* Paper Body Content */}
                <div className="paper-content-area">
                  <div className="paper-title-row">
                    <h3 className="paper-inner-heading">{p.content.heading}</h3>
                  </div>

                  {p.content.hasDiagram && (
                    <div className="paper-micro-diagram">
                      <svg width="100%" height="38" viewBox="0 0 160 38" fill="none">
                        <ellipse cx="80" cy="19" rx="70" ry="15" stroke="#242522" strokeWidth="0.8" strokeDasharray="3 2" />
                        <ellipse cx="80" cy="19" rx="66" ry="12" stroke="#10b981" strokeWidth="0.9" strokeOpacity="0.8" />
                        <rect x="50" y="11" width="16" height="3" rx="1" fill="#10b981" fillOpacity="0.4" />
                        <rect x="50" y="16" width="16" height="3" rx="1" fill="#10b981" fillOpacity="0.4" />
                        <rect x="50" y="21" width="16" height="3" rx="1" fill="#10b981" fillOpacity="0.4" />
                        <rect x="74" y="9" width="16" height="3" rx="1" fill="#10b981" fillOpacity="0.5" />
                        <rect x="74" y="14" width="16" height="3" rx="1" fill="#10b981" fillOpacity="0.5" />
                        <rect x="74" y="19" width="16" height="3" rx="1" fill="#10b981" fillOpacity="0.5" />
                        <rect x="74" y="24" width="16" height="3" rx="1" fill="#10b981" fillOpacity="0.5" />
                        <rect x="98" y="11" width="16" height="3" rx="1" fill="#10b981" fillOpacity="0.4" />
                        <rect x="98" y="16" width="16" height="3" rx="1" fill="#10b981" fillOpacity="0.4" />
                        <rect x="98" y="21" width="16" height="3" rx="1" fill="#10b981" fillOpacity="0.4" />
                      </svg>
                    </div>
                  )}

                  {p.content.hasChart && (
                    <div className="paper-micro-chart">
                      <div className="chart-bar-group">
                        <span className="c-bar" style={{ height: "45%" }} />
                        <span className="c-bar active-bar" style={{ height: "85%" }} />
                        <span className="c-bar" style={{ height: "65%" }} />
                        <span className="c-bar" style={{ height: "75%" }} />
                      </div>
                    </div>
                  )}

                  {p.content.hasTable && (
                    <div className="paper-micro-table">
                      <div className="table-row head-row">
                        <span>Metric</span>
                        <span>Q1</span>
                        <span>Q3</span>
                        <span>Var%</span>
                      </div>
                      <div className="table-row">
                        <span>Revenue</span>
                        <span>$3.8M</span>
                        <span>$5.2M</span>
                        <span className="text-pos">+12.8%</span>
                      </div>
                      <div className="table-row">
                        <span>EBITDA</span>
                        <span>$0.9M</span>
                        <span>$1.2M</span>
                        <span className="text-pos">+17.9%</span>
                      </div>
                    </div>
                  )}

                  {p.content.hasChecklist && (
                    <div className="paper-micro-checklist">
                      <div className="chk-item">✓ API Gateway & Auth Verified</div>
                      <div className="chk-item">✓ Vector Cosine Index 99.9%</div>
                    </div>
                  )}

                  <p className="paper-snippet">{p.content.snippet}</p>

                  <div className="paper-highlight-pill">
                    <span className="pill-pulse" />
                    <span>{p.content.highlight}</span>
                  </div>
                </div>

                {/* Paper Footer Strip */}
                <div className="paper-bottom-bar">
                  <span className="paper-meta-text">{p.content.meta}</span>
                  <span className="paper-micro-badge">{p.badge}</span>
                </div>
              </article>
            ))}
          </div>

          {/* Final Elevated SmartDocQ Workspace Card */}
          <div className="clarity-workspace-card" ref={heroCardRef} tabIndex={0} role="region" aria-label="SmartDocQ unified workspace">
            <div className="workspace-header">
              <div className="workspace-brand">
                <div className="workspace-logo-glyph">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </div>
                <div className="workspace-title-group">
                  <span className="workspace-name">SMARTDOCQ WORKSPACE</span>
                  <span className="workspace-status">8 Documents · Unified Vector Index</span>
                </div>
              </div>
              <div className="workspace-badge">
                <span className="badge-live-dot" />
                <span>READY TO QUERY</span>
              </div>
            </div>

            <div className="workspace-tabs-row">
              <span className="ws-tab active">Biology_101.pdf</span>
              <span className="ws-tab">Carbon_Research.pdf</span>
              <span className="ws-tab">Q3_Financials.xlsx</span>
              <span className="ws-tab">System_Spec.docx</span>
              <span className="ws-tab count-tab">+4 more</span>
            </div>

            <div className="workspace-body">
              <div className="workspace-query-box">
                <div className="query-prompt-line">
                  <span className="prompt-icon">✦</span>
                  <span className="prompt-text">“Synthesize key findings and cross-reference revenue impact”</span>
                </div>
                <div className="query-result-preview">
                  <p className="result-text">
                    Cross-referencing across <strong>Biology_101.pdf</strong>, <strong>Carbon_Research.pdf</strong>, and <strong>Q3_Financials.xlsx</strong>: Photosynthetic yields correlate directly with the reported <strong>+18% carbon retention</strong>, aligning with Q3 sustainability capital expenditure.
                  </p>
                  <div className="result-citations">
                    <span className="citation-chip">Source 1: Bio · P.12</span>
                    <span className="citation-chip">Source 2: Carbon · P.4</span>
                    <span className="citation-chip">Source 3: Q3 · Tab 2</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="workspace-footer">
              <span className="ws-footer-statement">One searchable workspace. Every format. Citation backed.</span>
            </div>
          </div>

        </div>

        {/* Concluding Narrative Message */}
        <div className="chaos-final-statement" ref={finalMessageRef}>
          <p className="final-main-text">One workspace. Every document.</p>
          <span className="final-sub-text">Search, synthesize, and talk to your entire library in seconds.</span>
        </div>

      </div>
    </section>
  );
}
