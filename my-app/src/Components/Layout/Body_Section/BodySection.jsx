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
    description: "Upload PDFs, Word docs, plain text, or URLs. SmartDocQ reads the content and prepares it for indexing—no manual conversions needed.",
    icon: "1",
    themeColor: "#818cf8",
    gradient: "linear-gradient(135deg, #818cf8 0%, #3b82f6 100%)",
    iconBg: "rgba(129, 140, 248, 0.12)"
  },
  {
    id: 2,
    title: "AI Breaks It Down",
    description: "Your content is split into manageable chunks and converted to semantic embeddings so the system understands context, not just keywords.",
    icon: "2",
    themeColor: "#3b82f6",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
    iconBg: "rgba(59, 130, 246, 0.12)"
  },
  {
    id: 3,
    title: "Index documents into a vector database",
    description: "Those embeddings are stored in a vector database, making your documents semantically searchable across large collections.",
    icon: "3",
    themeColor: "#06b6d4",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #10b981 100%)",
    iconBg: "rgba(6, 182, 212, 0.12)"
  },
  {
    id: 4,
    title: "Smart Retrieval",
    description: "Ask questions in plain English. SmartDocQ retrieves the most relevant chunks from the vector database using semantic similarity instead of simple keyword matching.",
    icon: "4",
    themeColor: "#10b981",
    gradient: "linear-gradient(135deg, #10b981 0%, #fbbf24 100%)",
    iconBg: "rgba(16, 185, 129, 0.12)"
  },
  {
    id: 5,
    title: "Gemini-Powered Answers",
    description: "Retrieved chunks are passed to Google Gemini, which generates clear natural-language answers using only the provided document context.",
    icon: "5",
    themeColor: "#fbbf24",
    gradient: "linear-gradient(135deg, #fbbf24 0%, #f43f5e 100%)",
    iconBg: "rgba(251, 191, 36, 0.12)"
  },
  {
    id: 6,
    title: "Get answers grounded in your documents",
    description: "See answers together with supporting passages, so responses stay grounded in your own documents.",
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

