import type { CoachSuggestion } from './useCoachSocket'

type WhisperPanelProps = {
  suggestions: CoachSuggestion[]
}

const categoryLabels: Record<string, string> = {
  pricing: 'Pricing',
  objection: 'Objection',
  competitor: 'Competitor',
  deal_notes: 'Deal note',
}

function formatSeconds(milliseconds: number) {
  return milliseconds >= 1000 ? `${(milliseconds / 1000).toFixed(1)}s` : `${Math.round(milliseconds)}ms`
}

function categoryClass(category: string) {
  return `category-${category.replace('_', '-')}`
}

function Timing({ timing }: { timing: CoachSuggestion['timing_ms'] }) {
  return (
    <div className="timing" aria-label="Response timing">
      <span>Moss: {Math.round(timing.moss_search)}ms</span>
      <span>Groq: {formatSeconds(timing.phrase)}</span>
      <strong>Total: {formatSeconds(timing.total)}</strong>
    </div>
  )
}

export function WhisperPanel({ suggestions }: WhisperPanelProps) {
  const latest = suggestions[0]

  return (
    <section className="panel whisper-panel" aria-labelledby="whisper-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Kairos intelligence</p>
          <h2 id="whisper-title">Whisper coach</h2>
        </div>
        <span className="signal-mark" aria-hidden="true">✦</span>
      </div>

      {latest ? (
        <div className="suggestion-stage" key={latest.receivedAt}>
          <div className="suggestion-meta">
            <span className={`category-badge ${categoryClass(latest.source_category)}`}>
              {categoryLabels[latest.source_category] ?? latest.source_category}
            </span>
            <span className="new-label">New whisper</span>
          </div>
          <p className="hero-suggestion">{latest.suggestion}</p>
          <Timing timing={latest.timing_ms} />
        </div>
      ) : (
        <div className="suggestion-stage waiting-stage">
          <span className="waiting-pulse" aria-hidden="true">✦</span>
          <p className="waiting-title">Your next move will land here.</p>
          <p className="waiting-copy">Start the call and Kairos will listen for the moments that need a sharper response.</p>
        </div>
      )}

      <div className="history-heading">
        <span>Session history</span>
        <span>{suggestions.length} {suggestions.length === 1 ? 'whisper' : 'whispers'}</span>
      </div>
      <div className="suggestion-history">
        {suggestions.length > 0 ? suggestions.slice(1).map((item) => (
          <article className="history-item" key={item.receivedAt}>
            <div className="history-item-topline">
              <span className={`category-dot ${categoryClass(item.source_category)}`} />
              <span>{categoryLabels[item.source_category] ?? item.source_category}</span>
              <time>{new Date(item.receivedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
            </div>
            <p>{item.suggestion}</p>
          </article>
        )) : <p className="history-empty">No previous whispers yet.</p>}
      </div>
    </section>
  )
}