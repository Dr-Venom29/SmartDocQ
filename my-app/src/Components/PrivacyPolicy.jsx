import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./PrivacyPolicy.css";

export default function PrivacyPolicy() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location]);

  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <header id="top" className="privacy-hero">
          <h1>Privacy Policy</h1>
          <p>Effective Date: March 1, 2026</p>
        </header>

        <section className="privacy-section">
          <h2>1. Introduction</h2>
          <p>
            SmartDocQ ("we," "us," or "our") is an AI-powered document assistant that enables 
            users to upload documents and interact with them through intelligent search, 
            question-answering, and study tool generation. This Privacy Policy explains how 
            we collect, use, disclose, and safeguard your information when you use our service.
          </p>
          <p>
            By accessing or using SmartDocQ, you consent to the practices described in this 
            policy. If you do not agree, please discontinue use immediately.
          </p>
        </section>

        <section className="privacy-section">
          <h2>2. Information We Collect</h2>
          
          <h3>2.1 Account Information</h3>
          <ul>
            <li>Name, email address, and encrypted password (for local authentication)</li>
            <li>Google account identifier (if using Google Sign-In)</li>
            <li>Profile avatar (stored via Cloudinary)</li>
            <li>Account creation date and last login timestamp</li>
          </ul>

          <h3>2.2 Document Data</h3>
          <ul>
            <li>Files you upload (PDF, DOCX, TXT formats)</li>
            <li>Extracted text content for AI processing</li>
            <li>Vector embeddings generated for semantic search</li>
            <li>Document metadata (filename, size, upload date, processing status)</li>
          </ul>

          <h3>2.3 Usage Data</h3>
          <ul>
            <li>Chat conversations and Q&A history associated with documents</li>
            <li>Generated content (quizzes, flashcards, summaries)</li>
            <li>Feature usage patterns and interaction timestamps</li>
            <li>Technical logs for system reliability and error diagnostics</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>3. How We Use Your Information</h2>
          <ul>
            <li><strong>Service Delivery:</strong> Process documents, generate AI responses, create study materials, and enable document search functionality</li>
            <li><strong>Account Management:</strong> Authenticate users, manage sessions, and personalize your experience</li>
            <li><strong>Service Improvement:</strong> Analyze usage patterns, diagnose technical issues, and enhance features</li>
            <li><strong>Security:</strong> Detect fraud, prevent abuse, enforce rate limits, and protect against unauthorized access</li>
            <li><strong>Legal Compliance:</strong> Comply with applicable laws, regulations, and legal processes</li>
          </ul>
          <p>
            <strong>We do not sell your personal data.</strong> We do not use your documents 
            to train AI models. Your content is processed solely to provide the requested service features.
          </p>
        </section>

        <section className="privacy-section">
          <h2>4. Data Storage and Security</h2>
          
          <h3>4.1 Storage Infrastructure</h3>
          <ul>
            <li><strong>Primary Database:</strong> MongoDB Atlas (cloud-hosted) for user accounts, documents, and chat history</li>
            <li><strong>Vector Database:</strong> ChromaDB for document embeddings enabling semantic search</li>
            <li><strong>Media Storage:</strong> Cloudinary for user avatars</li>
            <li><strong>Session Management:</strong> JWT tokens stored in browser localStorage</li>
          </ul>

          <h3>4.2 Security Measures</h3>
          <ul>
            <li>HTTPS/TLS encryption for all data in transit</li>
            <li>Password hashing using bcrypt with secure salt rounds</li>
            <li>JWT-based authentication with token expiration</li>
            <li>Rate limiting to prevent brute-force attacks</li>
            <li>Input validation and file type verification</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>5. Third-Party Services</h2>
          <p>We integrate with the following third-party services to provide functionality:</p>
          <ul>
            <li><strong>Google Gemini API:</strong> Processes document content to generate AI responses, embeddings, quizzes, and summaries</li>
            <li><strong>Google OAuth:</strong> Provides optional single sign-on authentication</li>
            <li><strong>Cloudinary:</strong> Hosts user profile images</li>
            <li><strong>MongoDB Atlas:</strong> Cloud database infrastructure</li>
          </ul>
          <p>
            We configure third-party AI services to minimize data retention and disable training 
            on user content where such controls are available.
          </p>
        </section>

        <section className="privacy-section">
          <h2>6. Data Retention and Deletion</h2>
          <ul>
            <li><strong>Active Accounts:</strong> Data is retained while your account remains active</li>
            <li><strong>Document Deletion:</strong> When you delete a document, the file, extracted text, embeddings, and associated chat history are permanently removed</li>
            <li><strong>Account Deletion:</strong> You may request complete account deletion via Contact support. We will remove all associated data within 30 days</li>
            <li><strong>System Logs:</strong> Technical logs are retained for up to 90 days for debugging and security purposes, then automatically purged</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>7. Your Rights and Choices</h2>
          <p>You have the following rights regarding your personal data:</p>
          <ul>
            <li><strong>Access:</strong> View your documents, chat history, and account information at any time</li>
            <li><strong>Correction:</strong> Update your profile information through Account settings</li>
            <li><strong>Deletion:</strong> Delete individual documents, chat histories, or request full account deletion</li>
            <li><strong>Export:</strong> Download your uploaded documents from the History panel</li>
            <li><strong>Withdraw Consent:</strong> Stop using the service at any time; delete your account to remove stored data</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>8. Children's Privacy</h2>
          <p>
            SmartDocQ is not intended for users under 13 years of age. We do not knowingly 
            collect personal information from children under 13. If we discover that a child 
            under 13 has provided personal information, we will promptly delete such data.
          </p>
        </section>

        <section className="privacy-section">
          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically to reflect changes in our practices, 
            technologies, legal requirements, or other factors. We will notify you of material 
            changes by posting a prominent notice on our service. Your continued use after such 
            changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="privacy-section">
          <h2>10. Contact Us</h2>
          <p>
            For questions, concerns, or requests regarding this Privacy Policy or your personal 
            data, please contact us through the Contact form accessible from your dashboard or 
            visit the Help Center.
          </p>
        </section>
      </div>
    </div>
  );
}
