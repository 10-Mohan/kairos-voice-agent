# Kairos

## One-line pitch
A live sales-call coach that whispers the right response when it matters, powered by Moss's sub-40ms retrieval.

## Problem
Objections and pricing pushback happen in real time. By the time a rep remembers the right response, the moment has passed.

## Solution
Kairos captures live browser speech, classifies finalized transcript chunks with Groq, retrieves relevant sales knowledge through Moss, and phrases one short coaching line that returns over WebSocket as an on-screen whisper.

## Architecture
- Web Speech API captures speech in Chrome or Edge.
- Groq (`openai/gpt-oss-20b`) classifies coaching relevance.
- Moss searches a pre-indexed knowledge base of objections, pricing, competitor battlecards, and deal notes.
- Local `all-MiniLM-L6-v2` embeddings keep semantic search fast.
- Groq phrases the retrieved knowledge into an actionable line.
- FastAPI streams the suggestion and full latency breakdown over WebSocket.

## Technical hook
Measured Moss retrieval is approximately 15-40 ms, making search a rounding error in the user-facing latency budget. The time is spent where it helps: generating a useful line, not waiting on a slow vector-database round trip.

## Tech stack
FastAPI; React; TypeScript; Vite; Moss; sentence-transformers; Groq; Web Speech API.

## Demo line
“Honestly, your pricing feels really high compared with the other vendors we’re evaluating.”

## Links
- Live app: https://frontend-eight-neon-81.vercel.app
- Backend health: https://kairos-backend-production-7e4e.up.railway.app/health
- Source: https://github.com/10-Mohan/kairos-voice-agent

## Submission note
The hosted UI and WebSocket are deployed. At recording time, the Railway backend is running in degraded mode because the configured Moss project returned `429 credit_exhausted`; restoring Moss credits re-enables live retrieval and whispers without code changes.
