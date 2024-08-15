import React, { useEffect, useState, useRef } from 'react'
import menuStore from '@/features/stores/menu'
import { getCorrectedText } from '@/features/chat/Yasuko-arrange'
import styles from '@/styles/TranscriptionViewer.module.css'

interface Transcription {
  timestamp: string
  text: string
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export const TranscriptionViewer: React.FC = () => {
  const [realtimeTranscriptions, setRealtimeTranscriptions] = useState<Transcription[]>([])
  const [correctedTranscriptions, setCorrectedTranscriptions] = useState<string[]>([])
  const showTranscriptionViewer = menuStore((s) => s.showTranscriptionViewer)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    const loadTranscriptions = () => {
      const storedTranscriptions = JSON.parse(localStorage.getItem('transcriptions') || '[]')
      setRealtimeTranscriptions(storedTranscriptions)
      setCorrectedTranscriptions(getCorrectedText())
    }

    loadTranscriptions()

    const intervalId = setInterval(loadTranscriptions, 5000) // 5秒ごとに更新

    const handleCorrectedTextUpdated = () => {
      loadTranscriptions()
    }
    window.addEventListener('correctedTextUpdated', handleCorrectedTextUpdated)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('correctedTextUpdated', handleCorrectedTextUpdated)
    }
  }, [])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [realtimeTranscriptions, correctedTranscriptions, autoScroll])

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const atBottom = scrollHeight - scrollTop === clientHeight
      setAutoScroll(atBottom)
    }
  }

  if (!showTranscriptionViewer) {
    return null
  }

  return (
    <div className={styles.viewer}>
      <div className={styles.content}>
        <div
          ref={scrollRef}
          className={styles.scrollArea}
          onScroll={handleScroll}
        >
          <div className={styles.textContainer}>
            <h2 className={styles.heading}>Concise Text</h2>
            {correctedTranscriptions.map((text, index) => (
              <div key={`corrected-${index}`}>
                <span className={styles.breakWords}>{text}</span>
              </div>
            ))}
            <hr className={styles.divider} />
            {realtimeTranscriptions.map((item, index) => (
              <div key={`realtime-${index}`}>
                <span className={styles.timestamp}>{formatTimestamp(item.timestamp)}: </span>
                <span className={styles.breakWords}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}