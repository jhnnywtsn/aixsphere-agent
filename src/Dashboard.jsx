import React from 'react';

const containerStyle = {
  background: '#0b1021',
  border: '1px solid #1f2937',
  borderRadius: '14px',
  padding: '16px',
  color: '#e5e7eb',
};

const videoStyle = {
  width: '100%',
  borderRadius: '12px',
  marginTop: '8px',
};

const Dashboard = () => {
  return (
    <section style={containerStyle}>
      <h2 style={{ marginTop: 0 }}>Agent Dashboard</h2>
      <p style={{ color: '#9ca3af' }}>
        Quick control panel for reviewing media captures or demo footage from your agents.
      </p>
      <video style={videoStyle} controls>
        <source src="your-media-url.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <h3 style={{ marginBottom: '6px' }}>Manage Agents</h3>
      <ul style={{ paddingLeft: '18px', color: '#d1d5db' }}>
        <li>Toggle active scenarios or media feeds.</li>
        <li>Attach example prompts for QA runs.</li>
        <li>Monitor latency and output quality notes.</li>
      </ul>
    </section>
  );
};

export default Dashboard;
