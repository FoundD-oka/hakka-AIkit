import React, { useEffect, useState } from 'react'
import menuStore from '@/features/stores/menu'

interface Transcription {
  timestamp: string
  text: string
}

export const TranscriptionViewer: React.FC = () => {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const showTranscriptionViewer = menuStore((s) => s.showTranscriptionViewer)

  useEffect(() => {
    const loadTranscriptions = () => {
      const storedTranscriptions = JSON.parse(localStorage.getItem('transcriptions') || '[]')
      setTranscriptions(storedTranscriptions)
    }

    loadTranscriptions()

    const intervalId = setInterval(loadTranscriptions, 5000) // 5秒ごとに更新

    return () => clearInterval(intervalId)
  }, [])

  if (!showTranscriptionViewer) {
    return null
  }

  return (
    <div className="fixed right-0 top-0 min-w-[300px] max-w-[33.333vw] h-full bg-white bg-opacity-80 shadow-lg z-10">
      <div className="h-full overflow-y-auto" style={{ margin: '20px 20px 0' }}>
        <div className="space-y-8">
          <h2 className="text-xl font-bold">文字起こしデータ</h2>
          {transcriptions.map((item, index) => (
            <div key={index}>
              <span className="font-semibold">{new Date(item.timestamp).toLocaleTimeString()}: </span>
              <span className="break-words">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}