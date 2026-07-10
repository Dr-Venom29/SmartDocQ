import { useState } from 'react';
import { motion } from 'framer-motion';
import SimulationSection from "./SimulationSection";
import "./SimulationSection.css";

/* ============================================================================
 * HOW IT WORKS SECTION COMPONENT
 * ============================================================================ */
function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);

  // Framer Motion kinetic text variants
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

  const words = [
    { text: "See", isAccent: false },
    { text: "SmartDocQ", isAccent: true },
    { text: "in", isAccent: false },
    { text: "Action", isAccent: false }
  ];

  return (
    <>
      <div className="simple-header-wrap" style={{ marginTop: "40px", marginBottom: "20px", display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        <motion.h2 
          id="howto-heading" 
          className="premium-section-header"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {words.map((word, wordIdx) => (
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

      <section className="how-to-use" aria-labelledby="howto-heading">
        <div className="howto-container">
          {/* Main Visualizer Mockup on the Left */}
          <SimulationSection 
            activeStep={activeStep}
            setActiveStep={setActiveStep}
          />

          {/* Premium Vertical Steps Process flow positioned on the Right */}
          <div className="sim-vertical-steps" role="list" aria-label="Getting started steps">
            <div className="sim-vertical-step-card blue-theme active" role="listitem">
              <div className="sim-step-num">UPLOAD</div>
              <h3 className="sim-step-title">Upload Your Documents</h3>
              <p className="sim-step-desc">
                Upload PDFs, Word documents, spreadsheets, or text files. SmartDocQ automatically processes and indexes them.
              </p>
              <div className="sim-card-active-glow" />
            </div>

            <div className="sim-vertical-step-card green-theme active" role="listitem">
              <div className="sim-step-num">INTERACT</div>
              <h3 className="sim-step-title">Ask AI About Your Documents</h3>
              <p className="sim-step-desc">
                Ask questions, generate summaries, flashcards, quizzes, and receive document-grounded answers with citations.
              </p>
              <div className="sim-card-active-glow" />
            </div>

            <div className="sim-vertical-step-card purple-theme active" role="listitem">
              <div className="sim-step-num">MASTER</div>
              <h3 className="sim-step-title">Study Smarter</h3>
              <p className="sim-step-desc">
                Every response is grounded in your documents with highlighted citations for transparent and trustworthy learning.
              </p>
              <div className="sim-card-active-glow" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default HowItWorksSection;
