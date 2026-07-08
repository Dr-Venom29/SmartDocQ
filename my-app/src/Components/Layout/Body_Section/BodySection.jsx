import { useRef, useState, useEffect } from "react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import "./BodySection.css";
import MobileBodySection from "./MobileBodySection";
import HowItWorksSection from "./HowItWorksSection";

/* ============================================================================
 * DATA DEFINITIONS
 * ============================================================================ */
const COMPARISON_ROWS = [
  { old: "Read hundreds of pages", new: "Ask one question" },
  { old: "Search manually", new: "Instant AI answers" },
  { old: "Write summaries", new: "One-click summaries" },
  { old: "Create study notes", new: "Auto flashcards" },
  { old: "Design quizzes", new: "AI-generated quizzes" },
  { old: "Jump between documents", new: "Unified knowledge" }
];

const OUTCOME_CARDS = [
  {
    title: "Save Hours",
    desc: "Stop digging through documents. Find answers in seconds.",
    color: "#f59e0b",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    )
  },
  {
    title: "Learn Faster",
    desc: "Understand complex reports, papers, and notes instantly.",
    color: "#a855f7",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    )
  },
  {
    title: "Stay Organized",
    desc: "Everything becomes searchable from one workspace.",
    color: "#0ea5e9",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    )
  },
  {
    title: "Trust Every Answer",
    desc: "Every response is grounded in your uploaded documents.",
    color: "#10b981",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    )
  },
  {
    title: "Works With Your Files",
    type: "files",
    pills: ["PDF", "DOCX", "TXT", "CSV", "XLSX"],
    color: "#6366f1",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    )
  },
  {
    title: "Ready for Everyone",
    type: "audience",
    pills: ["Students", "Researchers", "Professionals", "Teams"],
    color: "#f43f5e",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }
];

/* ============================================================================
 * DESKTOP BODY SECTION COMPONENT
 * ============================================================================ */
function DesktopBodySection() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    if (reduceMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [reduceMotion]);

  return (
    <>
      <section className="why-choose-section" ref={sectionRef}>

        {/* Responsive Grid Layout */}
        <div className={`why-choose-container ${isVisible ? "animate-in" : ""}`}>
          
          {/* Left Column: Workflow Comparison */}
          <div className="workflow-comparison-panel">
            <div className="workflow-header">
              <span className="workflow-title traditional">Traditional Workflow</span>
              <span className="workflow-separator" />
              <span className="workflow-title smartdocq">SmartDocQ</span>
            </div>
            
            <div className="workflow-rows">
              {COMPARISON_ROWS.map((row, idx) => (
                <div 
                  key={idx} 
                  className="workflow-row" 
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <div className="workflow-col traditional-col">
                    <span className="workflow-bullet traditional-bullet" />
                    <span className="workflow-text">{row.old}</span>
                  </div>
                  <div className="workflow-arrow" aria-hidden="true">→</div>
                  <div className="workflow-col smartdocq-col">
                    <span className="workflow-bullet smartdocq-bullet" />
                    <span className="workflow-text">{row.new}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Outcome Cards Grid */}
          <div className="outcome-grid">
            {OUTCOME_CARDS.map((card, idx) => (
              <div 
                key={idx} 
                className="outcome-card"
                style={{ 
                  '--theme-color': card.color,
                  '--theme-glow': `${card.color}09`,
                  '--theme-border-glow': `${card.color}15`,
                  animationDelay: `${idx * 0.06}s`
                }}
              >
                {/* Glowing Backing Backlight */}
                <div className="card-backing-glow" aria-hidden="true" />
                <div className="card-border-glow" aria-hidden="true" />
                
                <div className="outcome-card-header">
                  <div className="outcome-icon" aria-hidden="true" style={{ color: card.color }}>
                    {card.icon}
                  </div>
                  <h4 className="outcome-title">{card.title}</h4>
                </div>
                
                {card.type === "files" ? (
                  <div className="outcome-badge-container">
                    {card.pills.map((pill) => (
                      <span key={pill} className="outcome-badge monospace-badge">
                        {pill}
                      </span>
                    ))}
                  </div>
                ) : card.type === "audience" ? (
                  <div className="outcome-badge-container">
                    {card.pills.map((pill) => (
                      <span key={pill} className="outcome-badge text-badge">
                        {pill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="outcome-desc">{card.desc}</p>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      <HowItWorksSection />
    </>
  );
}

/* ============================================================================
 * BODY SECTION COMPONENT
 * ============================================================================ */
function BodySection() {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return isMobile ? <MobileBodySection /> : <DesktopBodySection />;
}

export default BodySection;
