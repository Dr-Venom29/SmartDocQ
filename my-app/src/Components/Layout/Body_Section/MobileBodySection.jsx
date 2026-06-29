import { useEffect, useRef, useState } from "react";
import "./BodySection.css";

const TIMELINE_STEPS = [
  {
    id: "01",
    title: "Upload",
    description: "Add PDFs, Word docs, spreadsheets or text files in seconds.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <polyline points="9 15 12 12 15 15" />
      </svg>
    ),
    color: "#60a5fa",
    glow: "rgba(96, 165, 250, 0.15)",
  },
  {
    id: "02",
    title: "AI Analysis",
    description: "SmartDocQ understands and breaks down your content.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
    color: "#a78bfa",
    glow: "rgba(167, 139, 250, 0.15)",
  },
  {
    id: "03",
    title: "Hybrid Search",
    description: "Combines semantic search with keyword retrieval to find what matters most.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    color: "#34d399",
    glow: "rgba(52, 211, 153, 0.15)",
  },
  {
    id: "04",
    title: "Answers with Citations",
    description: "Get accurate, context-aware answers with verified sources.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <line x1="9" y1="10" x2="15" y2="10" />
        <line x1="9" y1="14" x2="13" y2="14" />
      </svg>
    ),
    color: "#fbbf24",
    glow: "rgba(251, 191, 36, 0.15)",
  },
];

const MobileBodySection = () => {
  const sectionRef = useRef(null);
  const [visibleSteps, setVisibleSteps] = useState(new Set());

  useEffect(() => {
    const items = sectionRef.current?.querySelectorAll(".mtl-step");
    if (!items) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = entry.target.dataset.idx;
            setVisibleSteps((prev) => new Set([...prev, idx]));
          }
        });
      },
      { threshold: 0.25 }
    );

    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mobile-body-section" ref={sectionRef}>
      {/* Section heading */}
      <div className="mtl-header">
        <h2 className="mtl-title">
          From Upload to{" "}
          <span className="mtl-title-accent">Insight</span>
        </h2>
        <p className="mtl-subtitle">
          SmartDocQ turns your documents into accurate,<br />
          context-aware answers.
        </p>
      </div>

      {/* Vertical timeline */}
      <div className="mtl-timeline">
        {TIMELINE_STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`mtl-step ${visibleSteps.has(String(index)) ? "mtl-step--visible" : ""}`}
            data-idx={index}
            style={{ "--step-color": step.color, "--step-glow": step.glow }}
          >
            {/* Left: icon column with connecting line */}
            <div className="mtl-left">
              <div className="mtl-icon-wrap">
                {step.icon}
              </div>
              {index < TIMELINE_STEPS.length - 1 && (
                <div className="mtl-connector">
                  <div className="mtl-connector-line" />
                  <div className="mtl-connector-dot" />
                </div>
              )}
            </div>

            {/* Right: content */}
            <div className="mtl-content">
              <span className="mtl-step-id">{step.id}</span>
              <h3 className="mtl-step-title">{step.title}</h3>
              <p className="mtl-step-desc">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileBodySection;
