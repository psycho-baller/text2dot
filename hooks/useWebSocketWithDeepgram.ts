import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient, DeepgramClient, LiveTranscriptionEvents, LiveTTSEvents } from '@deepgram/sdk';
import { text } from 'stream/consumers';

interface WebSocketOptions {
  onOpen?: (event: Event) => void;
  onMessage?: (message: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number; // Option to reconnect after X milliseconds
}

export const useWebSocketWithDeepgram = (url: string, deepgramApiKey: string, options?: WebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const [deepgramResponse, setDeepgramResponse] = useState<any | null>(null);


  const deepgram = createClient(deepgramApiKey);
  const connect = useCallback(() => {
    if (socketRef.current) return; // Avoid multiple WebSocket initializations


    // Create a new WebSocket connection to the backend server
    const socket = new WebSocket(url);
    socketRef.current = socket;

    // WebSocket event listeners
    socket.onopen = (event) => {
      setIsConnected(true);
      if (options?.onOpen) options.onOpen(event);
      console.log('Backend WebSocket connected');
    };

    socket.onmessage = async (message) => {
      if (message.data) {
        const textData = message.data; // This should be raw audio data
        setLastMessage(textData);

        // Forward the received audio data to Deepgram
        handleDeepgram(textData);
      }
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      socketRef.current = null; // Ensure socket is reset
      if (options?.onClose) options.onClose(event);
      console.log('Backend WebSocket disconnected');

      // Reconnect if the WebSocket was closed unexpectedly
      if (options?.reconnectInterval && !event.wasClean) {
        reconnectTimeout.current = setTimeout(() => {
          console.log('Reconnecting WebSocket...');
          connect(); // Reconnect
        }, options.reconnectInterval);
      }
    };

    socket.onerror = (error) => {
      console.error('Backend WebSocket error:', error);
      if (options?.onError) options.onError(error);
    };
  }, [url, options]);

  // Function to handle Deepgram WebSocket connection and forward audio data
  const handleDeepgram = useCallback(async (text: string) => {
    if (!deepgram) {
      console.error('Deepgram client is not initialized');
    }
    const dgConnection = deepgram?.speak.live({ model: 'nova-asteria-en' });

    console.log("Connecting to Deepgram...", text);

    dgConnection?.on(LiveTTSEvents.Open, () => {
      console.log("Connection opened");

      // Send text data for TTS synthesis
      dgConnection.sendText(text);

      // Send Flush message to the server after sending the text
      dgConnection.flush();

      dgConnection.on(LiveTTSEvents.Close, () => {
        console.log("Connection closed");
      });

      dgConnection.on(LiveTTSEvents.Metadata, (data) => {
        console.dir(data, { depth: null });
      });

      dgConnection.on(LiveTTSEvents.Audio, (data) => {
        console.log("Deepgram audio data received");
        // Concatenate the audio chunks into a single buffer
        const buffer = Buffer.from(data);
        // audioBuffer = Buffer.concat([audioBuffer, buffer]);
      });

      dgConnection.on(LiveTTSEvents.Flushed, () => {
        console.log("Deepgram Flushed");
        // Write the buffered audio data to a file when the flush event is received
        // writeFile();
      });

      dgConnection.on(LiveTTSEvents.Error, (err) => {
        console.error(err);
      });
    });
  }, [deepgram]);

  useEffect(() => {
    connect(); // Connect to the backend WebSocket when the component mounts

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

  return { isConnected, lastMessage, deepgramResponse, sendMessage };
};
