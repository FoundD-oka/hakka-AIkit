import * as sdk from 'microsoft-cognitiveservices-speech-sdk'

let recognizer: sdk.SpeechRecognizer | null = null

export const startSpeechRecognition = (onRecognized: (text: string) => void) => {
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY!,
    process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION!
  )
  speechConfig.speechRecognitionLanguage = 'ja-JP'

  const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput()
  recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)

  recognizer.recognizing = (s, e) => {
    console.log(`RECOGNIZING: Text=${e.result.text}`)
  }

  recognizer.recognized = (s, e) => {
    if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
      console.log(`RECOGNIZED: Text=${e.result.text}`)
      onRecognized(e.result.text)
    } else if (e.result.reason === sdk.ResultReason.NoMatch) {
      console.log('NOMATCH: Speech could not be recognized.')
    }
  }

  recognizer.canceled = (s, e) => {
    console.log(`CANCELED: Reason=${e.reason}`)
    if (e.reason === sdk.CancellationReason.Error) {
      console.log(`CANCELED: ErrorCode=${e.errorCode}`)
      console.log(`CANCELED: ErrorDetails=${e.errorDetails}`)
    }
    recognizer?.stopContinuousRecognitionAsync()
  }

  recognizer.sessionStopped = (s, e) => {
    console.log('\n    Session stopped event.')
    recognizer?.stopContinuousRecognitionAsync()
  }

  recognizer.startContinuousRecognitionAsync()
}

export const stopSpeechRecognition = () => {
  if (recognizer) {
    recognizer.stopContinuousRecognitionAsync()
    recognizer = null
  }
}