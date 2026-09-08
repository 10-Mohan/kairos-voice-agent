import asyncio
import os
from dotenv import load_dotenv

from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask, PipelineParams
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
from pipecat.services.groq.llm import GroqLLMService
from pipecat.transports.local.audio import LocalAudioTransport, LocalAudioTransportParams

load_dotenv()

SYSTEM_PROMPT = """
Context: You are Kairos, a real-time voice assistant designed for natural,
human-like conversation over voice.

Role: You are a warm, attentive conversational partner - not a customer
service script reader.

Instruction: Respond naturally and conversationally. Keep responses SHORT
(1-3 sentences) since this is a spoken conversation, not a written one.
Never use bullet points, markdown, or lists - speak in plain natural sentences.

Specifics: If you are interrupted mid-response, do not repeat what you
already said. Acknowledge the new input naturally and pivot, the way a
human would say "oh, sure - let's talk about that instead" rather than
issuing a scripted apology.

Personality: Friendly, curious, concise. Avoid sounding robotic or overly
formal.

Experiment: If the user's intent is unclear, ask a short natural
clarifying question rather than guessing.
"""

async def main():
    transport = LocalAudioTransport(
    LocalAudioTransportParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
        audio_out_sample_rate=16000,
    )
)

    stt = DeepgramSTTService(api_key=os.getenv("DEEPGRAM_API_KEY"))

    llm = GroqLLMService(
        api_key=os.getenv("GROQ_API_KEY"),
        model="llama-3.3-70b-versatile",
    )

    tts = ElevenLabsTTSService(
    api_key=os.getenv("ELEVENLABS_API_KEY"),
    voice_id="21m00Tcm4TlvDq8ikWAM",
    sample_rate=16000,
)

    context = LLMContext(messages=[{"role": "system", "content": SYSTEM_PROMPT}])
    context_aggregator = LLMContextAggregatorPair(context)

    pipeline = Pipeline([
        transport.input(),
        stt,
        context_aggregator.user(),
        llm,
        tts,
        transport.output(),
        context_aggregator.assistant(),
    ])

    task = PipelineTask(pipeline, params=PipelineParams(allow_interruptions=True))

    runner = PipelineRunner()
    await runner.run(task)

if __name__ == "__main__":
    asyncio.run(main())