'use client';

import { useWebSocket } from '@/hooks/useWebSockets';
import { useEffect } from 'react';

export default function WebSocketComponent() {
  const { isConnected, lastMessage, sendMessage } = useWebSocket('ws://localhost:8765', {
    onOpen: () => console.log('WebSocket connected'),
    onMessage: (message) => console.log('Message received:', message.data),
    onClose: () => console.log('WebSocket disconnected'),
    onError: (error) => console.error('WebSocket error:', error),
    reconnectInterval: 3000, // Reconnect
  });

  useEffect(() => {
    if (isConnected) {
      // You can send a message once the connection is open
      sendMessage('Hello from the Next.js client!');
    }
  }, [isConnected, sendMessage]);

  if (!isConnected) {
    return <p>Connecting to WebSocket...</p>;
  }

  return (
    <div>
      <h1>WebSocket Client</h1>
      {isConnected ? <p>Connected to WebSocket</p> : <p>Connecting...</p>}
      {lastMessage && <p>Last Message: {lastMessage}</p>}
      <button onClick={() => sendMessage('Ping!')}>Send Ping</button>
    </div>
  );
}
