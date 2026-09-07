import asyncio
import json
import os

import websockets


TRANSCRIPT_CHUNKS = [
    "So yeah, how's the weather been over there?",
    "Honestly your pricing feels really high compared to what we're paying now",
    "Our security team is worried about putting sensitive customer data in a new platform.",
    "We should be able to get started next week.",
    "Let me think about it and get back to you.",
]
RESPONSE_TIMEOUT_SECONDS = 20


async def main() -> None:
    websocket_url = os.getenv("COACH_WS_URL", "ws://127.0.0.1:8000/ws/coach")
    async with websockets.connect(websocket_url) as websocket:
        for transcript_chunk in TRANSCRIPT_CHUNKS:
            print(f"Transcript: {transcript_chunk}")
            await websocket.send(transcript_chunk)
            try:
                response = await asyncio.wait_for(
                    websocket.recv(),
                    timeout=RESPONSE_TIMEOUT_SECONDS,
                )
            except asyncio.TimeoutError:
                print("  No coaching response (non-trigger or no result)")
            else:
                print(f"  Coach: {json.loads(response)}")
            await asyncio.sleep(0.5)


if __name__ == "__main__":
    asyncio.run(main())