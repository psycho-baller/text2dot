"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState, type FC } from "react";

const BUTTON_STATES = {
	NO_AUDIO: "no_audio",
	LOADING: "loading",
	PLAYING: "playing",
};

const AudioPlayer: FC = () => {
	const [buttonState, setButtonState] = useState(BUTTON_STATES.NO_AUDIO);
	const socketRef = useRef<WebSocket | null>(null);
	const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
	const [hasPlayedConnectedAudio, setHasPlayedConnectedAudio] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null); // Ref to store the audio element

	const initializeWebSocket = () => {
		const audioChunks: Blob[] = [];
		socketRef.current = new WebSocket(`ws://localhost:4100`);

		socketRef.current.addEventListener("open", () => {
			console.log("WebSocket connection established.");
			if (!hasPlayedConnectedAudio) {
				playConnectedAudio(); // Play audio on connection
				setHasPlayedConnectedAudio(true); // Set the flag to true
			}
		});

		socketRef.current.addEventListener("message", (event) => {
			setButtonState(BUTTON_STATES.LOADING);
			if (typeof event.data === "string") {
				console.log("Incoming text data:", event.data);
				const msg = JSON.parse(event.data);

				if (msg.type === "Flushed") {
					console.log("Flushed received");
					const blob = new Blob(audioChunks, { type: "audio/wav" });
					console.log("Total audio chunks length:", audioChunks.length);
					console.log("Blob size:", blob.size);
					if (blob.size > 0) {
						setButtonState(BUTTON_STATES.PLAYING);
						playAudio(blob);
					} else {
						console.error("Blob is empty, no audio to play.");
					}
				}
			}

			if (event.data instanceof Blob) {
				console.log("Incoming blob data:", event.data);
				audioChunks.push(event.data);
			}
		});

		socketRef.current.addEventListener("close", () => {
			console.log("WebSocket closed");
			setButtonState(BUTTON_STATES.NO_AUDIO);
		});

		socketRef.current.addEventListener("error", (error) => {
			console.error("WebSocket error:", error);
			setButtonState(BUTTON_STATES.NO_AUDIO);
		});
	};

	const playConnectedAudio = async () => {
		const response = await fetch("http://127.0.0.1:5000/audio/connected");
		if (response.ok) {
			const audioBlob = await response.blob();
			const audioUrl = URL.createObjectURL(audioBlob);
			const audio = new Audio(audioUrl);
			audioRef.current = audio; // Store the audio reference
			audio.play().catch((error) => {
				console.error("Error playing connected audio:", error);
			});
		} else {
			console.error("Failed to fetch connected audio.");
		}
	};

	const playAudio = (blob: Blob) => {
		const audioContext = new AudioContext();
		const reader = new FileReader();

		reader.onload = function () {
			const arrayBuffer = this.result as ArrayBuffer;
			console.log("Array buffer size:", arrayBuffer.byteLength);
			audioContext.decodeAudioData(
				arrayBuffer,
				(buffer) => {
					const source = audioContext.createBufferSource();
					source.buffer = buffer;
					source.connect(audioContext.destination);
					source.start();

					setButtonState(BUTTON_STATES.PLAYING);

					source.onended = () => {
						setButtonState(BUTTON_STATES.NO_AUDIO);
						if (textAreaRef.current) {
							textAreaRef.current.value = "";
						}
						setHasPlayedConnectedAudio(false);
					};
				},
				(error) => {
					console.error("Error decoding audio data:", error);
				},
			);
		};
		reader.readAsArrayBuffer(blob);
	};

	const handleDisconnect = () => {
		if (socketRef.current) {
			socketRef.current.close();
		}
		if (audioRef.current) {
			audioRef.current.pause(); // Stop the audio
			audioRef.current.currentTime = 0; // Reset the audio to the start
		}
	};

	return (
		<main className="flex flex-col items-center justify-center h-screen">
			{buttonState === BUTTON_STATES.PLAYING ||
			buttonState === BUTTON_STATES.LOADING ? (
				<Button
					type="button"
					variant={"secondary"}
					id="disconnect-button"
					onClick={handleDisconnect} // Use the new handleDisconnect function
				>
					Disconnect
				</Button>
			) : (
				<Button
					type="button"
					variant={"secondary"}
					id="connect-button"
					onClick={initializeWebSocket}
				>
					Connect
				</Button>
			)}
			{buttonState === BUTTON_STATES.LOADING && (
				<p className="text-center">Loading...</p>
			)}
			{buttonState === BUTTON_STATES.PLAYING && (
				<p className="text-center">Playing...</p>
			)}
		</main>
	);
};

export default AudioPlayer;
