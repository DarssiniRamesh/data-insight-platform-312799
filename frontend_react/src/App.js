import React, { useState, useEffect } from 'react';
import './App.css';

// PUBLIC_INTERFACE
/**
 * Main App component for Data Insight Platform
 * Includes a health check to the backend API
 */
function App() {
  const [backendStatus, setBackendStatus] = useState('checking...');

  useEffect(() => {
    // Try to fetch backend health status (non-blocking)
    fetch('http://localhost:3001/health')
      .then(response => response.json())
      .then(data => {
        if (data.status === 'ok') {
          setBackendStatus('connected');
        } else {
          setBackendStatus('error');
        }
      })
      .catch(() => {
        // Gracefully handle if backend is not available
        setBackendStatus('unavailable');
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Data Insight Platform</h1>
        <p>Upload, process, and visualize your datasets</p>
        <div className="status-indicator">
          <span className={`status-dot ${backendStatus}`}></span>
          <span className="status-text">
            Backend API: <strong>{backendStatus}</strong>
          </span>
        </div>
      </header>
      <main className="App-main">
        <div className="feature-cards">
          <div className="feature-card">
            <h3>🔐 User Authentication</h3>
            <p>Secure login and user management</p>
          </div>
          <div className="feature-card">
            <h3>📤 File Upload</h3>
            <p>Upload and manage your datasets</p>
          </div>
          <div className="feature-card">
            <h3>📊 Data Processing</h3>
            <p>Process and transform your data</p>
          </div>
          <div className="feature-card">
            <h3>📈 Visualization</h3>
            <p>Interactive charts and insights</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
