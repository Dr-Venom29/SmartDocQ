import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ToastProvider } from './Components/ToastContext';
import Navbar from './Components/Layout/Navbar';
import Hero from './Components/Layout/Hero_Section/HeroSection';
import Body from './Components/Layout/Body_Section/BodySection';
import Footer from './Components/Layout/Footer/Footer';
import Upload from './Components/Pages/Upload_Page/UploadPage';
import Login from './Components/Auth/Login';
import ResetPasswordPage from './Components/Auth/ResetPasswordPage';
import RequireAuth from './Components/Auth/RequireAuth';
import AdminRoute from './Components/Admin/AdminRoute';
import HelpCenter from './Components/HelpCenter';
import PrivacyPolicy from './Components/Pages/Legal/PrivacyPolicy';
import TermsOfService from './Components/Pages/Legal/TermsOfService';
import ShareChat from './Components/ShareChat';
import LandingPage from './Components/LandingPage';
import errorAnimation from './Animations/404-Page-Error.json';
import "./App.css";

const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

function PageLayout({ children }) {
  return (
    <div className="page-layout">
      <Navbar />
      <main className="page-layout-content">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function Main() {
  useEffect(() => {
    if (!sessionStorage.getItem('smartdocqAlert')) {
      sessionStorage.setItem('smartdocqAlert', 'shown');
      setTimeout(() => {
        window.alert(
          '⚠️ TEMPORARY SERVICE LIMITATION\n\n' +
          'Only the backend AI services of SmartDocQ are currently paused due to cloud infrastructure cost constraints.\n\n' +
          'Frontend Status: Fully Operational\n\n' +
          'You can still explore the platform\'s interface, features, and design.\n\n' +
          'For full system architecture, AI pipeline details, and complete implementation:\n' +
          'Please visit the GitHub repository linked in the footer.'
        );
      }, 600);
    }
  }, []);

  return (
    <Routes>
      <Route path="/"            element={<PageLayout><Hero /><Body /></PageLayout>} />
      <Route path="/reset-password" element={<PageLayout><ResetPasswordPage /></PageLayout>} />
      <Route path="/help"        element={<PageLayout><HelpCenter /></PageLayout>} />
      <Route path="/privacy"     element={<PageLayout><PrivacyPolicy /></PageLayout>} />
      <Route path="/terms"       element={<PageLayout><TermsOfService /></PageLayout>} />
      <Route path="/share/:shareId" element={<PageLayout><ShareChat /></PageLayout>} />
      <Route path="/upload"      element={<RequireAuth><PageLayout><Upload /></PageLayout></RequireAuth>} />
      <Route path="/admin"       element={<AdminRoute />} />
      <Route
        path="*"
        element={(
          <PageLayout>
            <div
              style={{
                minHeight: "60vh",
                padding: "40px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <Lottie
                animationData={errorAnimation}
                loop
                autoplay
                style={{ width: 220, maxWidth: '80%', marginBottom: 24 }}
              />
              <h1 style={{ fontSize: "2rem", marginBottom: "12px" }}>Page not found</h1>
              <p style={{ opacity: 0.7 }}>
                The page you&apos;re looking for doesn&apos;t exist or has moved.
              </p>
            </div>
          </PageLayout>
        )}
      />
    </Routes>
  );
}

function AppContent() {
  const [hasShownLanding, setHasShownLanding] = useState(() => {
    try {
      return !!sessionStorage.getItem('smartdocqLandingShown');
    } catch (e) {
      return false;
    }
  });
  const [revealStarted, setRevealStarted] = useState(hasShownLanding);
  const [showLogin, setShowLogin] = useState(false);
  const location = useLocation();

  const isResetRoute = location.pathname === '/reset-password';
  const shouldShowLanding = !isResetRoute && !hasShownLanding;
  const isHomePage = location.pathname === '/';

  // Apply background only after opening animation completes on home page
  useEffect(() => {
    if (isHomePage && revealStarted) {
      document.body.style.backgroundImage = 'url(/bg.png)';
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundRepeat = 'no-repeat';
    } else {
      document.body.style.backgroundImage = '';
    }
  }, [isHomePage, revealStarted]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setShowLogin(prev => prev || true);
    };

    window.addEventListener("unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("unauthorized", handleUnauthorized);
    };
  }, []);

  // Prevent background page from scrolling while auth popup is open
  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const html = document.documentElement;
    const { body } = document;

    if (!showLogin) {
      html.style.overflow = "";
      body.style.overflow = "";
      return undefined;
    }

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
    };
  }, [showLogin]);

  return (
    <>
      {shouldShowLanding && (
        <LandingPage onRevealStart={() => {
          try {
            sessionStorage.setItem('smartdocqLandingShown', 'true');
          } catch (e) {
            console.error('SessionStorage error:', e);
          }
          setHasShownLanding(true);
          setRevealStarted(true);
        }} />
      )}
      {showLogin && (
        <div className="overlay" onClick={() => setShowLogin(false)} role="presentation">
          <div
            className="popup login-popup"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="auth-popup-close"
              onClick={() => setShowLogin(false)}
              aria-label="Close authentication dialog"
              type="button"
            >
              ✕
            </button>
            <Login onClose={() => setShowLogin(false)} />
          </div>
        </div>
      )}
      <div style={{
        opacity: shouldShowLanding ? (revealStarted ? 1 : 0) : 1,
        position: 'relative',
        zIndex: 1,
        pointerEvents: shouldShowLanding ? (revealStarted ? 'auto' : 'none') : 'auto',
      }}>
        <Main />
      </div>
    </>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;