import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./HelpCenter.css";

const Section = ({ id, title, children }) => (
  <section id={id} className="hc-section">
    <h2 className="hc-title">{title}</h2>
    <div className="hc-body">{children}</div>
  </section>
);

const QA = ({ q, a }) => (
  <details className="hc-qa">
    <summary>{q}</summary>
    <div className="hc-a">{a}</div>
  </details>
);

export default function HelpCenter() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
    }
    document.title = "Help Center - SmartDocQ";
  }, [location]);

  // Smoothly scroll to section when hash is present (e.g., /help#faq)
  useEffect(() => {
    if (!location.hash) return;
    const el = document.querySelector(location.hash);
    if (el) {
      setTimeout(() => {
        const y = el.getBoundingClientRect().top + window.pageYOffset - 160;
        window.scrollTo({ top: y, behavior: "smooth" });
      }, 100);
    }
  }, [location]);

  return (
    <div className="help-center-page">
      <div className="help-center">
        <header id="top" className="hc-hero">
          <h1>Help Center</h1>
          <p className="hc-subtitle">Quick answers and guides for SmartDocQ.</p>
          <div className="hc-hero-divider"></div>
        </header>

        <nav className="hc-nav" aria-label="Help Center navigation">
          <a href="#getting-started">Getting Started</a>
          <a href="#uploads">Uploads</a>
          <a href="#security">Security & Consent</a>
          <a href="#qa">Chat & Q/A</a>
          <a href="#study">Study Tools</a>
          <a href="#account">Account</a>
          <a href="#faq">FAQ</a>
          <a href="#troubleshooting">Troubleshoot</a>
          <a href="#contact">Contact</a>
        </nav>

        <Section id="getting-started" title="Getting Started">
          <ul>
            <li>Sign up or sign in securely using email/password credentials or Google Sign-In.</li>
            <li>Go to the <strong>Upload</strong> page to add your learning materials or corporate documents.</li>
            <li>Navigate to your document dashboard and start a <strong>Chat</strong> session to query, summarize, and revise your content.</li>
          </ul>
        </Section>

        <Section id="uploads" title="Uploading & Supported Formats">
          <ul>
            <li><strong>Supported Formats:</strong> PDF, DOCX, DOC, TXT, CSV, and XLSX (Excel) files.</li>
            <li><strong>Spreadsheet Analysis:</strong> Tables inside CSV and Excel documents are automatically parsed and structured for highly accurate cell-level Q&A.</li>
            <li><strong>Processing Pipeline:</strong> Document status updates from <code>queued</code> → <code>indexing</code> → <code>done</code>. Please allow extra time for heavy spreadsheets or long PDFs.</li>
          </ul>
        </Section>

        <Section id="security" title="Sensitive Data Scanner & Consent">
          <p>
            To protect your privacy and ensure compliance, SmartDocQ scans documents for sensitive personal data (PII) before performing vector indexing.
          </p>
          <ul>
            <li><strong>Scanned Patterns:</strong> Email addresses, Phone numbers (Indian mobile formats), Credit cards (validated using the Luhn checksum), Indian PAN cards, Aadhaar cards (validated via Verhoeff checksums), and SSN-like patterns.</li>
            <li><strong>Consent Step:</strong> If sensitive information is detected, indexing is deferred. You must confirm your consent on the dashboard to proceed with indexing the document.</li>
            <li>Your document contents are never used to train global AI models.</li>
          </ul>
        </Section>

        <Section id="qa" title="Conversational Chat & Q/A">
          <ul>
            <li><strong>Grounded Answers:</strong> SmartDocQ utilizes Retrieval-Augmented Generation (RAG) to ensure responses are grounded in your uploaded documents, minimizing AI hallucinations.</li>
            <li><strong>Hybrid Retrieval:</strong> We combine Dense Vector Search (semantic meaning matching) with BM25 Keyword Search (lexical keyword matching) and Reciprocal Rank Fusion (RRF) to retrieve the most relevant passages.</li>
            <li><strong>Gemini AI:</strong> Integrated with Google Gemini models to generate fluid, context-aware answers.</li>
          </ul>
        </Section>

        <Section id="study" title="Study Tools: Flashcards & Quizzes">
          <ul>
            <li><strong>Interactive Flashcards:</strong> Instantly generate interactive study cards based on the key concepts of your documents.</li>
            <li><strong>Smart Quizzes:</strong> Auto-generate customized multiple-choice tests from your documents to test your recall, complete with score tracking and rationales.</li>
          </ul>
        </Section>

        <Section id="account" title="Account & Admin Roles">
          <ul>
            <li><strong>Profile Settings:</strong> Update your name, password, or change your profile avatar (stored securely on Cloudinary).</li>
            <li><strong>Admin Features:</strong> Admins can access the Admin panel to manage users, delete documents, reset statuses, and monitor system metrics.</li>
            <li><strong>Deactivation:</strong> If your account is deactivated by an admin, sign-in access is restricted until reactivated.</li>
          </ul>
        </Section>

        <Section id="faq" title="Frequently Asked Questions (FAQ)">
          <QA q="Which file formats can I upload?" a={<p>You can upload PDF, DOCX, DOC, TXT, CSV, and XLSX files. Document tables are extracted and prepared for structured retrieval.</p>} />
          <QA q="Why does my upload say 'require confirmation' or 'sensitive data detected'?" a={<p>Our automatic compliance scanner detected possible sensitive details (like Aadhaar, PAN, emails, phones, or credit cards). You simply need to click "Confirm Consent" on the document list to proceed with indexing.</p>} />
          <QA q="Why does indexing take longer for Excel/CSV sheets?" a={<p>Spreadsheet files contain structured tables. We extract and parse row/column relationships to enable correct table Q&A, which requires deeper preprocessing than regular plain text.</p>} />
          <QA q="Are my documents private?" a={<p>Yes, all documents are private to your user account and are not shared. They are processed using secure APIs and are never used to train public AI models.</p>} />
          <QA q="Can I share my chat sessions?" a={<p>Yes! You can generate a shareable link for any document chat. Anyone with the link can view the conversation history in read-only mode.</p>} />
          <QA q="How do I delete my documents and data?" a={<p>Deleting a document from your dashboard permanently deletes the source file, its text chunks, its vector embeddings, and all associated chat logs. Deleting your account purges all profile data.</p>} />
          <QA q="Google Sign-In is failing, what should I do?" a={<p>Ensure that pop-up blockers are disabled in your browser settings and you are logged into your Google account. If issues persist, try signing up via email/password.</p>} />
        </Section>

        <Section id="troubleshooting" title="Troubleshooting">
          <ul>
            <li><strong>File Indexing Stuck:</strong> If a file stays in the <code>indexing</code> state, refresh the page. Large files (50+ pages or heavy spreadsheets) may take 1-2 minutes to finish vectorizing.</li>
            <li><strong>Inaccurate AI Responses:</strong> Ensure your question is related to the document content. Try referencing specific terms or narrowing down your query.</li>
            <li><strong>Admin Dashboard Access Denied:</strong> Only accounts flagged as admin in the database are allowed to view the admin controls.</li>
          </ul>
        </Section>

        <Section id="contact" title="Contact Support">
          <p>If you run into issues or have feature requests, please submit a message using the Contact form in your dashboard or email support.</p>
        </Section>

        <Section id="privacy" title="Privacy Policy Quick Reference">
          <p>For more detailed privacy statements, please read our full <a href="/privacy">Privacy Policy</a> page.</p>
        </Section>

        <Section id="terms" title="Terms of Service Quick Reference">
          <p>For usage policies, guidelines, and terms of service, please visit our full <a href="/terms">Terms of Service</a> page.</p>
        </Section>
      </div>
    </div>
  );
}
