import React from 'react';
import Dashboard from './Dashboard';
import Chat from './Chat';
import ReverseEngineer from './ReverseEngineer';

const pageStyles = {
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  background: '#060712',
  color: '#e5e7eb',
  minHeight: '100vh',
  margin: 0,
};

const wrapperStyles = {
  maxWidth: '1100px',
  margin: '0 auto',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const App = () => {
  return (
    <div style={pageStyles}>
      <div style={wrapperStyles}>
        <header>
          <h1 style={{ marginBottom: '4px' }}>AIXSphere Agent Workbench</h1>
          <p style={{ color: '#9ca3af', marginTop: 0 }}>
            Reverse engineer model outputs, manage media, and keep an eye on live agent chat.
          </p>
        </header>

        <ReverseEngineer />

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', flexWrap: 'wrap' }}>
          <Dashboard />
          <Chat />
        </div>
      </div>
    </div>
  );
};

export default App;
