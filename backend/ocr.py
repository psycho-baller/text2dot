import asyncio
import base64
import cv2
import time
import json
import websockets
import requests
from io import BytesIO
from PIL import Image
import os
from dotenv import load_dotenv

load_dotenv()


def encode_image(img):
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    encoded_string = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return encoded_string


async def send_text_to_websocket(websocket, content):
    # Send the message to the WebSocket server
    await websocket.send(content)
    print(f"Sent to WebSocket: {content}")


def analyze_image(image_path):
    img = Image.open(image_path)
    base64_img = encode_image(img)

    api = "https://api.hyperbolic.xyz/v1/chat/completions"
    api_key = os.getenv("HYPERBOLIC_API_KEY")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    payload = {
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "ONLY RESPOND WITH THE TEXT IN THE IMAGE, NOTHING ELSE.",
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"},
                    },
                ],
            }
        ],
        "model": "meta-llama/Llama-3.2-90B-Vision-Instruct",
        "max_tokens": 2048,
        "temperature": 0,
        "top_p": 0.3,
    }

    response = requests.post(api, headers=headers, json=payload)
    return response.json()


async def main():
    # Define the WebSocket server URI
    server_uri = "ws://localhost:4000"

    # Establish a connection with the WebSocket server
    async with websockets.connect(server_uri) as websocket:
        print(f"Connected to WebSocket server at {server_uri}")

        # Get the camera feed from my computer
        cap = cv2.VideoCapture(0)

        n = 2  # Set the interval in seconds
        print("Starting image analysis")
        last_analysis_time = time.time()

        while True:
            ret, frame = cap.read()
            cv2.imshow("frame", frame)

            current_time = time.time()

            # Check if n seconds have passed since the last analysis
            if current_time - last_analysis_time >= n:
                print("Analyzing image")
                await send_text_to_websocket(websocket, "content")  # Send a message

                # Uncomment the following lines to analyze the image
                # Export the image to a file
                cv2.imwrite("image.jpg", frame)

                # Analyze the image using the hyperbolic API
                result = analyze_image("./image.jpg")
                # Extract the content from the result
                content = result["choices"][0]["message"]["content"]
                print("Image analysis result:", content)

                if content != "There is no text in the image.":
                    print("Sending text to WebSocket")
                    await send_text_to_websocket(websocket, content)

                # Update the last analysis time
                last_analysis_time = current_time

            # Break the loop if 'q' is pressed
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

        cap.release()
        cv2.destroyAllWindows()


# Run the main function
asyncio.run(main())
