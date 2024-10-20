// /app/page.tsx (or any component)
"use client";

import { useWebSocketWithDeepgram } from "@/hooks/useWebSocketWithDeepgram"; // Adjust the path
import { useEffect } from "react";

const WebSocketWithDeepgram: React.FC = () => {
	const [transcription, setTranscription] = useState<string>("");
	const [audioSrc, setAudioSrc] = useState<string | null>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const deepgramConnectionRef = useRef<WebSocket | null>(null);

	const deepgramApiKey = "YOUR_DEEPGRAM_API_KEY"; // Replace with your actual Deepgram API key
	const backendWebSocketUrl = "ws://localhost:3000"; // Replace with your WebSocket server URL
	const deepgram = new Deepgram(deepgramApiKey); // Initialize Deepgram

	useEffect(() => {
		// Establish WebSocket connection with the Python backend
		const ws = new WebSocket(backendWebSocketUrl);
		wsRef.current = ws;

		ws.onopen = () => {
			console.log("Connected to WebSocket server.");
		};

		ws.onmessage = async (event) => {
			const message: WebSocketMessage = JSON.parse(event.data);
			const { text, model } = message;

			// Send the text to Deepgram for text-to-speech (TTS)
			if (text) {
				console.log("Received message from WebSocket:", text);
				handleDeepgramTTS(text, model);
			}
		};

		ws.onclose = () => {
			console.log("WebSocket connection closed.");
		};

		ws.onerror = (error) => {
			console.error("WebSocket error:", error);
		};

		return () => {
			// Cleanup WebSocket connection on component unmount
			if (wsRef.current) {
				wsRef.current.close();
			}
		};
	}, []);

	// Function to handle Deepgram TTS and playback
	const handleDeepgramTTS = async (
		text: string,
		model: string = "aura-asteria-en",
	) => {
		try {
			const dgConnection = await deepgram.speak.websocket.v("1");

			dgConnection.on(LiveTranscriptionEvents.Open, () => {
				console.log("Deepgram WebSocket connected.");
				dgConnection.send_text(text); // Send the received text to Deepgram for TTS
			});

			dgConnection.on(LiveTranscriptionEvents.AudioData, (audioData) => {
				// Convert the binary audio data to a Blob and create an audio URL
				const audioBlob = new Blob([audioData], { type: "audio/wav" });
				const audioUrl = URL.createObjectURL(audioBlob);
				setAudioSrc(audioUrl); // Set the audio source to be played

				// Optionally play the audio automatically
				const audioElement = new Audio(audioUrl);
				audioElement
					.play()
					.catch((err) => console.error("Error playing audio:", err));
			});

			dgConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
				console.log("Deepgram Transcript:", data);
				// Set the transcription text
				setTranscription(data.channel.alternatives[0].transcript);
			});

			dgConnection.on(LiveTranscriptionEvents.Close, () => {
				console.log("Deepgram WebSocket closed.");
			});

			dgConnection.on(LiveTranscriptionEvents.Error, (error) => {
				console.error("Deepgram WebSocket error:", error);
			});
		} catch (error) {
			console.error("Error connecting to Deepgram:", error);
		}
	};

	return (
		<div>
			<h1>WebSocket and Deepgram Integration</h1>
			{transcription && <p>Transcription: {transcription}</p>}
			{audioSrc && <audio controls src={audioSrc} />}
		</div>
	);
};

export default WebSocketWithDeepgram;
