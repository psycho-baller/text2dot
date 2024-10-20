// /app/page.tsx (or any component)
"use client";

import { useEffect, useRef, useState } from "react";
// import { text } from "stream/consumers";

export default function WebSocketAudioPlayer() {
	const [audioChunks, setAudioChunks] = useState<Blob[]>([]); // Buffer for incoming audio chunks
	const socketRef = useRef<WebSocket | null>(null); // WebSocket reference
	const audioContextRef = useRef<AudioContext | null>(null); // AudioContext reference

	useEffect(() => {
		// Initialize WebSocket connection
		const socket = new WebSocket(`ws://localhost:4000`); // Adjust the URL as per your backend setup
		socketRef.current = socket;

		socket.addEventListener("open", () => {
			console.log("WebSocket connected");
		});

		socket.addEventListener("message", async (event) => {
			console.log("Received message:", event.data);
			if (event.data instanceof Blob) {
				// Append received audio chunk to the buffer
				setAudioChunks((prevChunks) => [...prevChunks, event.data]);
			}

			if (typeof event.data === "string") {
				// Handle incoming string data (e.g., "Flushed" event)
				const message = JSON.parse(event.data);
				if (message.type === "Flushed") {
					console.log("Audio Flushed, playing audio now.");

					// When all audio chunks have been received, create a Blob and play it
					const blob = new Blob(audioChunks, { type: "audio/wav" });
					setAudioChunks([]); // Reset the buffer

					// Play the audio
					await playAudio(blob);
				}
			}
		});

		socket.addEventListener("close", () => {
			console.log("WebSocket closed");
		});

		socket.addEventListener("error", (error) => {
			console.error("WebSocket error:", error);
		});

		return () => {
			// Cleanup WebSocket when the component unmounts
			if (socketRef.current) {
				socketRef.current.close();
			}
		};
	}, [audioChunks]);

	const playAudio = async (audioBlob: Blob) => {
		console.log("Playing audio...", audioBlob);
		// Create or reuse an AudioContext
		let audioContext = audioContextRef.current;
		if (!audioContext) {
			audioContext = new AudioContext();
			audioContextRef.current = audioContext;
		}

		// Convert Blob to ArrayBuffer
		const arrayBuffer = await audioBlob.arrayBuffer();

		// Decode the audio data
		const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

		// Create a buffer source and play the audio
		const source = audioContext.createBufferSource();
		source.buffer = audioBuffer;
		source.connect(audioContext.destination);
		source.start();

		// Log when the audio ends
		source.onended = () => {
			console.log("Audio playback finished.");
		};
	};
}
