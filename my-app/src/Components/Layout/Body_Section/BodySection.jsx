import { useRef, useState, useEffect } from "react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import "./BodySection.css";
import HowItWorksSection from "./HowItWorksSection";

/* ============================================================================
 * PROCESS CARDS DATA
 * Spectrum colors representing flow: Indigo -> Blue -> Cyan/Teal -> Violet -> Pink -> Fuchsia/Purple
 * ============================================================================ */
const PROCESS_CARDS = [
  {
    id: 1,
    title: "Drop Your Docs",
    description: "Upload PDFs, Word documents, spreadsheets (.csv/.xlsx), or plain text files. SmartDocQ automatically processes and indexes your content—no manual conversions required.",
    icon: "1",
    themeColor: "#818cf8",
    gradient: "linear-gradient(135deg, #818cf8 0%, #3b82f6 100%)",
    iconBg: "rgba(129, 140, 248, 0.12)"
  },
  {
    id: 2,
    title: "AI Breaks It Down",
    description: "SmartDocQ analyzes, structures, and understands your content so it can retrieve the most relevant information when you need it.",
    icon: "2",
    themeColor: "#3b82f6",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
    iconBg: "rgba(59, 130, 246, 0.12)"
  },
  {
    id: 3,
    title: "Semantic Indexing",
    description: "Document embeddings are securely stored and indexed, enabling fast and accurate semantic search across your content.",
    icon: "3",
    themeColor: "#06b6d4",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #10b981 100%)",
    iconBg: "rgba(6, 182, 212, 0.12)"
  },
  {
    id: 4,
    title: "Smart Retrieval",
    description: "SmartDocQ combines semantic vector search with BM25 keyword retrieval to surface the most relevant passages with exceptional accuracy.",
    icon: "4",
    themeColor: "#10b981",
    gradient: "linear-gradient(135deg, #10b981 0%, #fbbf24 100%)",
    iconBg: "rgba(16, 185, 129, 0.12)"
  },
  {
    id: 5,
    title: "Gemini-Powered Answers",
    description: "Relevant document passages are retrieved and passed to Google Gemini, which generates context-aware answers grounded in your content.",
    icon: "5",
    themeColor: "#fbbf24",
    gradient: "linear-gradient(135deg, #fbbf24 0%, #f43f5e 100%)",
    iconBg: "rgba(251, 191, 36, 0.12)"
  },
  {
    id: 6,
    title: "Verified Citations",
    description: "Every answer is accompanied by highlighted supporting passages and citations, making responses transparent and easy to verify.",
    icon: "6",
    themeColor: "#ec4899",
    gradient: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
    iconBg: "rgba(236, 72, 153, 0.12)"
  }
];

/* ============================================================================
 * BODY SECTION COMPONENT
 * Renders the "How SmartDocQ Works" process cards and delegates
 * the video demo + steps guide to <HowItWorksSection />.
 * ============================================================================ */
function BodySection() {
  const gridRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const element = gridRef.current;
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
      { 
        threshold: 0.05,
        rootMargin: "0px 0px -50px 0px" 
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [reduceMotion]);

  return (
    <>
      <section className="body-section" aria-labelledby="process-heading">
        <h2 id="process-heading" className="sr-only">How SmartDocQ Works</h2>
        <div 
          ref={gridRef}
          className={`cards-grid ${isVisible ? "animate-in" : ""}`} 
          role="list" 
          aria-label="SmartDocQ processing pipeline"
        >
          {PROCESS_CARDS.map((card) => (
            <article
              key={card.id}
              className="dark-card"
              data-id={card.id}
              style={{ 
                '--card-gradient': card.gradient, 
                '--icon-bg': card.iconBg,
                '--theme-color': card.themeColor,
                '--theme-color-glow': `${card.themeColor}22`
              }}
              role="listitem"
            >
              {/* Connected flow lines with animated data dots */}
              <div className="card-connector horizontal" aria-hidden="true">
                <div className="connector-line" />
                <div className="connector-dot" />
              </div>
              <div className="card-connector vertical" aria-hidden="true">
                <div className="connector-line" />
                <div className="connector-dot" />
              </div>

              {/* Sleek, ambient backing backlight glow */}
              <div className="card-ambient-glow" aria-hidden="true" />
              {/* Outer border container */}
              <div className="card-border" aria-hidden="true" />
              {/* Glass container */}
              <div className="card-content">
                <div className="card-icon" aria-hidden="true">
                  {card.icon}
                </div>
                <h3 className="card-title">{card.title}</h3>
                <p className="card-description">{card.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <HowItWorksSection />
    </>
  );
}

export default BodySection;

