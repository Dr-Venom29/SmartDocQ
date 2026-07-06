import { useState } from 'react';
import { motion } from 'framer-motion';
import SimulationSection from "./SimulationSection";
import "./SimulationSection.css";

/* ============================================================================
 * HOW IT WORKS SECTION COMPONENT
 * ============================================================================ */
function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [chatTypedText, setChatTypedText] = useState("");
  const [cardFlipped, setCardFlipped] = useState(false);
  const [quizSelected, setQuizSelected] = useState(null);

  // Drag states
  const [dragPhase, setDragPhase] = useState("idle");
  const [dragPosition, setDragPosition] = useState({ x: 80, y: 80 });

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
      <div className="work-title-wrap">
        <motion.h2 
          id="howto-heading" 
          className="work-title"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {words.map((word, wordIdx) => (
            <span key={wordIdx} className={`title-word ${word.isAccent ? "accent-gradient-text" : ""}`}>
              {word.text.split("").map((char, charIdx) => (
                <motion.span
                  key={charIdx}
                  className="title-char"
                  variants={charVariants}
                  whileHover={{ 
                    y: -8,
                    scale: 1.1,
                    color: word.isAccent ? undefined : "#06b6d4",
                    transition: { type: "spring", stiffness: 400, damping: 10 }
                  }}
                >
                  {char}
                </motion.span>
              ))}
              <span className="title-char-space">&nbsp;</span>
            </span>
          ))}
        </motion.h2>
      </div>

      <section className="how-to-use" aria-labelledby="howto-heading">
        <div className="howto-container">
          {/* Main Visualizer Mockup on the Left */}
          <SimulationSection 
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            uploadProgress={uploadProgress}
            setUploadProgress={setUploadProgress}
            uploadComplete={uploadComplete}
            setUploadComplete={setUploadComplete}
            dragPhase={dragPhase}
            setDragPhase={setDragPhase}
            dragPosition={dragPosition}
            setDragPosition={setDragPosition}
            chatTypedText={chatTypedText}
            setChatTypedText={setChatTypedText}
            cardFlipped={cardFlipped}
            setCardFlipped={setCardFlipped}
            quizSelected={quizSelected}
            setQuizSelected={setQuizSelected}
          />

          {/* Premium Vertical Steps Process flow positioned on the Right */}
          <div className="sim-vertical-steps" role="list" aria-label="Getting started steps">
            <div className="sim-vertical-step-card blue-theme" role="listitem">
              <div className="sim-step-num">01 / UPLOAD</div>
              <h3 className="sim-step-title">Upload Your Documents</h3>
              <p className="sim-step-desc">
                Upload PDFs, Word documents, spreadsheets, or text files. SmartDocQ automatically processes and indexes them.
              </p>
              <div className="sim-card-active-glow" />
            </div>

            <div className="sim-vertical-step-card green-theme" role="listitem">
              <div className="sim-step-num">02 / INTERACT</div>
              <h3 className="sim-step-title">Ask AI About Your Documents</h3>
              <p className="sim-step-desc">
                Ask questions, generate summaries, flashcards, quizzes, and receive document-grounded answers with citations.
              </p>
              <div className="sim-card-active-glow" />
            </div>

            <div className="sim-vertical-step-card purple-theme" role="listitem">
              <div className="sim-step-num">03 / MASTER</div>
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
