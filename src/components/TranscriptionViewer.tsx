import React, { useEffect, useState } from 'react'
import menuStore from '@/features/stores/menu'
import { getCorrectedText } from '@/features/chat/Yasuko-arrange'

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

  useEffect(() => {
    const loadTranscriptions = () => {
      const storedTranscriptions = JSON.parse(localStorage.getItem('transcriptions') || '[]')
      setRealtimeTranscriptions(storedTranscriptions)
      setCorrectedTranscriptions(getCorrectedText())
    }

    loadTranscriptions()

    const intervalId = setInterval(loadTranscriptions, 5000) // 5秒ごとに更新

    // カスタムイベントのリスナーを追加
    const handleCorrectedTextUpdated = () => {
      loadTranscriptions()
    }
    window.addEventListener('correctedTextUpdated', handleCorrectedTextUpdated)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('correctedTextUpdated', handleCorrectedTextUpdated)
    }
  }, [])

  if (!showTranscriptionViewer) {
    return null
  }

  return (
    <div className="fixed right-0 top-0 min-w-[300px] max-w-[33.333vw] h-full bg-white bg-opacity-80 shadow-lg z-10">
      <div className="h-full overflow-y-auto" style={{ margin: '20px 20px 0' }}>
        <div className="space-y-8">
          <h2 className="text-xl font-bold">校正済みテキスト</h2>
          {correctedTranscriptions.map((text, index) => (
            <div key={`corrected-${index}`}>
              <span className="break-words whitespace-pre-wrap">{text}</span>
            </div>
          ))}
          <hr className="my-4 border-gray-300" />
          <h2 className="text-xl font-bold">リアルタイム文字起こし</h2>
          {realtimeTranscriptions.map((item, index) => (
            <div key={`realtime-${index}`}>
              <span className="font-semibold">{formatTimestamp(item.timestamp)}: </span>
              <span className="break-words">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}