import './Footer.css';
import { FaGithub, FaDiscord } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { useLocation, Link } from 'react-router-dom';

/* ============================================================================
 * CONSTANTS
 * Static values defined outside component to prevent recreation on render.
 * ============================================================================ */
const CURRENT_YEAR = new Date().getFullYear();
const FLUSH_PAGES = ["/help", "/privacy", "/terms"];

const Footer = () => {
  const location = useLocation();
  const isUploadPage = location.pathname === "/upload";
  
  const isFlushFooter = FLUSH_PAGES.includes(location.pathname) || location.pathname.startsWith("/share/");

  return (
    <footer className={`footer ${isUploadPage ? 'upload-footer' : ''} ${isFlushFooter ? 'footer--flush' : ''}`} role="contentinfo">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-section company-info">
            <div className="footer-logo">
              <strong className="logo-text">SmartDocQ</strong>
            </div>
            <p className="company-description">
              Search, understand, and chat with your documents.
            </p>
            <nav className="social-links" aria-label="Social media links">
              <a href="https://github.com/SmartDocQ/SmartDocQ.git" className="social-link social-link--github" aria-label="GitHub (opens in new tab)" target="_blank" rel="noreferrer noopener">
                <FaGithub aria-hidden="true" />
              </a>
              <a href="https://x.com/SmartDocQ" className="social-link social-link--x" aria-label="X (opens in new tab)" target="_blank" rel="noreferrer noopener">
                <FaXTwitter aria-hidden="true" />
              </a>
              <a href="https://discord.gg/SwwWp9KvFF" className="social-link social-link--discord" aria-label="Discord (opens in new tab)" target="_blank" rel="noreferrer noopener">
                <FaDiscord aria-hidden="true" />
              </a>
            </nav>
          </div>

          <section className="footer-section support" aria-labelledby="support-heading">
            <h3 id="support-heading">Support</h3>
            <ul className="footer-links">
              <li><Link to="/help">Help Center</Link></li>
              <li><Link to="/help#faq">FAQ</Link></li>
            </ul>
          </section>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <div className="copyright">
              <p>&copy; {CURRENT_YEAR} SmartDocQ. Built for fast, context-aware document search.</p>
            </div>
            <nav className="legal-links" aria-label="Legal">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
