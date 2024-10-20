import { useEffect, useState, useRef, useCallback } from 'react';

interface WebSocketOptions {
  onOpen?: (event: Event) => void;
  onMessage?: (message: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number; // Option to reconnect after X milliseconds
}

export const useWebSocket = (url: string, options?: WebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current) return; // Avoid multiple WebSocket initializations

    // Create a new WebSocket connection
    const socket = new WebSocket(url);
    socketRef.current = socket;

    // WebSocket event listeners
    socket.onopen = (event) => {
      setIsConnected(true);
      if (options?.onOpen) options.onOpen(event);
      console.log('WebSocket connected');
    };

    socket.onmessage = (message) => {
      setLastMessage(message.data);
      if (options?.onMessage) options.onMessage(message);
      console.log('Received message:', message.data);
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      socketRef.current = null; // Ensure socket is reset
      if (options?.onClose) options.onClose(event);
      console.log('WebSocket disconnected');

      // Reconnect if the WebSocket was closed unexpectedly
      if (options?.reconnectInterval && !event.wasClean) {
        reconnectTimeout.current = setTimeout(() => {
          console.log('Reconnecting WebSocket...');
          connect(); // Reconnect
        }, options.reconnectInterval);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (options?.onError) options.onError(error);
    };
  }, [url, options]);

  useEffect(() => {
    connect(); // Connect when the component mounts

    // Cleanup: Close the WebSocket and clear any reconnection attempts
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, []);

  const sendMessage = useCallback((message: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(message);
    } else {
      console.error('WebSocket is not open, unable to send message');
    }
  }, []);

  return { isConnected, lastMessage, sendMessage };
};
