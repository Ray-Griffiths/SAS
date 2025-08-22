import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// Removed the import for reportWebVitals
// import reportWebVitals from './reportWebVitals';
import { BrowserRouter as Router } from 'react-router-dom';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);

// Removed the call to reportWebVitals
// reportWebVitals();
