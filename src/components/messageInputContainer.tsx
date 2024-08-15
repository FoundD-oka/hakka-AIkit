import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import homeStore from '@/features/stores/home'
import settingsStore from '@/features/stores/settings'
import { MessageInput } from './messageInput'
import { startSpeechRecognition, stopSpeechRecognition } from '@/utils/azureSpeech'

type Props = {
  onChatProcessStart: (text: string) => void
}

export const MessageInputContainer = ({ onChatProcessStart }: Props) => {
  const chatProcessing = homeStore((s: { chatProcessing: boolean }) => s.chatProcessing)
  const [userMessage, setUserMessage] = useState('')
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition>()
  const [isMicRecording, setIsMicRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  // 音声認識の結果を処理する
  const handleRecognitionResult = useCallback(
    (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript
      setUserMessage(text)

      // 発言の終了時
      if (event.results[0].isFinal) {
        setUserMessage(text)
        // 返答文の生成を開始
        onChatProcessStart(text)
      }
    },
    [onChatProcessStart]
  )

  // 無音が続いた場合も終了する
  const handleRecognitionEnd = useCallback(() => {
    setIsMicRecording(false)
  }, [])

  const handleClickMicButton = useCallback(() => {
    if (isMicRecording) {
      speechRecognition?.abort()
      setIsMicRecording(false)
      return
    }

    speechRecognition?.start()
    setIsMicRecording(true)
  }, [isMicRecording, speechRecognition])

  const handleClickSendButton = useCallback(() => {
    onChatProcessStart(userMessage)
  }, [onChatProcessStart, userMessage])

  const handleClickTranscribeButton = useCallback(() => {
    if (isTranscribing) {
      stopSpeechRecognition()
      setIsTranscribing(false)
    } else {
      startSpeechRecognition((text: string) => {
        const timestamp = new Date().toISOString()
        const transcription = { timestamp, text }
        const storedTranscriptions = JSON.parse(localStorage.getItem('transcriptions') || '[]')
        storedTranscriptions.push(transcription)
        localStorage.setItem('transcriptions', JSON.stringify(storedTranscriptions))
      })
      setIsTranscribing(true)
    }
  }, [isTranscribing])

  useEffect(() => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
    // FirefoxなどSpeechRecognition非対応環境対策
    if (!SpeechRecognition) {
      return
    }
    const ss = settingsStore.getState()
    const recognition = new SpeechRecognition()
    recognition.lang = ss.selectVoiceLanguage
    recognition.interimResults = true // 認識の途中結果を返す
    recognition.continuous = false // 発言の終了時に認識を終了する

    recognition.addEventListener('result', handleRecognitionResult)
    recognition.addEventListener('end', handleRecognitionEnd)

    setSpeechRecognition(recognition)
  }, [handleRecognitionResult, handleRecognitionEnd])

  useEffect(() => {
    if (!chatProcessing) {
      setUserMessage('')
    }
  }, [chatProcessing])

  console.log('MessageInputContainer render, isMicRecording:', isMicRecording);

  return (
    <MessageInput
      userMessage={userMessage}
      isMicRecording={isMicRecording}
      isTranscribing={isTranscribing}
      onChangeUserMessage={(e) => setUserMessage(e.target.value)}
      onClickMicButton={handleClickMicButton}
      onClickSendButton={handleClickSendButton}
      onClickTranscribeButton={handleClickTranscribeButton}
    />
  )
}