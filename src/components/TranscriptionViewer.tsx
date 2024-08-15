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
    <div className="absolute right-0 top-0 w-1/3 h-full bg-white bg-opacity-80 overflow-y-auto p-4">
      <h2 className="text-xl font-bold mb-4">文字起こしデータ</h2>
      {transcriptions.map((item, index) => (
        <div key={index} className="mb-2">
          <span className="font-semibold">{new Date(item.timestamp).toLocaleTimeString()}: </span>
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  )
}