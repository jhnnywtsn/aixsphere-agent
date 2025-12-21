import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://192.168.0.86:8000'); // Use port 8000 for backend

const Chat = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on('message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });
  }, []);

  const sendMessage = () => {
    socket.send(message);
    setMessage('');
  };

  return (
    <div>
      <h2>Communication</h2>
      {messages.map((msg, index) => (
        <div key={index}>{msg}</div>
      ))}
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message"
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};