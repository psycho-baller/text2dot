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
	// const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
	const socketRef = useRef<WebSocket | null>(null);
	const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

	const initializeWebSocket = () => {
		const audioChunks: Blob[] = [];
		socketRef.current = new WebSocket(`ws://localhost:4100`);

		socketRef.current.addEventListener("open", () => {
			console.log("WebSocket connection established.");
		});

		socketRef.current.addEventListener("message", (event) => {
			if (typeof event.data === "string") {
				console.log("Incoming text data:", event.data);
				const msg = JSON.parse(event.data);

				if (msg.type === "Flushed") {
					console.log("Flushed received");
					const blob = new Blob(audioChunks, { type: "audio/wav" });
					console.log("Total audio chunks length:", audioChunks.length);
					console.log("Blob size:", blob.size);
					if (blob.size > 0) {
						playAudio(blob);
					} else {
						console.error("Blob is empty, no audio to play.");
					}
				}
			}

			if (event.data instanceof Blob) {
				console.log("Incoming blob data:", event.data);
				audioChunks.push(event.data);
				// setAudioChunks((prevChunks) => [...prevChunks, event.data]);
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
						// setAudioChunks([]);
						setButtonState(BUTTON_STATES.NO_AUDIO);
						if (textAreaRef.current) {
							textAreaRef.current.value = "";
						}
					};
				},
				(error) => {
					console.error("Error decoding audio data:", error);
				},
			);
		};
		reader.readAsArrayBuffer(blob);
	};

	return (
		<main className="flex flex-col items-center justify-center h-screen">
			<Button
				type="button"
				variant={"secondary"}
				id="connect-button"
				onClick={initializeWebSocket}
			>
				Connect
			</Button>
		</main>
	);
};

export default AudioPlayer;
