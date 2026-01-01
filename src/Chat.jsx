import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://192.168.0.86:8000', {
  autoConnect: false,
});

const Chat = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    socket.connect();
    setStatus('connecting');

    socket.on('connect', () => setStatus('connected'));
    socket.on('connect_error', () => setStatus('error'));
    socket.on('message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    return () => {
      socket.off('message');
      socket.off('connect');
      socket.off('connect_error');
      socket.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.send(message);
    setMessages((prevMessages) => [...prevMessages, `You: ${message}`]);
    setMessage('');
  };

  return (
    <section style={styles.panel}>
      <div style={styles.headerRow}>
        <h2 style={{ margin: 0 }}>Agent Chat</h2>
        <span style={{ ...styles.status, background: statusColors[status] || '#374151' }}>
          {status}
        </span>
      </div>

      <div style={styles.messages}>
        {messages.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>No messages yet. Start a thread to capture live output.</p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} style={styles.message}>
              {msg}
            </div>
          ))
        )}
      </div>

      <div style={styles.inputRow}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message"
          style={styles.input}
        />
        <button onClick={sendMessage} style={styles.button}>
          Send
        </button>
      </div>
    </section>
  );
};

const styles = {
  panel: {
    background: '#0b1021',
    border: '1px solid #1f2937',
    borderRadius: '14px',
    padding: '16px',
    color: '#e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    textTransform: 'capitalize',
    color: '#0b1021',
  },
  messages: {
    background: '#111827',
    borderRadius: '12px',
    border: '1px solid #1f2937',
    padding: '12px',
    minHeight: '140px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  message: {
    background: '#1f2937',
    padding: '8px 10px',
    borderRadius: '8px',
    color: '#f3f4f6',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid #374151',
    background: '#111827',
    color: '#f3f4f6',
  },
  button: {
    background: '#2563eb',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
  },
};

const statusColors = {
  disconnected: '#6b7280',
  connecting: '#f59e0b',
  connected: '#10b981',
  error: '#ef4444',
};

export default Chat;
