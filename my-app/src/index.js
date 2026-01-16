import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Temporary service limitation notice
if (typeof window !== 'undefined') {
  window.alert(
    '⚠️ Temporary Service Limitation\n\n' +
      "Due to cloud infrastructure costs, SmartDocQ’s live AI services are currently paused.\n\n" +
      'The complete project architecture, AI pipeline, and full implementation are available on GitHub.\n' +
      'Please refer to the repository link in the footer for detailed code and documentation.'
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
