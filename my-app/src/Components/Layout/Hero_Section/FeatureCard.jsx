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

  return (
    <article className="box" ref={cardRef} role="listitem">
      <div className="glass">
        <div className="card-top-bar" aria-hidden="true" />
        <div className="card-corner card-corner-tl" aria-hidden="true" />
        <div className="card-corner card-corner-tr" aria-hidden="true" />
        <div className="card-corner card-corner-bl" aria-hidden="true" />
        <div className="card-corner card-corner-br" aria-hidden="true" />
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