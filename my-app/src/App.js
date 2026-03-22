import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from './Components/Layout/Navbar';
import Hero from './Components/HeroSection';
import Body from './Components/BodySection';
import Top from './Components/Top';
import Footer from './Components/Footer';
import Upload from './Components/UploadPage';
import RequireAuth from './Components/RequireAuth';
import Login from './Components/Login';
import AdminRoute from './Components/Admin/AdminRoute';
import { ToastProvider } from './Components/ToastContext';
import HelpCenter from './Components/HelpCenter';
import PrivacyPolicy from './Components/PrivacyPolicy';
import TermsOfService from './Components/TermsOfService';
import ShareChat from './Components/ShareChat';



import LandingPage from './Components/LandingPage';
import "./App.css";

function App() {
  const [revealStarted, setRevealStarted] = useState(false);

  return (
    <BrowserRouter>
      <ToastProvider>
        <LandingPage onRevealStart={() => setRevealStarted(true)} />
        {/* Main content is present but transparent until intro reveals it */}
        <div style={{ 
          opacity: revealStarted ? 1 : 0, 
          transition: 'opacity 0.2s ease', 
          position: 'relative', 
          zIndex: 1,
          pointerEvents: revealStarted ? 'auto' : 'none',
        }}>
          <Main />
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}

function Main() {
  useEffect(() => {
    if (!sessionStorage.getItem('smartdocqAlert')) {
      setTimeout(() => {
        window.alert(
          '⚠️ TEMPORARY SERVICE LIMITATION\n\n' +
            'Only the backend AI services of SmartDocQ are currently paused due to cloud infrastructure cost constraints.\n\n' +
            'Frontend Status: Fully Operational\n\n' +
            'You can still explore the platform\'s interface, features, and design.\n\n' +
            'For full system architecture, AI pipeline details, and complete implementation:\n' +
            'Please visit the GitHub repository linked in the footer.'
        );
        sessionStorage.setItem('smartdocqAlert', 'shown');
      }, 600);
    }
  }, []);

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <Hero />
              <Body />
              <Top />
              <Footer />
            </>
          }
        />

        <Route
          path="/upload"
          element={
            <RequireAuth>
              <>
                <Navbar />
                <Upload />
                <Footer />
              </>
            </RequireAuth>
          }
        />

        <Route
          path="/login"
          element={
            <>
              <Navbar />
              <Login />
              <Footer />
            </>
          }
        />

        <Route
          path="/help"
          element={
            <>
              <Navbar />
              <HelpCenter />
              <Footer />
            </>
          }
        />

        <Route
          path="/privacy"
          element={
            <>
              <Navbar />
              <PrivacyPolicy />
              <Footer />
            </>
          }
        />

        <Route
          path="/terms"
          element={
            <>
              <Navbar />
              <TermsOfService />
              <Footer />
            </>
          }
        />

        <Route
          path="/admin"
          element={<AdminRoute />}
        />

        <Route
          path="/share/:shareId"
          element={
            <>
              <Navbar />
              <ShareChat />
              <Footer />
            </>
          }
        />
      </Routes>
    </>
  );
}

export default App;