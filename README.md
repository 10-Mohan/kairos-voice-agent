# Kairos

> A live sales-call coach that whispers the right response when it matters, powered by Moss's sub-40ms retrieval.

## The problem

Objections and pricing pushback happen in real time on a call. By the time a rep remembers the right response, the moment has passed. Kairos puts relevant knowledge in view while the conversation is still happening.

## How it works

1. The browser captures live speech through the Web Speech API.
2. Each finalized transcript chunk goes to Groq (`openai/gpt-oss-20b`) for coaching-relevance classification.
3. Relevant chunks trigger Moss semantic retrieval, typically 15–40 ms, against a pre-indexed sales knowledge base covering objections, pricing, competitor battlecards, and deal notes. Embeddings are generated locally with `all-MiniLM-L6-v2`.
4. Groq turns the retrieved knowledge into one short, actionable coaching line.
5. The suggestion returns over WebSocket as a visible “whisper,” with classification, Moss, phrasing, and total latency shown on-screen.

## Why Moss matters here

Moss reduces retrieval to a rounding error: our measured search path is approximately 15–40 ms, including the local embedding step. That leaves the user-facing latency budget for language generation instead of search. In a typical RAG setup, a vector-database round trip adds meaningful latency on top of the LLM calls; here, Moss keeps the retrieval leg fast enough to expose the actual pipeline tradeoff.

## Tech stack

- FastAPI
- React + TypeScript + Vite
- Moss for retrieval
- `sentence-transformers` for free, local embeddings
- Groq for free-tier LLM classification and phrasing
- Web Speech API for free, browser-native speech recognition

## Local setup

Run these commands from PowerShell. The quoted `Set-Location` handles the `&` in this workspace path, and direct binaries avoid the Windows command-shim issue.

```powershell
Set-Location -LiteralPath 'D:\Real-Time Voice & Conversational AI'
& py -3 -m venv .venv
& '.\.venv\Scripts\python.exe' -m pip install -r '.\backend\requirements.txt'
Copy-Item '.\backend\.env.example' '.\backend\.env'
```

Fill in `backend/.env` with `MOSS_PROJECT_ID`, `MOSS_PROJECT_KEY`, and `GROQ_API_KEY`. Then build the index:

```powershell
Set-Location -LiteralPath 'D:\Real-Time Voice & Conversational AI\backend'
& '..\.venv\Scripts\python.exe' -m scripts.build_index
```

Start the backend in one terminal:

```powershell
Set-Location -LiteralPath 'D:\Real-Time Voice & Conversational AI\backend'
& '..\.venv\Scripts\python.exe' -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Install and start the frontend in another terminal:

```powershell
Set-Location -LiteralPath 'D:\Real-Time Voice & Conversational AI\frontend'
& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' install
& node '.\node_modules\vite\bin\vite.js' --host 127.0.0.1
```

Open the Vite URL shown in the terminal, usually <http://127.0.0.1:5173/>. Use Chrome or Edge and allow microphone access.

## Demo script

Start the call, then say:

> “Honestly, your pricing feels really high compared with the other vendors we’re evaluating.”

That pricing objection should trigger a visible whisper with its source category and latency breakdown.