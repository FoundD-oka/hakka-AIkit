import { Message } from '../messages/messages'

interface Transcription {
  timestamp: string
  text: string
}

const YASUKO_API_KEY = process.env.NEXT_PUBLIC_YASUKO_DIFY_API_KEY
const YASUKO_API_URL = process.env.NEXT_PUBLIC_YASUKO_DIFY_API_URL

let yasukoConversationId = ''

let correctedText: string[] = []

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

export function startPeriodicCorrection() {
  console.log('定期的な校正を開始します')
  return setInterval(async () => {
    console.log('リアルタイム文字起こしの校正をチェックします')
    const storedTranscriptions: Transcription[] = JSON.parse(localStorage.getItem('transcriptions') || '[]')
    if (storedTranscriptions.length > 0) {
      const textToCorrect = storedTranscriptions.map(t => `${formatTimestamp(t.timestamp)}: ${t.text}`).join('\n')
      console.log('校正のために送信するテキスト:', textToCorrect)
      
      let retryCount = 0
      const maxRetries = 3

      const attemptCorrection = async () => {
        try {
          const correctedText = await getYasukoArrangeResponse([{ role: 'user', content: textToCorrect }])
          onCorrectedTextReceived(correctedText)
          localStorage.setItem('transcriptions', '[]')
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('correctedTextUpdated'))
          }
        } catch (error) {
          console.error('校正中にエラーが発生しました:', error)
          retryCount++
          if (retryCount < maxRetries) {
            console.log(`リトライ ${retryCount}/${maxRetries}`)
            await attemptCorrection()
          } else {
            console.log('校正に失敗しました。リアルタイムテキストをそのまま使用します。')
            onCorrectedTextReceived(textToCorrect)
            localStorage.setItem('transcriptions', '[]')
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('correctedTextUpdated'))
            }
          }
        }
      }

      await attemptCorrection()
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