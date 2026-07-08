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
import { motion } from "framer-motion";

gsap.registerPlugin(ScrollTrigger);

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.03,
    }
  }
};

const charVariants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 140,
      damping: 12
    }
  }
};

const featureWords = [
  { text: "Why", isAccent: false },
  { text: "SmartDocQ", isAccent: true },
  { text: "Stands", isAccent: false },
  { text: "Out", isAccent: false }
];

const clarityWords = [
  { text: "From", isAccent: false },
  { text: "Chaos", isAccent: false },
  { text: "To", isAccent: false },
  { text: "Clarity", isAccent: true }
];

const HeroSection = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const sectionRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const [reduceMotion, setReduceMotion] = useState(false);

  // Respect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

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
            <div className="badge">
              <span>Powered by Gemini</span>
            </div>
            <h1 id="hero-heading" className="hero-heading">
              Your Documents.<br />
              <span className="gradient-text">Supercharged.</span>
            </h1>
            <p className="hero-description">
              <span className="highlight-action">Upload documents</span>, <span className="highlight-action">chat with your content</span>, <span className="highlight-action">generate quizzes and flashcards</span>, and get <span className="highlight-action">instant, citation-backed answers</span>. Powered by <span className="highlight-brand">Gemini AI</span> and <span className="highlight-feature">hybrid search</span>, SmartDocQ turns every document into an interactive knowledge base.
            </p>
            <button type="button" className="get-started-btn" onClick={handleGetStarted}>
              Get Started <span className="btn-arrow">→</span>
            </button>
          </div>

          <div className="hero-right" aria-hidden="true">
            <div className="hero-3d-scene">
              <div className="hero-3d-stack">
                


                {/* Layer 3: AI Parsed Insights (Top) */}
                <div className="stack-layer layer-top">
                  <div className="layer-glass-card border-cyan">
                    <div className="card-header">
                      <span className="header-filename">ai_insights.json</span>
                      <div className="header-status">
                        <span className="status-dot cyan-pulse" />
                        <span className="status-label">Resolved</span>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="insight-bubble">
                        <div className="bubble-header">
                          <span className="bubble-category">AI Chat Prompt</span>
                          <span className="bubble-time">Verified</span>
                        </div>
                        <div className="chat-query">Q: What was the revenue growth?</div>
                        <div className="chat-answer">➔ Revenue grew by 24.8% ($4.2B total).</div>
                      </div>
                    </div>
                    <div className="card-footer">
                      <span className="footer-metric">Grounded context index</span>
                      <span className="footer-metric">99.4% Accuracy</span>
                    </div>
                  </div>
                </div>

                {/* Layer 2: Hybrid Search Vector Semantic Graph (Middle) */}
                <div className="stack-layer layer-middle">
                  <div className="layer-glass-card border-purple">
                    <div className="card-header">
                      <span className="header-filename">vector_embeddings.bin</span>
                      <div className="header-status">
                        <span className="status-dot purple-pulse" />
                        <span className="status-label">Indexed</span>
                      </div>
                    </div>
                    <div className="card-body vector-mapping-zone">
                      <div className="vector-details">
                        <div className="vector-row"><span className="tag-cyan">[Revenue]</span> ➔ <span className="vector-code">0.941, -0.218, 0.083</span></div>
                        <div className="vector-row"><span className="tag-purple">[Growth]</span>  ➔ <span className="vector-code">0.712, -0.419, 0.114</span></div>
                      </div>
                      <svg className="vector-graph-svg" viewBox="0 0 200 60">
                        <line x1="25" y1="30" x2="75" y2="15" className="graph-edge" />
                        <line x1="75" y1="15" x2="125" y2="45" className="graph-edge" />
                        <line x1="75" y1="15" x2="175" y2="25" className="graph-edge" />
                        <line x1="125" y1="45" x2="175" y2="25" className="graph-edge" />
                        
                        <circle cx="25" cy="30" r="3" className="graph-vertex" />
                        <circle cx="75" cy="15" r="4.5" className="graph-vertex highlight" />
                        <circle cx="125" cy="45" r="3" className="graph-vertex" />
                        <circle cx="175" cy="25" r="4.5" className="graph-vertex highlight" />
                      </svg>
                    </div>
                    <div className="card-footer">
                      <span className="footer-metric">1536-dim embedding</span>
                      <span className="footer-metric">Similarity: 0.92</span>
                    </div>
                  </div>
                </div>

                {/* Layer 1: Ingested Source File (Base) */}
                <div className="stack-layer layer-base">
                  <div className="layer-glass-card border-grey">
                    <div className="card-header">
                      <span className="header-filename">source_document.pdf</span>
                      <div className="header-status">
                        <span className="status-dot grey-pulse" />
                        <span className="status-label">Ingested</span>
                      </div>
                    </div>
                    <div className="card-body document-raw-view">
                      <div className="raw-doc-title">ANNUAL_REPORT_2026.PDF</div>
                      <p className="raw-doc-snippet">
                        "Operating revenue increased by 24.8% year-over-year to $4.2B. Key growth drivers include Cloud offerings..."
                      </p>
                    </div>
                    <div className="card-footer">
                      <span className="footer-metric">Format: OCR text scan</span>
                      <span className="footer-metric">340 KB</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      <div className="premium-header-wrap" style={{ marginTop: "-16px" }}>
        <span className="section-meta-badge">01 // Capabilities</span>
        <motion.h2 
          id="feat" 
          className="premium-section-header"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {featureWords.map((word, wordIdx) => (
            <span key={wordIdx} className={`title-word ${word.isAccent ? "premium-accent-word" : ""}`}>
              {word.text.split("").map((char, charIdx) => (
                <motion.span
                  key={charIdx}
                  className="title-char"
                  variants={charVariants}
                  whileHover={{ 
                    y: -6,
                    scale: 1.08,
                    color: word.isAccent ? undefined : "#06b6d4",
                    transition: { type: "spring", stiffness: 450, damping: 12 }
                  }}
                >
                  {char}
                </motion.span>
              ))}
              <span className="title-char-space">&nbsp;</span>
            </span>
          ))}
        </motion.h2>
        <div className="premium-header-line-container">
          <div className="premium-header-line" />
          <span className="sparkle-dot">✦</span>
          <div className="premium-header-line" />
        </div>
      </div>

      <section className="features-section" ref={sectionRef} aria-label="Product features">
        <div className="features-container" ref={containerRef} role="list">
          {FEATURES.map((f, idx) => (
            <FeatureCard
              key={f.title}
              index={idx}
              title={f.title}
              desc={f.desc}
              anim={f.anim}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
        <div className="premium-header-wrap" style={{ marginTop: "-60px", marginBottom: "20px" }}>
          <span className="section-meta-badge">02 // Transformation</span>
          <motion.h2 
            className="premium-section-header"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {clarityWords.map((word, wordIdx) => (
              <span key={wordIdx} className={`title-word ${word.isAccent ? "premium-accent-word" : ""}`}>
                {word.text.split("").map((char, charIdx) => (
                  <motion.span
                    key={charIdx}
                    className="title-char"
                    variants={charVariants}
                    whileHover={{ 
                      y: -6,
                      scale: 1.08,
                      color: word.isAccent ? undefined : "#06b6d4",
                      transition: { type: "spring", stiffness: 450, damping: 12 }
                    }}
                  >
                    {char}
                  </motion.span>
                ))}

                <span className="title-char-space">&nbsp;</span>
              </span>
            ))}
          </motion.h2>
          <div className="premium-header-line-container">
            <div className="premium-header-line" />
            <span className="sparkle-dot">✦</span>
            <div className="premium-header-line" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default HeroSection;