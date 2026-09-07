import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechRecognitionResultEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export function useSpeechRecognition() {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const shouldListenRef = useRef(false)
  const permissionDeniedRef = useRef(false)
  const restartTimerRef = useRef<number | null>(null)
  const restartTimesRef = useRef<number[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [requiresReconnect, setRequiresReconnect] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [lastFinalChunk, setLastFinalChunk] = useState('')
  const [error, setError] = useState<string | null>(null)

  const setListening = (nextValue: boolean, reason: string) => {
    console.log('[speech] isListening transition', {
      from: isListening,
      to: nextValue,
      reason,
      shouldListen: shouldListenRef.current,
    })
    setIsListening(nextValue)
  }

  const supported = typeof window !== 'undefined' && Boolean(
    window.SpeechRecognition || window.webkitSpeechRecognition,
  )

  useEffect(() => {
    if (!supported) return

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) return

    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onstart = () => {
      console.log('[speech] onstart', { shouldListen: shouldListenRef.current })
      setIsReconnecting(false)
      setListening(true, 'recognition.onstart')
    }
    recognition.onresult = (event) => {
      let interim = ''
      let finalChunk = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result.isFinal) {
          finalChunk += result[0].transcript.trim()
        } else {
          interim += result[0].transcript
        }
      }

      if (finalChunk) {
        setTranscript((current) => `${current} ${finalChunk}`.trim())
        setLastFinalChunk(finalChunk)
      }
      setInterimTranscript(interim)
    }
    recognition.onerror = (event) => {
      console.log('[speech] onerror', {
        error: event.error,
        shouldListen: shouldListenRef.current,
      })
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        permissionDeniedRef.current = true
        setError('Microphone access was blocked. Allow microphone access and try again.')
        shouldListenRef.current = false
        setListening(false, `onerror:${event.error}`)
      } else if (event.error === 'audio-capture' || event.error === 'language-not-supported') {
        shouldListenRef.current = false
        setError(`Speech recognition error: ${event.error}`)
        setListening(false, `onerror:${event.error}`)
      } else if (event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`)
        scheduleRestart(`onerror:${event.error}`)
      }
    }
    recognition.onend = () => {
      console.log('[speech] onend', { shouldListen: shouldListenRef.current })
      if (shouldListenRef.current && !permissionDeniedRef.current) {
        scheduleRestart('recognition.onend')
      } else {
        setListening(false, 'recognition.onend no longer listening')
      }
    }
    recognitionRef.current = recognition

    return () => {
      shouldListenRef.current = false
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current)
        restartTimerRef.current = null
      }
      recognition.stop()
      recognitionRef.current = null
    }
  }, [supported])

  const scheduleRestart = (reason: string) => {
    if (!shouldListenRef.current || permissionDeniedRef.current || restartTimerRef.current !== null) return

    setIsReconnecting(true)
    console.log('[speech] scheduling restart', {
      reason,
      delayMs: 300,
      shouldListen: shouldListenRef.current,
    })
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null
      const now = Date.now()
      restartTimesRef.current = restartTimesRef.current.filter((time) => now - time < 5000)
      restartTimesRef.current.push(now)

      if (restartTimesRef.current.length >= 3) {
        shouldListenRef.current = false
        setIsReconnecting(false)
        setRequiresReconnect(true)
        setError('Speech recognition could not reconnect automatically. Reconnect manually to try again.')
        setListening(false, 'restart limit reached')
        console.log('[speech] restart limit reached', {
          restartCount: restartTimesRef.current.length,
          windowMs: 5000,
          shouldListen: shouldListenRef.current,
        })
        return
      }

      console.log('[speech] attempting delayed restart', {
        restartCount: restartTimesRef.current.length,
        shouldListen: shouldListenRef.current,
      })
      try {
        recognitionRef.current?.start()
      } catch (restartError) {
        if (!(restartError instanceof DOMException) || restartError.name !== 'InvalidStateError') {
          setError('Could not resume the microphone. Check your browser permissions.')
          setListening(false, 'delayed restart failure')
          scheduleRestart('delayed restart exception')
        }
      }
    }, 300)
  }

  const start = useCallback(() => {
    if (!supported || !recognitionRef.current) {
      setError('Live transcription requires Chrome or Edge.')
      return
    }

    setError(null)
    setRequiresReconnect(false)
    restartTimesRef.current = []
    permissionDeniedRef.current = false
    setLastFinalChunk('')
    shouldListenRef.current = true
    try {
      recognitionRef.current.start()
      setListening(true, 'start() succeeded')
    } catch (startError) {
      if (startError instanceof DOMException && startError.name === 'InvalidStateError') {
        setListening(true, 'start() InvalidStateError: already active')
      } else {
        shouldListenRef.current = false
        setError('Could not start the microphone. Check your browser permissions.')
        setListening(false, 'start() failure')
      }
    }
  }, [supported])

  const stop = useCallback(() => {
    shouldListenRef.current = false
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
    setIsReconnecting(false)
    recognitionRef.current?.stop()
    setListening(false, 'stop() called')
    setInterimTranscript('')
  }, [])

  const reconnect = useCallback(() => {
    start()
  }, [start])

  return {
    isListening,
    transcript,
    interimTranscript,
    lastFinalChunk,
    supported,
    error,
    isReconnecting,
    requiresReconnect,
    start,
    stop,
    reconnect,
  }
}