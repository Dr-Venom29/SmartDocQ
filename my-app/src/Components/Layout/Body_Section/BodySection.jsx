import { useMediaQuery } from "../../../hooks/useMediaQuery";
import "./BodySection.css";
import ChaosToClaritySection from "./ChaosToClaritySection";
import HowItWorksSection from "./HowItWorksSection";

/* ============================================================================
 * BODY SECTION COMPONENT
 * ============================================================================ */
function BodySection() {
  return (
    <>
      <ChaosToClaritySection />
      <HowItWorksSection />
    </>
  );
}

export default BodySection;
