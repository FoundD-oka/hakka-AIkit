import { Message } from '../messages/messages'

interface Transcription {
  timestamp: string
  text: string
}

const YASUKO_API_KEY = process.env.NEXT_PUBLIC_YASUKO_DIFY_API_KEY
const YASUKO_API_URL = process.env.NEXT_PUBLIC_YASUKO_DIFY_API_URL

let yasukoConversationId = ''

let correctedText: string[] = []
let tempTranscriptions: Transcription[] = []

// ローカルストレージから校正済みテキストを取得
function loadCorrectedText() {
  if (typeof window !== 'undefined') {
    const storedCorrectedText = localStorage.getItem('correctedText')
    if (storedCorrectedText) {
      correctedText = JSON.parse(storedCorrectedText)
    }
  }
}

// 校正済みテキストをローカルストレージに保存
function saveCorrectedText() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('correctedText', JSON.stringify(correctedText))
  }
}

// 初期化時に校正済みテキストを読み込む
loadCorrectedText()

export async function getYasukoArrangeResponse(messages: Message[]): Promise<string> {
  if (!YASUKO_API_KEY) {
    throw new Error('Invalid API Key')
  }

  const response = await fetch(YASUKO_API_URL!, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${YASUKO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {},
      query: messages[messages.length - 1].content,
      response_mode: 'blocking',
      conversation_id: yasukoConversationId,
      user: 'aituber-kit',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to get response from Yasuko API')
  }

  const data = await response.json()
  yasukoConversationId = data.conversation_id
  return data.answer
}

export function onCorrectedTextReceived(text: string) {
  correctedText.push(text)
  saveCorrectedText()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('correctedTextUpdated'))
  }
}

export function getCorrectedText(): string[] {
  return correctedText
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function saveTempTranscriptions(transcriptions: Transcription[]) {
  tempTranscriptions = transcriptions
}

function clearTempTranscriptions() {
  tempTranscriptions = []
}

export function startPeriodicCorrection() {
  return setInterval(async () => {
    const storedTranscriptions: Transcription[] = JSON.parse(localStorage.getItem('transcriptions') || '[]')
    if (storedTranscriptions.length > 0) {
      // tempTranscriptionsに保存し、transcriptionsを空にする
      saveTempTranscriptions(storedTranscriptions)
      localStorage.setItem('transcriptions', '[]')

      const textToCorrect = tempTranscriptions.map(t => `${formatTimestamp(t.timestamp)}: ${t.text}`).join('\n')
      
      try {
        // 校正が成功した場合
        const correctedText = await getYasukoArrangeResponse([{ role: 'user', content: textToCorrect }])
        onCorrectedTextReceived(correctedText)
      } catch (error) {
        // エラーの場合、tempTranscriptionsをそのまま correctedText に保存
        const uncorrectedText = tempTranscriptions.map(t => `${formatTimestamp(t.timestamp)}: ${t.text}`).join('\n')
        onCorrectedTextReceived(uncorrectedText)
      }
      
      // 処理完了後、tempTranscriptionsをクリア
      clearTempTranscriptions()
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('correctedTextUpdated'))
      }
    }
  }, 3 * 60 * 1000)
}

export function clearTranscriptions() {
  correctedText = []
  saveCorrectedText()
  localStorage.setItem('transcriptions', '[]')
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('correctedTextUpdated'))
  }
}