import { useRef, useState, useEffect } from "react";
import Lottie from "lottie-react";

const FeatureCard = ({ title, desc, anim, reduceMotion }) => {
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

  const handleMouseMove = (e) => {
    if (reduceMotion) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <article 
      className="box" 
      ref={cardRef} 
      role="listitem"
      onMouseMove={handleMouseMove}
    >
      <div className="glass">
        {/* Spotlight background glow */}
        <div className="spotlight" aria-hidden="true" />
        
        <div className="feature-lottie-wrapper" aria-hidden="true">
          {isVisible && (
            <Lottie
              animationData={anim}
              loop={!reduceMotion}
              autoplay={!reduceMotion}
              className="feature-lottie"
            />
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

export default FeatureCard;