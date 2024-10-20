import os
from gtts import gTTS
import multiprocessing
import time
import platform
from websockets.sync.server import serve
from flask import Flask, send_from_directory
from flask_cors import CORS  # Import CORS

import openai
from deepgram import DeepgramClient, SpeakWSOptions, SpeakWebSocketEvents
from dotenv import load_dotenv

load_dotenv()

model = "aura-asteria-en"

# Flask App
app = Flask(__name__, static_folder="./public", static_url_path="/public")
CORS(
    app, resources={r"/*": {"origins": "http://localhost:3000"}}
)  # Enable CORS for localhost:3000


def receive_websocket(websocket, queue):
    """
    WebSocket server that receives data from clients.
    """
    try:
        while True:
            message = websocket.recv()  # Receive message from client
            if message:
                print(f"Received message: {message}")
                # Store the message in the queue
                queue.put(message)
    except Exception as e:
        print(f"Error in receiving WebSocket server: {e}")


def send_websocket(websocket, queue):
    """
    WebSocket server that sends data to clients.
    """
    global last_time
    last_time = time.time() - 5
    connected = False
    deepgram = DeepgramClient()
    dg_connection = deepgram.speak.websocket.v("1")

    def on_open(self, open, **kwargs):
        print(f"\n\n{open}\n\n")

    def on_flush(self, flushed, **kwargs):
        print(f"\n\n{flushed}\n\n")
        flushed_str = str(flushed)
        websocket.send(flushed_str)

    def on_binary_data(self, data, **kwargs):
        global last_time
        print("Received binary data")

        if time.time() - last_time > 3:
            print("------------ [Binary Data] Attach header.\n")
            # WAV audio container header to ensure the audio is playable
            header = bytes(
                [
                    0x52,
                    0x49,
                    0x46,
                    0x46,  # "RIFF"
                    0x00,
                    0x00,
                    0x00,
                    0x00,  # Placeholder for file size
                    0x57,
                    0x41,
                    0x56,
                    0x45,  # "WAVE"
                    0x66,
                    0x6D,
                    0x74,
                    0x20,  # "fmt "
                    0x10,
                    0x00,
                    0x00,
                    0x00,  # Chunk size (16)
                    0x01,
                    0x00,  # Audio format (1 for PCM)
                    0x01,
                    0x00,  # Number of channels (1)
                    0x80,
                    0xBB,
                    0x00,
                    0x00,  # Sample rate (48000)
                    0x00,
                    0xEE,
                    0x02,
                    0x00,  # Byte rate (48000 * 2)
                    0x02,
                    0x00,  # Block align (2)
                    0x10,
                    0x00,  # Bits per sample (16)
                    0x64,
                    0x61,
                    0x74,
                    0x61,  # "data"
                    0x00,
                    0x00,
                    0x00,
                    0x00,  # Placeholder for data size
                ]
            )
            websocket.send(header)
            last_time = time.time()

        websocket.send(data)

    def on_close(self, close, **kwargs):
        print(f"\n\n{close}\n\n")

    dg_connection.on(SpeakWebSocketEvents.Open, on_open)
    dg_connection.on(SpeakWebSocketEvents.AudioData, on_binary_data)
    dg_connection.on(SpeakWebSocketEvents.Flushed, on_flush)
    dg_connection.on(SpeakWebSocketEvents.Close, on_close)

    try:
        # Are we connected to the Deepgram TTS WS?
        if not connected:
            print("Connecting to Deepgram TTS WebSocket")
            options = SpeakWSOptions(
                model=model,
                encoding="linear16",
                sample_rate=48000,
            )

            if not dg_connection.start(options):
                print("Unable to start Deepgram TTS WebSocket connection")
            connected = True

        spoken_words = 
        while True:
            if not queue.empty():
                last_message = queue.get()  # Get the last message from the queue
                print(f"Sending message: {last_message}")
                dg_connection.send_text(last_message)
                dg_connection.flush()  # Make sure the data is flushed
                time.sleep(1)  # Add a slight delay between messages
            else:
                time.sleep(1)  # Wait for a message to be received
    except Exception as e:
        print(f"Error in sending WebSocket server: {e}")
        dg_connection.finish()


def run_ws_receive(queue):
    """
    Runs the WebSocket server that receives messages from clients on localhost:4000.
    """
    with serve(lambda ws: receive_websocket(ws, queue), "localhost", 4000) as server:
        server.serve_forever()


def run_ws_send(queue):
    """
    Runs the WebSocket server that sends messages to clients on localhost:4100.
    """
    with serve(lambda ws: send_websocket(ws, queue), "localhost", 4100) as server:
        server.serve_forever()


@app.route("/<path:filename>")
def serve_others(filename):
    return send_from_directory(app.static_folder, filename)


@app.route("/audio/connected")
def serve_connected_audio():
    text = "Device successfully connected."
    tts = gTTS(text=text, lang="en")
    audio_file_path = "connected.mp3"
    tts.save(audio_file_path)

    return send_from_directory(os.getcwd(), audio_file_path)


@app.route("/assets/<path:filename>")
def serve_image(filename):
    return send_from_directory(app.static_folder, "assets/" + filename)


@app.route("/", methods=["GET"])
def serve_index():
    return app.send_static_file("index.html")


def run_ui():
    app.run(debug=True, use_reloader=False)


if __name__ == "__main__":
    if platform.system() == "Darwin":
        multiprocessing.set_start_method("fork")

    # Create a queue for sharing messages between the WebSocket servers
    message_queue = multiprocessing.Queue()

    # Start the Flask server that serves the UI
    p_flask = multiprocessing.Process(target=run_ui)

    # Start the WebSocket server that receives messages
    p_ws_receive = multiprocessing.Process(target=run_ws_receive, args=(message_queue,))

    # Start the WebSocket server that sends messages
    p_ws_send = multiprocessing.Process(target=run_ws_send, args=(message_queue,))

    p_flask.start()
    p_ws_receive.start()
    p_ws_send.start()

    p_flask.join()
    p_ws_receive.join()
    p_ws_send.join()
