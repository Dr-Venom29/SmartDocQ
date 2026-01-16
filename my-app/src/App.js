import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './Components/Navbar';
import Hero from './Components/HeroSection';
import Body from './Components/BodySection';
import Top from './Components/Top';
import Footer from './Components/Footer';
import Upload from './Components/UploadPage';
import RequireAuth from './Components/RequireAuth';
import Login from './Components/Login';
import AdminRoute from './Components/Admin/AdminRoute';
import { ToastProvider } from './Components/ToastContext';
import "./App.css";
import HelpCenter from './Components/HelpCenter';
import PrivacyPolicy from './Components/PrivacyPolicy';
import TermsOfService from './Components/TermsOfService';
import ShareChat from './Components/ShareChat';

function App() {
  return (                                      
    <BrowserRouter> 
      <ToastProvider>
        <Main />
      </ToastProvider>
    </BrowserRouter>
  );
}

function Main() {

  // Show alert AFTER UI loads (once per session)
  useEffect(() => {
    if (!sessionStorage.getItem('smartdocqAlert')) {
      setTimeout(() => {
        window.alert(
          '⚠️ TEMPORARY SERVICE LIMITATION\n\n' +
            'Only the backend AI services of SmartDocQ are currently paused due to cloud infrastructure cost constraints.\n\n' +
            'Frontend Status: Fully Operational\n\n' +
            'You can still explore the platform’s interface, features, and design.\n\n' +
            'For full system architecture, AI pipeline details, and complete implementation:\n' +
            'Please visit the GitHub repository linked in the footer.'
        );

        sessionStorage.setItem('smartdocqAlert', 'shown');
      }, 600); // slight delay so UI is visible first
    }
  }, []);

  return (
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
  );
}

export default App;
