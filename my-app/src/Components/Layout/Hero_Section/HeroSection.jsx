import { useRef, useLayoutEffect, useState, useEffect } from "react";
import "./HeroSection.css";
import Lottie from "lottie-react";
import aiAnimation from "./assets/2.json";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useNavigate } from "react-router-dom";
import FeatureCard from "./FeatureCard";
import { FEATURES } from "./featuresData";

gsap.registerPlugin(ScrollTrigger);

const HeroSection = () => {
  const sectionRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useLayoutEffect(() => {
    if (!sectionRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const section = sectionRef.current;

    let tween;
    let resizeTimer;

    const init = () => {
      ScrollTrigger.getAll().forEach(st => st.kill());

      const disableAnim =
        reduceMotion ||
        window.innerWidth <= 768 ||
        container.scrollWidth <= section.clientWidth;

      if (disableAnim) return;

      const getDistance = () =>
        Math.max(0, container.scrollWidth - section.clientWidth);

      if (getDistance() === 0) return;

      tween = gsap.to(container, {
        x: () => -getDistance() + "px",
        ease: "none",
        immediateRender: false,
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => "+=" + getDistance(),
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      ScrollTrigger.refresh();
    };

    const onLoad = () => {
      setTimeout(init, 100);
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad);
    }

    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 100);
    });
    ro.observe(container);

    return () => {
      clearTimeout(resizeTimer);
      tween?.scrollTrigger?.kill();
      tween?.kill();
      ro.disconnect();
      window.removeEventListener("load", onLoad);
    };
  }, [reduceMotion]);

  const handleGetStarted = () => {
    const user = localStorage.getItem("user");
    if (user) {
      navigate("/upload");
    } else {
      window.dispatchEvent(new Event("unauthorized"));
    }
  };

  return (
    <>
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
              Turn information overload into instant understanding.
              <br />Upload documents, chat with your content, generate quizzes and flashcards, and discover insights faster than ever. SmartDocQ combines Gemini AI with hybrid search to make every document searchable, interactive, and actionable.
            </p>
            <button type="button" className="get-started-btn" onClick={handleGetStarted}>
              Get Started <span className="btn-arrow">→</span>
            </button>
          </div>
          <div className="hero-right" aria-hidden="true">
            <Lottie
              animationData={aiAnimation}
              loop={!reduceMotion}
              autoplay={!reduceMotion}
              className="hero-lottie"
            />
          </div>
        </div>
      </section>

      <h2 id="feat" className="feature-title">
        <span className="title-diamond">◆</span>
        Why SmartDocQ Stands Out
        <span className="title-diamond">◆</span>
      </h2>

      <section className="features-section" ref={sectionRef} aria-label="Product features">
        <div className="features-container" ref={containerRef} role="list">
          {FEATURES.map((f) => (
            <FeatureCard
              key={f.title}
              title={f.title}
              desc={f.desc}
              anim={f.anim}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
        <h2 className="use-title">
          <span className="title-diamond">◆</span>
          From Chaos to Clarity
          <span className="title-diamond">◆</span>
        </h2>
      </section>
    </>
  );
};

export default HeroSection;