# server.py
import asyncio
import websockets


async def send_text(websocket, path):
    try:
        while True:
            message = f"Hello from Python WebSocket server! Time: {asyncio.get_event_loop().time()}"
            await websocket.send(message)
            print(f"Sent: {message}")
            await asyncio.sleep(3)  # Send message every 3 seconds
    except websockets.exceptions.ConnectionClosedError as e:
        print(f"Connection closed with error: {e}")
    except websockets.exceptions.ConnectionClosedOK:
        print("Connection closed cleanly.")
    finally:
        print("Client disconnected.")


async def main():
    async with websockets.serve(send_text, "localhost", 8765):
        print("WebSocket server started on ws://localhost:8765")
        await asyncio.Future()  # Keep the server running


if __name__ == "__main__":
    asyncio.run(main())
