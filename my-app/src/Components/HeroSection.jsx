import { useRef, useLayoutEffect, useState, useEffect } from "react";
import "./HeroSection.css";
import Lottie from "lottie-react";
import aiAnimation from "../Animations/2.json";
import gemini from "../Animations/Gemini.json";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import f1 from "../Animations/f1.json";
import f2 from "../Animations/f2.json";
import f3 from "../Animations/f3.json";
import f4 from "../Animations/f4.json";
import f5 from "../Animations/f5.json";
import f6 from "../Animations/f6.json";
import f7 from "../Animations/f7.json";
import f8 from "../Animations/f8.json";
import f10 from "../Animations/f10.json";
import { useNavigate } from "react-router-dom";
import { useToast } from "./ToastContext";
import ClickSpark from "./Effects/ClickSpark";

gsap.registerPlugin(ScrollTrigger);

/* ============================================================================
 * FEATURE DATA
 * Static array defined outside component to prevent recreation on each render.
 * ============================================================================ */
const FEATURES = [
  {
    title: "Drop. Upload. Done.",
    desc: "Drag your PDFs, DOCX, or TXT files and watch the magic happen. Lightning-fast processing, instant previews, and zero hassle — your documents are ready before your coffee cools down.",
    anim: f1
  },
  {
    title: "Ask Anything. Get Answers.",
    desc: "No more endless scrolling. Just ask in plain English and get laser-precise answers pulled straight from your docs. It's like having a genius assistant who actually read everything.",
    anim: f2
  },
  {
    title: "Auto-Generate Quizzes",
    desc: "Turn any document into an interactive study session. MCQs, True/False, short answers — all auto-generated with instant feedback. Study smarter, not harder.",
    anim: f3
  },
  {
    title: "It Remembers Everything",
    desc: "SmartDocQ learns your context. Ask follow-ups, dive deeper, go off on tangents — it keeps up. Every conversation builds on the last, making you unstoppable.",
    anim: f4
  },
  {
    title: "Rate. Improve. Repeat.",
    desc: "Love an answer? Hate it? Tell us. Your feedback trains the AI to get better, faster. You're not just using SmartDocQ — you're shaping it.",
    anim: f5
  },
  {
    title: "Your Digital Workspace",
    desc: "Every doc, every chat, every insight — organized and accessible. Rename files, export conversations, track history. Your research, your way, always at your fingertips.",
    anim: f6
  },
  {
    title: "Any Format. Any Source.",
    desc: "PDF? Check. Word docs? Check. Plain text? Web pages? Check and check. SmartDocQ handles whatever you throw at it without breaking a sweat.",
    anim: f7
  },
  {
    title: "Fort Knox Security",
    desc: "Your data stays yours. Enterprise-grade validation, spam detection, and content filtering keep your workspace clean and your information locked down tight.",
    anim: f8
  },
  {
    title: "Effortless Doc Control",
    desc: "Bulk actions, one-click exports, smart organization. Manage hundreds of documents like a pro without the complexity. Simple. Clean. Powerful.",
    anim: f10
  }
];

/* ============================================================================
 * FEATURE CARD COMPONENT
 * Renders individual feature with viewport-triggered Lottie animation.
 * Animation starts when card is ~10% visible in viewport.
 * ============================================================================ */
const FeatureCard = ({ title, desc, anim }) => {
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.1, rootMargin: "50px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <article className="box" ref={cardRef} role="listitem">
      <div className="glass">
        <div className="feature-lottie-wrapper" aria-hidden="true">
          {isVisible && (
            <Lottie animationData={anim} loop className="feature-lottie" />
          )}
        </div>
        <div className="content">
          <h3>{title}</h3>
          <p>{desc}</p>
        </div>
      </div>
    </article>
  );
};

/* ============================================================================
 * HERO SECTION COMPONENT
 * Landing page hero with GSAP horizontal scroll for features.
 * ============================================================================ */
const HeroSection = () => {
  const sectionRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useLayoutEffect(() => {
    if (!isMounted || !sectionRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const section = sectionRef.current;

    const disableAnim =
      reduceMotion ||
      window.innerWidth <= 768 ||
      container.scrollWidth <= section.clientWidth;
    if (disableAnim) return;

    const getDistance = () => Math.max(0, container.scrollWidth - section.clientWidth);
    if (getDistance() === 0) return;

    const tween = gsap.to(container, {
      x: () => -getDistance() + "px",
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => "+=" + getDistance(),
        scrub: true,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    const handleResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", handleResize);

    const ro = new ResizeObserver(() => ScrollTrigger.refresh());
    ro.observe(container);

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
    };
  }, [isMounted, reduceMotion]);

  const handleGetStarted = () => {
    const user = localStorage.getItem("user");
    if (user) {
      navigate("/upload");
    } else {
      showToast("Please log in to get started!", { type: "error" });
    }
  };

  return (
    <ClickSpark
      sparkColor="#fff"
      sparkSize={10}
      sparkRadius={15}
      sparkCount={8}
      duration={400}
    >
      <section className="hero-section" aria-labelledby="hero-heading">
        <div className="hero-container">
          <div className="hero-left">
            <div className="badge">
              <span>Powered by</span>
              <Lottie animationData={gemini} loop autoplay className="gemini-icon" aria-hidden="true" />
            </div>
            <h1 id="hero-heading" className="hero-heading">
              Your Documents.<br />
              <span className="gradient-text">Supercharged.</span>
            </h1>
            <p className="hero-description">
              Stop drowning in documents. Upload, ask questions, generate quizzes, and extract insights — all in seconds.
              <br />Powered by Gemini AI, SmartDocQ turns your static files into an intelligent, searchable knowledge base that actually works for you.
            </p>
            <button type="button" className="get-started-btn" onClick={handleGetStarted}>
              Get Started →
            </button>
          </div>
          <div className="hero-right" aria-hidden="true">
            <Lottie animationData={aiAnimation} loop className="hero-lottie" />
          </div>
        </div>
      </section>

      <h2 id="feat" className="feature-title">Why SmartDocQ Stands Out</h2>

      <section className="features-section" ref={sectionRef} aria-label="Product features">
        <div className="features-container" ref={containerRef} role="list">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} title={f.title} desc={f.desc} anim={f.anim} />
          ))}
        </div>
        <h2 className="use-title">From Chaos to Clarity</h2>
      </section>
    </ClickSpark>
  );
};

export default HeroSection;
