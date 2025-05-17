import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import CodeBuilder from './CodeBuilder'; // <-- Import your CodeBuilder
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<CodeBuilder />} />
        <Route path="/editor" element={<App />} />
      </Routes>
    </Router>
  </React.StrictMode>
);

// Optional performance monitoring
reportWebVitals();
