import { useCallback, useEffect, useRef, useState } from 'react'

export type CoachSuggestion = {
  suggestion: string
  source_category: string
  timing_ms: {
    classify: number
    moss_search: number
    phrase: number
    total: number
  }
  receivedAt: number
}

const SOCKET_URL = 'ws://127.0.0.1:8000/ws/coach'

export function useCoachSocket() {
  const socketRef = useRef<WebSocket | null>(null)
  const retryTimerRef = useRef<number | null>(null)
  const retryCountRef = useRef(0)
  const disposedRef = useRef(false)
  const [suggestions, setSuggestions] = useState<CoachSuggestion[]>([])
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting')

  const connect = useCallback(() => {
    if (disposedRef.current) return

    const existingSocket = socketRef.current
    if (existingSocket && (
      existingSocket.readyState === WebSocket.OPEN
      || existingSocket.readyState === WebSocket.CONNECTING
      || existingSocket.readyState === WebSocket.CLOSING
    )) {
      console.log('[coach-socket] connect skipped; active socket exists', {
        readyState: existingSocket.readyState,
      })
      return
    }

    setConnectionStatus('connecting')
    const socket = new WebSocket(SOCKET_URL)
    socketRef.current = socket
    console.log('[coach-socket] created connection', { readyState: socket.readyState })

    socket.onopen = () => {
      console.log('[coach-socket] open', { readyState: socket.readyState })
      retryCountRef.current = 0
      setConnectionStatus('connected')
    }
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as Omit<CoachSuggestion, 'receivedAt'>
      setSuggestions((current) => [
        { ...payload, receivedAt: Date.now() },
        ...current,
      ])
    }
    socket.onerror = () => {
      console.log('[coach-socket] error', { readyState: socket.readyState })
      socket.close()
    }
    socket.onclose = () => {
      console.log('[coach-socket] close', { readyState: socket.readyState })
      if (disposedRef.current || socketRef.current !== socket) return
      socketRef.current = null
      setConnectionStatus('disconnected')
      const delay = Math.min(1000 * 2 ** retryCountRef.current, 8000)
      retryCountRef.current += 1
      retryTimerRef.current = window.setTimeout(connect, delay)
    }
  }, [])

  useEffect(() => {
    disposedRef.current = false
    connect()
    return () => {
      disposedRef.current = true
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current)
      socketRef.current?.close()
    }
  }, [connect])

  const sendChunk = useCallback((text: string) => {
    const socket = socketRef.current
    if (text.trim() && socket?.readyState === WebSocket.OPEN) {
      socket.send(text.trim())
    }
  }, [])

  return { sendChunk, suggestions, connectionStatus }
}