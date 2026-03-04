import { useRef, useState, useEffect } from 'react';
import './BodySection.css';
import video from "../Animations/Guide.mp4";
import Lottie from "lottie-react";
import arrow from "../Animations/Arrow.json";
import thumb from "../Animations/ThumbNail.png";

/* ============================================================================
 * PROCESS CARDS DATA
 * Static array defined outside component to prevent recreation on each render.
 * ============================================================================ */
const PROCESS_CARDS = [
  {
    id: 1,
    title: "Drop Your Docs",
    description: "PDFs, Word docs, plain text, URLs — toss them in. SmartDocQ devours any format and extracts every word instantly. No conversions, no hassle.",
    icon: "1",
    gradient: "linear-gradient(45deg, #00FF88, #00BFFF)",
    iconBg: "#25c7bf"
  },
  {
    id: 2,
    title: "AI Breaks It Down",
    description: "Your content gets sliced into smart chunks and converted to semantic embeddings. The AI now understands context, not just keywords. It actually gets you.",
    icon: "2",
    gradient: "linear-gradient(45deg, #0066FF, #9933FF)",
    iconBg: "#2469d1"
  },
  {
    id: 3,
    title: "Lightning-Fast Indexing",
    description: "Everything lands in a high-performance vector database. Search across thousands of pages in milliseconds. Yeah, it's that fast.",
    icon: "3",
    gradient: "linear-gradient(45deg, #FFD700, #FF8C00)",
    iconBg: "#d66920"
  },
  {
    id: 4,
    title: "Smart Retrieval",
    description: "Ask anything in plain English. SmartDocQ pulls the most relevant chunks using semantic understanding — way beyond basic keyword matching.",
    icon: "4",
    gradient: "linear-gradient(45deg, #9933FF, #FF69B4)",
    iconBg: "#9933FF"
  },
  {
    id: 5,
    title: "Gemini-Powered Answers",
    description: "Retrieved content meets Google Gemini. Our RAG pipeline delivers accurate, natural-language answers tailored to your exact question. No fluff, just facts.",
    icon: "5",
    gradient: "linear-gradient(45deg, #FF4500, #9400D3)",
    iconBg: "#bc2d58"
  },
  {
    id: 6,
    title: "Instant Results",
    description: "Clean interface. Real-time responses. Interact with your documents like never before — information at the speed of thought.",
    icon: "6",
    gradient: "linear-gradient(45deg, #7CFC00, #FF1493)",
    iconBg: "#be9b3c"
  }
];

const STEPS = [
  { id: 1, title: "Upload Your Documents", description: "Drag and drop PDFs, DOCX, or TXT files into SmartDocQ." },
  { id: 2, title: "Ask Your Question", description: "Type your query naturally — no keyword gymnastics required." },
  { id: 3, title: "Get Instant Answers", description: "SmartDocQ delivers clear, context-aware answers in real time." }
];

/* ============================================================================
 * VIDEO SECTION COMPONENT
 * Lazy-loaded video that only plays when in viewport.
 * ============================================================================ */
const VideoSection = () => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const videoEl = videoRef.current;
    if (!container || !videoEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoEl.play().catch(() => {});
        } else {
          videoEl.pause();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="video-section" ref={containerRef}>
      <video
        ref={videoRef}
        loop
        playsInline
        muted
        draggable="false"
        disablePictureInPicture
        poster={thumb}
        preload="metadata"
        aria-label="SmartDocQ demo showing document upload and AI-powered question answering"
      >
        <source src={video} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

/* ============================================================================
 * STEPS SECTION COMPONENT
 * How-to-use guide with viewport-triggered Lottie arrows.
 * ============================================================================ */
const StepsSection = () => {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(section);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="steps-section" ref={sectionRef} role="list" aria-label="Getting started steps">
      {STEPS.map((step, index) => (
        <div key={step.id} style={{ display: 'contents' }}>
          <article className="step" role="listitem">
            <h3><span>Step {step.id}:</span> {step.title}</h3>
            <p>{step.description}</p>
          </article>
          {index < STEPS.length - 1 && (
            <div className="arrow-wrapper" aria-hidden="true">
              {isVisible && <Lottie animationData={arrow} loop className="arrow" />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ============================================================================
 * BODY SECTION COMPONENT
 * Main component combining process cards, video demo, and steps guide.
 * ============================================================================ */
function BodySection() {
  return (
    <>
      <section className="body-section" aria-labelledby="process-heading">
        <h2 id="process-heading" className="sr-only">How SmartDocQ Works</h2>
        <div className="cards-grid" role="list" aria-label="SmartDocQ processing pipeline">
          {PROCESS_CARDS.map((card) => (
            <article
              key={card.id}
              className="dark-card"
              style={{ '--card-gradient': card.gradient, '--icon-bg': card.iconBg }}
              role="listitem"
            >
              <div className="card-border" aria-hidden="true" />
              <div className="card-content">
                <div className="card-icon" style={{ backgroundColor: card.iconBg }} aria-hidden="true">
                  {card.icon}
                </div>
                <h3 className="card-title">{card.title}</h3>
                <p className="card-description">{card.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <h2 id="howto-heading" className="work-title">3 Steps. Zero Friction.</h2>

      <section className="how-to-use" aria-labelledby="howto-heading">
        <div className="container">
          <VideoSection />
          <StepsSection />
        </div>
      </section>
    </>
  );
}

export default BodySection;
