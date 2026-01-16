import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Show alert AFTER the page fully loads (once per session)
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if (!sessionStorage.getItem('smartdocqAlert')) {
      window.alert(
        '⚠️ TEMPORARY SERVICE LIMITATION\n\n' +
          'Only the backend AI services of SmartDocQ are currently paused due to cloud infrastructure cost constraints.\n\n' +
          'Frontend Status: Fully Operational\n\n' +
          'You can still explore the platform’s interface, features, and design.\n\n' +
          'For full system architecture, AI pipeline details, and complete implementation:\n' +
          'Please visit the GitHub repository linked in the footer.'
      );

      sessionStorage.setItem('smartdocqAlert', 'shown');
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
