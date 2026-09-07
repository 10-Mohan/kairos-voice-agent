import { useEffect, useRef } from 'react'
import { TranscriptPanel } from './TranscriptPanel'
import { WhisperPanel } from './WhisperPanel'
import { useCoachSocket } from './useCoachSocket'
import { useSpeechRecognition } from './useSpeechRecognition'
import './App.css'

function App() {
  const speech = useSpeechRecognition()
  const coach = useCoachSocket()
  const lastSentChunkRef = useRef('')

  useEffect(() => {
    if (speech.lastFinalChunk && speech.lastFinalChunk !== lastSentChunkRef.current) {
      lastSentChunkRef.current = speech.lastFinalChunk
      coach.sendChunk(speech.lastFinalChunk)
    }
  }, [coach, speech.lastFinalChunk])

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-glyph">K</span>
          <div>
            <p className="brand-name">Kairos</p>
            <p className="brand-context">Live call intelligence</p>
          </div>
        </div>
        <div className="connection-state">
          <span className={`connection-dot ${coach.connectionStatus}`} />
          <span>{coach.connectionStatus === 'connected' ? 'Coach connected' : `Coach ${coach.connectionStatus}`}</span>
        </div>
      </header>

      <section className="call-header">
        <div>
          <p className="eyebrow">Live sales room / 01</p>
          <h1>Stay in the moment.</h1>
          <p className="intro">Kairos catches the signal, then gives you the next sentence.</p>
        </div>
        <div className="call-controls">
          <div className="recording-status">
            <span className={`recording-dot ${speech.isListening ? 'active' : ''}`} />
            {speech.isReconnecting ? 'Reconnecting...' : speech.isListening ? 'Capturing audio' : 'Ready when you are'}
          </div>
          <button
            className={`call-button ${speech.isListening ? 'stop' : ''}`}
            type="button"
            disabled={speech.isReconnecting}
            onClick={speech.requiresReconnect ? speech.reconnect : speech.isListening ? speech.stop : speech.start}
          >
            <span className="button-icon">{speech.isListening ? '■' : speech.requiresReconnect ? '↻' : '●'}</span>
            {speech.requiresReconnect ? 'Reconnect' : speech.isListening ? 'End capture' : 'Start call'}
          </button>
        </div>
      </section>

      {(!speech.supported || speech.error) && (
        <div className="browser-note" role="status">
          <span>ⓘ</span>
          <p>{speech.error ?? 'Live transcription works in Chrome or Edge. Open Kairos there to use your microphone.'}</p>
        </div>
      )}

      <section className="workspace-grid">
        <TranscriptPanel transcript={speech.transcript} interimTranscript={speech.interimTranscript} isListening={speech.isListening} />
        <WhisperPanel suggestions={coach.suggestions} />
      </section>

      <footer className="app-footer">
        <span>Secure local session</span>
        <span>Chrome / Edge recommended for microphone capture</span>
      </footer>
    </main>
  )
}

export default App
