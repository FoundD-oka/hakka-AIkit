import { getAIChatResponseStream } from '@/features/chat/aiChatFactory'
import { AIService, AIServiceConfig } from '@/features/constants/settings'
import { textsToScreenplay, Message } from '@/features/messages/messages'
import { speakCharacter } from '@/features/messages/speakCharacter'
import { judgeSlide } from '@/features/slide/slideAIHelpers'
import homeStore from '@/features/stores/home'
import settingsStore from '@/features/stores/settings'
import slideStore from '@/features/stores/slide'
import { goToSlide } from '@/components/slides'
import { choice } from './agentChoice';

/**
 * 文字列を処理する関数
 * @param receivedMessage 処理する文字列
 * @param sentences 返答を一文単位で格納する配列
 * @param aiTextLog AIの返答ログ
 * @param tag タグ
 * @param isCodeBlock コードブロックのフラグ
 * @param codeBlockText コードブロックのテキスト
 */
export const processReceivedMessage = async (
  receivedMessage: string,
  sentences: string[] = [],
  aiTextLog: Message[] = [],
  tag: string = '',
  isCodeBlock: boolean = false,
  codeBlockText: string = ''
) => {
  const ss = settingsStore.getState()
  const hs = homeStore.getState()
  const currentSlideMessages: string[] = []

  // 返答内容のタグ部分と返答部分を分離
  const tagMatch = receivedMessage.match(/^\[(.*?)\]/)
  if (tagMatch && tagMatch[0]) {
    tag = tagMatch[0]
    receivedMessage = receivedMessage.slice(tag.length)
  }

  // 返答を一文単位で切り出して処理する
  while (receivedMessage.length > 0) {
    const sentenceMatch = receivedMessage.match(
      /^(.+?[。．.!?！？\n]|.{20,}[、,])/
    )
    if (sentenceMatch?.[0]) {
      let sentence = sentenceMatch[0]
      // 区切った文字をsentencesに追加
      sentences.push(sentence)
      // 区切った文字の残りでreceivedMessageを更新
      receivedMessage = receivedMessage.slice(sentence.length).trimStart()

      // 発話不要/不可能な文字列だった場合はスキップ
      if (
        !sentence.includes('```') &&
        !sentence.replace(
          /^[\s\u3000\t\n\r\[\(\{「［（【『〈《〔｛«‹〘〚〛〙›»〕》〉』】）］」\}\)\]'"''""・、。,.!?！？:：;；\-_=+~～*＊@＠#＃$＄%％^＾&＆|｜\\＼/／`｀]+$/gu,
          ''
        )
      ) {
        continue
      }

      // タグと返答を結合（音声再生で使用される）
      let aiText = `${tag} ${sentence}`
      console.log('aiText', aiText)

      if (isCodeBlock && !sentence.includes('```')) {
        codeBlockText += sentence
        continue
      }

      if (sentence.includes('```')) {
        if (isCodeBlock) {
          // コードブロックの終了処理
          const [codeEnd, ...restOfSentence] = sentence.split('```')
          aiTextLog.push({
            role: 'code',
            content: codeBlockText + codeEnd,
          })
          aiText += `${tag} ${restOfSentence.join('```') || ''}`

          // AssistantMessage欄の更新
          homeStore.setState({ assistantMessage: sentences.join(' ') })

          codeBlockText = ''
          isCodeBlock = false
        } else {
          // コードブロックの開始処理
          isCodeBlock = true
          ;[aiText, codeBlockText] = aiText.split('```')
        }

        sentence = sentence.replace(/```/g, '')
      }

      const aiTalks = textsToScreenplay([aiText], ss.koeiroParam)
      aiTextLog.push({ role: 'assistant', content: sentence })

      // 文ごとに音声を生成 & 再生、返答を表示
      const currentAssistantMessage = sentences.join(' ')

      speakCharacter(
        aiTalks[0],
        () => {
          homeStore.setState({
            assistantMessage: currentAssistantMessage,
          })
          hs.incrementChatProcessingCount()
          // スライド用のメッセージを更新
          currentSlideMessages.push(sentence)
          homeStore.setState({
            slideMessages: currentSlideMessages,
          })
        },
        () => {
          hs.decrementChatProcessingCount()
          currentSlideMessages.shift()
          homeStore.setState({
            slideMessages: currentSlideMessages,
          })
        }
      )
    } else {
      // マッチする文がない場合、ループを抜ける
      break
    }
  }
}

// 新しい関数: LLMにメッセージを送信する
async function sendToLLM(
  aiService: AIService,
  messages: Message[],
  aiServiceConfig: AIServiceConfig
) {
  try {
    return await getAIChatResponseStream(aiService, messages, aiServiceConfig)
  } catch (e) {
    console.error(e)
    return null
  }
}

// URLの不要なスペースを削除し、URLの後の文章を分離する関数
function processUrlsInText(text: string): string {
  return text.replace(/(\bhttps?:\/\/\S+)(\s+[^http]|$)/g, (match, url, rest) => {
    const cleanUrl = url.replace(/\s+/g, '');
    return `<a href="${cleanUrl}" target="_blank">${cleanUrl}</a>${rest}`;
  });
}

// 新しい関数: ストリームレスポンスを処理する
export async function processStreamResponse(
  reader: ReadableStreamDefaultReader<any>,
  currentChatLog: Message[],
  ss: ReturnType<typeof settingsStore.getState>,
  hs: ReturnType<typeof homeStore.getState>
) {
  let receivedMessage = ''
  let aiTextLog: Message[] = []
  let tag = ''
  let isCodeBlock = false
  let codeBlockText = ''
  const sentences = new Array<string>()
  const currentSlideMessages: string[] = []

  const processAndDisplayText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);

    if (matches && matches.length > 0) {
      const linkedText = text.replace(urlRegex, (url) => `<a href="${url}" target="_blank">${url}</a>`);
      homeStore.setState({
        assistantMessage: linkedText,
      });
    } else {
      homeStore.setState({
        assistantMessage: text,
      });
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done && receivedMessage.length === 0) break

      if (value) receivedMessage += value

      // 返答内容のタグ部分と返答部分を分離
      const tagMatch = receivedMessage.match(/^\[(.*?)\]/)
      if (tagMatch && tagMatch[0]) {
        tag = tagMatch[0]
        receivedMessage = receivedMessage.slice(tag.length)
      }

      // 返答を一文単位で切り出して処理する
      while (receivedMessage.length > 0) {
        const sentenceMatch = receivedMessage.match(
          /^(.+?[。．.!?！？]\s*|.+?[。．.!?！？]$|.{20,}[、,]\s*)/
        )
        if (sentenceMatch?.[0]) {
          let sentence = sentenceMatch[0]
          // 区切った文字をsentencesに追加
          sentences.push(sentence)
          // 区切った文字の残りでreceivedMessageを更新
          receivedMessage = receivedMessage.slice(sentence.length).trimStart()

          // 発話不要/不可能な文字列だった場合はスキップ
          if (
            !sentence.includes('```') &&
            !sentence.replace(
              /^[\s\u3000\t\n\r\[\(\{「［（【『〈《〔｛«‹〘〚〛〙›»〕》〉』】）］」\}\)\]'"''""・、。,.!?！？:：;；\-_=+~～*＊@＠#＃$＄%％^＾&＆|｜\\＼/`｀]+$/gu,
              ''
            )
          ) {
            continue
          }

          // タグと返答を結合（音声再生で使用される）
          let aiText = `${tag} ${sentence}`
          console.log('aiText', aiText)

          if (isCodeBlock && !sentence.includes('```')) {
            codeBlockText += sentence
            continue
          }

          if (sentence.includes('```')) {
            if (isCodeBlock) {
              // コードブロックの終了処理
              const [codeEnd, ...restOfSentence] = sentence.split('```')
              aiTextLog.push({
                role: 'code',
                content: codeBlockText + codeEnd,
              })
              aiText += `${tag} ${restOfSentence.join('```') || ''}`

              // AssistantMessage欄の更新
              homeStore.setState({ assistantMessage: sentences.join(' ') })

              codeBlockText = ''
              isCodeBlock = false
            } else {
              // コードブロックの開始処理
              isCodeBlock = true
              ;[aiText, codeBlockText] = aiText.split('```')
            }

            sentence = sentence.replace(/```/g, '')
          }

          const aiTalks = textsToScreenplay([aiText], ss.koeiroParam)
          aiTextLog.push({ role: 'assistant', content: sentence })

          // 文ごとに音声を生成 & 再生、返答を表示
          const currentAssistantMessage = sentences.join(' ')

          speakCharacter(
            aiTalks[0],
            () => {
              processAndDisplayText(currentAssistantMessage);
              hs.incrementChatProcessingCount()
              // スライド用のメッセージを更新
              currentSlideMessages.push(sentence)
              homeStore.setState({
                slideMessages: currentSlideMessages,
              })
            },
            () => {
              hs.decrementChatProcessingCount()
              currentSlideMessages.shift()
              homeStore.setState({
                slideMessages: currentSlideMessages,
              })
            }
          )
        } else {
          // マッチする文がない場合、ループを抜ける
          break
        }
      }

      // ストリームが終了し、receivedMessageが空でない場合の処理
      if (done && receivedMessage.length > 0) {
        // 残りのメッセージを処理
        let aiText = `${tag} ${receivedMessage}`
        const aiTalks = textsToScreenplay([aiText], ss.koeiroParam)
        aiTextLog.push({ role: 'assistant', content: receivedMessage })
        sentences.push(receivedMessage)

        const currentAssistantMessage = sentences.join(' ')

        speakCharacter(
          aiTalks[0],
          () => {
            processAndDisplayText(currentAssistantMessage);
            hs.incrementChatProcessingCount()
            // スライド用のメッセージを更新
            currentSlideMessages.push(receivedMessage)
            homeStore.setState({
              slideMessages: currentSlideMessages,
            })
          },
          () => {
            hs.decrementChatProcessingCount()
            currentSlideMessages.shift()
            homeStore.setState({
              slideMessages: currentSlideMessages,
            })
          }
        )

        receivedMessage = ''
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    reader.releaseLock()
  }

  // 直前のroleとじゃらば、contentを結合し、空のcontentを除外する
  let lastImageUrl = ''
  aiTextLog = aiTextLog
    .reduce((acc: Message[], item: Message) => {
      if (
        typeof item.content != 'string' &&
        item.content[0] &&
        item.content[1].image_url
      ) {
        lastImageUrl = item.content[1].image_url.url
      }

      const lastItem = acc[acc.length - 1]
      if (lastItem && lastItem.role === item.role) {
        if (typeof item.content != 'string') {
          lastItem.content += ' ' + item.content[0].text
        } else {
          lastItem.content += ' ' + item.content
        }
      } else {
        const text =
          typeof item.content != 'string' ? item.content[0].text : item.content
        if (lastImageUrl != '') {
          acc.push({
            ...item,
            content: [
              { type: 'text', text: text.trim() },
              { type: 'image_url', image_url: { url: lastImageUrl } },
            ],
          })
          lastImageUrl = ''
        } else {
          acc.push({ ...item, content: text.trim() })
        }
      }
      return acc
    }, [])
    .filter((item) => item.content !== '')

  // すべての音声出力処理が完了するのを待つ
  await new Promise(resolve => setTimeout(resolve, 500)); // 遅延を500msに増やす

  // 応答が完全に終わった後、URLを含む場合はポップアップを表示
  const fullResponse = aiTextLog
    .filter(msg => msg.role === 'assistant')
    .map(msg => typeof msg.content === 'string' ? msg.content : msg.content[0].text)
    .join(' ')
    .replace(/\s+/g, ' ') // 複数の空白を1つに置換
    .trim(); // 前後の空白を削除

  const urlRegex = /(https?:\/\/\S+)/g;
  if (urlRegex.test(fullResponse)) {
    const processedResponse = processUrlsInText(fullResponse);
    homeStore.setState({ 
      popupContent: processedResponse,
      isPopupOpen: true 
    });
  }

  return aiTextLog
}

// メイン関数: 元のprocessAIResponse関数を修正
export const processAIResponse = async (
  currentChatLog: Message[],
  messages: Message[]
) => {
  homeStore.setState({ chatProcessing: true })

  const ss = settingsStore.getState()
  const hs = homeStore.getState()

  const aiServiceConfig: AIServiceConfig = {
    openai: {
      key: ss.openAiKey || process.env.NEXT_PUBLIC_OPEN_AI_KEY || '',
      model: ss.selectAIModel,
    },
    anthropic: {
      key: ss.anthropicKey || process.env.NEXT_PUBLIC_ANTHROPIC_KEY || '',
      model: ss.selectAIModel,
    },
    google: {
      key: ss.googleKey || process.env.NEXT_PUBLIC_GOOGLE_KEY || '',
      model: ss.selectAIModel,
    },
    localLlm: {
      url: ss.localLlmUrl || process.env.NEXT_PUBLIC_LOCAL_LLM_URL || '',
      model: ss.selectAIModel || process.env.NEXT_PUBLIC_LOCAL_LLM_MODEL || '',
    },
    groq: {
      key: ss.groqKey || process.env.NEXT_PUBLIC_GROQ_KEY || '',
      model: ss.selectAIModel,
    },
    dify: {
      key: ss.difyKey || process.env.NEXT_PUBLIC_DIFY_KEY || '',
      url: ss.difyUrl || process.env.NEXT_PUBLIC_DIFY_URL || '',
      conversationId: ss.difyConversationId,
    },
  }

  try {
    // Agent選択のためのLLM呼び出し
    const { agent, handler } = await choice(currentChatLog, messages);

    if (agent === 'Agent1') {
      // 常のLLM処理（既存のprocessAIResponse処理）
      const stream = await sendToLLM(ss.selectAIService as AIService, messages, aiServiceConfig)

      if (stream == null) {
        homeStore.setState({ chatProcessing: false })
        return
      }

      const reader = stream.getReader()
      const aiTextLog = await processStreamResponse(reader, currentChatLog, ss, hs)

      homeStore.setState({
        chatLog: [...currentChatLog, ...aiTextLog],
        chatProcessing: false,
      })
    } else if (handler) {
      // Agent2, Agent3, Agent4の処理
      const stream = await sendToLLM(ss.selectAIService as AIService, messages, aiServiceConfig)
      if (stream == null) {
        homeStore.setState({ chatProcessing: false })
        return
      }
      const reader = stream.getReader()
      await handler(reader, currentChatLog, ss, hs);
    } else {
      console.error('Unknown agent or missing handler');
      homeStore.setState({ chatProcessing: false })
    }
  } catch (error) {
    console.error("Error in processAIResponse:", error);
    homeStore.setState({ chatProcessing: false })
  }
}

/**
 * アシスタントとの会話を行う
 * 画面のチャット欄から入力されたときに実行される���理
 */
export const handleSendChatFn =
  (errors: {
    NotConnectedToExternalAssistant: string
    APIKeyNotEntered: string
  }) =>
  async (text: string, role?: string) => {
    const newMessage = text

    if (newMessage === null) return

    const ss = settingsStore.getState()
    const hs = homeStore.getState()
    const sls = slideStore.getState()

    if (ss.webSocketMode) {
      // 未メンテなので不具合がある可能性あり
      console.log('websocket mode: true')
      homeStore.setState({ chatProcessing: true })

      if (role !== undefined && role !== 'user') {
        // WebSocketからの返答を処理

        if (role == 'assistant') {
          let aiText = `${'[neutral]'} ${newMessage}`
          try {
            const aiTalks = textsToScreenplay([aiText], ss.koeiroParam)

            // 文ごとに音声を生成 & 再生、返答を表示
            speakCharacter(aiTalks[0], async () => {
              // アシスタントの返答をログに追加
              const updateLog: Message[] = [
                ...hs.codeLog,
                { role: 'assistant', content: newMessage },
              ]

              homeStore.setState({
                chatLog: updateLog,
                codeLog: updateLog,
                assistantMessage: newMessage,
                chatProcessing: false,
                voicePlaying: false,
              })
            })
          } catch (e) {
            homeStore.setState({
              chatProcessing: false,
              voicePlaying: false,
            })
          }
        } else if (role == 'code' || role == 'output' || role == 'executing') {
          // コードコメントの処理
          // ループ完了後にAI応答をコードログに追加
          const updateLog: Message[] = [
            ...hs.codeLog,
            { role: role, content: newMessage },
          ]
          homeStore.setState({ codeLog: updateLog, chatProcessing: false })
        } else {
          // その他のコメントの処理（現想では使用されないはず）
          console.log('error role:', role)
        }
      } else {
        // WebSocketで送信する処理

        if (hs.ws?.readyState === WebSocket.OPEN) {
          // ユーザーの発言を追加して表示
          const updateLog: Message[] = [
            ...hs.codeLog,
            { role: 'user', content: newMessage },
          ]
          homeStore.setState({
            chatLog: updateLog,
            codeLog: updateLog,
          })

          // WebSocket送信
          hs.ws.send(JSON.stringify({ content: newMessage, type: 'chat' }))
        } else {
          homeStore.setState({
            assistantMessage: errors['NotConnectedToExternalAssistant'],
            chatProcessing: false,
          })
        }
      }
    } else {
      // ChatVRM original mode
      const emptyKeys = [
        ss.selectAIService === 'openai' &&
          !ss.openAiKey &&
          !process.env.NEXT_PUBLIC_OPEN_AI_KEY,

        ss.selectAIService === 'anthropic' &&
          !ss.anthropicKey &&
          !process.env.NEXT_PUBLIC_ANTHROPIC_KEY,

        ss.selectAIService === 'google' &&
          !ss.googleKey &&
          !process.env.NEXT_PUBLIC_GOOGLE_KEY,

        ss.selectAIService === 'groq' &&
          !ss.groqKey &&
          !process.env.NEXT_PUBLIC_GROQ_KEY,

        ss.selectAIService === 'dify' &&
          !ss.difyKey &&
          !process.env.NEXT_PUBLIC_DIFY_KEY,
      ]
      if (emptyKeys.includes(true)) {
        homeStore.setState({ assistantMessage: errors['APIKeyNotEntered'] })
        return
      }

      let systemPrompt = ss.systemPrompt
      if (ss.slideMode) {
        if (sls.isPlaying) {
          return
        }

        try {
          let scripts = JSON.stringify(
            require(
              `../../../public/slides/${sls.selectedSlideDocs}/scripts.json`
            )
          )
          systemPrompt = systemPrompt.replace('{{SCRIPTS}}', scripts)

          let supplement = ''
          try {
            const response = await fetch(
              `/api/getSupplement?slideDocs=${sls.selectedSlideDocs}`
            )
            if (!response.ok) {
              throw new Error('Failed to fetch supplement')
            }
            const data = await response.json()
            supplement = data.supplement
            systemPrompt = systemPrompt.replace('{{SUPPLEMENT}}', supplement)
          } catch (e) {
            console.error('supplement.txtの読み込みに失敗しました:', e)
          }

          const answerString = await judgeSlide(newMessage, scripts, supplement)
          const answer = JSON.parse(answerString)
          if (answer.judge === 'true' && answer.page !== '') {
            goToSlide(Number(answer.page))
            systemPrompt += `\n\nEspecial Page Number is ${answer.page}.`
          }
        } catch (e) {
          console.error(e)
        }
      }

      homeStore.setState({ chatProcessing: true })
      // ユーザーの発言を追加して表示
      const messageLog: Message[] = [
        ...hs.chatLog,
        {
          role: 'user',
          content:
            hs.modalImage &&
            ss.selectAIService === 'openai' &&
            (ss.selectAIModel === 'gpt-4o-mini' ||
              ss.selectAIModel === 'chatgpt-4o-latest' ||
              ss.selectAIModel === 'gpt-4o-2024-08-06' ||
              ss.selectAIModel === 'gpt-4o' ||
              ss.selectAIModel === 'gpt-4-turbo')
              ? [
                  { type: 'text', text: newMessage },
                  { type: 'image_url', image_url: { url: hs.modalImage } },
                ]
              : newMessage,
        },
      ]
      if (hs.modalImage) {
        homeStore.setState({ modalImage: '' })
      }
      homeStore.setState({ chatLog: messageLog })

      // TODO: AIに送信するメッセージの加工、処理がひどいので要修正
      const processedMessageLog = messageLog.map((message) => ({
        role: ['assistant', 'user', 'system'].includes(message.role)
          ? message.role
          : 'assistant',
        content:
          typeof message.content === 'string' ||
          (ss.selectAIService === 'openai' &&
            (ss.selectAIModel === 'gpt-4o-mini' ||
              ss.selectAIModel === 'chatgpt-4o-latest' ||
              ss.selectAIModel === 'gpt-4o-2024-08-06' ||
              ss.selectAIModel === 'gpt-4o' ||
              ss.selectAIModel === 'gpt-4-turbo'))
            ? message.content
            : message.content[0].text,
      }))

      const messages: Message[] = [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...processedMessageLog.slice(-10),
      ]

      try {
        await processAIResponse(messageLog, messages)
      } catch (e) {
        console.error(e)
      }

      homeStore.setState({ chatProcessing: false })
    }
  }
