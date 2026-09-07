import { useEffect, useRef } from 'react'

type TranscriptPanelProps = {
  transcript: string
  interimTranscript: string
  isListening: boolean
}

export function TranscriptPanel({
  transcript,
  interimTranscript,
  isListening,
}: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript, interimTranscript])

  return (
    <section className="panel transcript-panel" aria-labelledby="transcript-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Live feed</p>
          <h2 id="transcript-title">Call transcript</h2>
        </div>
        <span className={`live-indicator ${isListening ? 'active' : ''}`}>
          <span /> {isListening ? 'Listening' : 'Paused'}
        </span>
      </div>
      <div ref={scrollRef} className="transcript-scroll" aria-live="polite">
        {transcript ? (
          <p className="final-transcript">{transcript}</p>
        ) : (
          <p className="empty-state">Your conversation will appear here once you start the call.</p>
        )}
        {interimTranscript && <p className="interim-transcript">{interimTranscript}</p>}
      </div>
      <p className="panel-footnote">Final phrases are sent to Kairos for coaching.</p>
    </section>
  )
}