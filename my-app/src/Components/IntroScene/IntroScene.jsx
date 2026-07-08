import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import "./IntroScene.css";

export default function IntroScene({ onRevealStart }) {
  const containerRef = useRef(null);
  const brandContainerRef = useRef(null);
  const wordmarkRef = useRef(null);
  const dividerRef = useRef(null);
  const subtitleRef = useRef(null);

  const wordmarkText = "SmartDocQ";
  const chars = Array.from(wordmarkText);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Accessibility check
    if (prefersReduced) {
      if (onRevealStart) {
        onRevealStart();
      }
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        if (onRevealStart) {
          onRevealStart();
        }
      }
    });

    // Reset initial styles
    gsap.set(brandContainerRef.current, { opacity: 1, scale: 1 });
    gsap.set(wordmarkRef.current, { letterSpacing: "-0.08em" });
    gsap.set(dividerRef.current, { scaleX: 0 });
    gsap.set(subtitleRef.current, { opacity: 0 });

    const charElements = brandContainerRef.current.querySelectorAll(".intro-char");
    gsap.set(charElements, { opacity: 0 });

    // Step 1: Stagger-reveal letters of the wordmark (pure opacity, no slide)
    tl.to(
      charElements,
      {
        opacity: 1,
        duration: 0.75,
        stagger: 0.05,
        ease: "power1.out"
      },
      0.1
    );

    // Step 2: Smooth letter-spacing expansion (breathing effect)
    tl.to(
      wordmarkRef.current,
      {
        letterSpacing: "-0.03em",
        duration: 1.45,
        ease: "power2.out"
      },
      0.1
    );

    // Step 3: Draw centered divider line
    tl.to(
      dividerRef.current,
      {
        scaleX: 1,
        duration: 0.8,
        ease: "power2.inOut"
      },
      0.65
    );

    // Step 4: Fade in the subtitle
    tl.to(
      subtitleRef.current,
      {
        opacity: 1,
        duration: 0.85,
        ease: "power2.out"
      },
      0.95
    );

    // Step 5: Readability focus hold
    tl.to({}, { duration: 0.8 });

    // Step 6: Refrained exit transition (soft fade and slight scale down)
    tl.to(
      brandContainerRef.current,
      {
        opacity: 0,
        scale: 0.98,
        duration: 0.65,
        ease: "power2.inOut"
      }
    );

    tl.to(
      containerRef.current,
      {
        opacity: 0,
        duration: 0.55,
        ease: "power2.inOut"
      },
      "-=0.45"
    );

    return () => {
      tl.kill();
    };
  }, [onRevealStart]);

  return (
    <div className="intro-scene-overlay" ref={containerRef} aria-label="SmartDocQ Loader">
      {/* Subtle atmospheric vignette */}
      <div className="intro-vignette" aria-hidden="true" />

      {/* Centered Brand Column */}
      <div className="intro-brand-container" ref={brandContainerRef}>
        
        {/* Wordmark (SmartDocQ) Staggered character spans */}
        <h1 className="intro-wordmark" ref={wordmarkRef}>
          {chars.map((char, idx) => (
            <span key={idx} className="intro-char">
              {char}
            </span>
          ))}
        </h1>

        {/* Muted Divider Line Segment */}
        <div className="intro-divider" ref={dividerRef} />

        {/* Subtitle */}
        <span className="intro-subtitle" ref={subtitleRef}>
          Document Intelligence
        </span>

      </div>
    </div>
  );
}
