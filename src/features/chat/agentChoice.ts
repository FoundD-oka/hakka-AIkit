import axios from 'axios';
import { Message } from '@/features/messages/messages';
import { processStreamResponse } from './handlers';
import settingsStore from '@/features/stores/settings';
import homeStore from '@/features/stores/home';

const apiKey = process.env.NEXT_PUBLIC_AGENTCHOICE_OPEN_AI_KEY;

if (!apiKey) {
  throw new Error("OpenAI API key is not set in .env file");
}

// Agent2：議事録
const handleAgent2 = async (
  reader: ReadableStreamDefaultReader<any>,
  currentChatLog: Message[],
  ss: ReturnType<typeof settingsStore.getState>,
  hs: ReturnType<typeof homeStore.getState>
) => {
  await processStreamResponse(createFakeStream("Agent2").getReader(), currentChatLog, ss, hs);
};

// Agent3：提案書
const handleAgent3 = async (
  reader: ReadableStreamDefaultReader<any>,
  currentChatLog: Message[],
  ss: ReturnType<typeof settingsStore.getState>,
  hs: ReturnType<typeof homeStore.getState>
) => {
  await processStreamResponse(createFakeStream("Agent3").getReader(), currentChatLog, ss, hs);
};

// Agent4：メール作成
const handleAgent4 = async (
  reader: ReadableStreamDefaultReader<any>,
  currentChatLog: Message[],
  ss: ReturnType<typeof settingsStore.getState>,
  hs: ReturnType<typeof homeStore.getState>
) => {
  await processStreamResponse(createFakeStream("Agent4").getReader(), currentChatLog, ss, hs);
};

// ダミーのストリームを作成する関数
const createFakeStream = (content: string): ReadableStream => {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(content);
      controller.close();
    }
  });
};

export const choice = async (messageLog: Message[], messages: Message[]) => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: 'user入力基づいて、最も適切なエージェントを判断し、{"agent": "Agent1"}の形式でJSON出力してください。Agent1は質問や知識に基づく通常の回答を行います。Agent2は会議やディスカッションの議事録を作成します。Agent3は企画や提案書を作成します。Agent4はメールを作成します。JSON形式以外の出力や追加のテキストは不要です。'
          },
          messages[messages.length - 1] // 最後のユーザーメッセージのみを使用
        ],
        max_tokens: 100,
        n: 1,
        stop: null,
        temperature: 0.5,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    const result = response.data.choices[0].message.content;
    const agentResult = JSON.parse(result);

    switch (agentResult.agent) {
      case 'Agent1':
        return { agent: 'Agent1', handler: null };
      case 'Agent2':
        return { agent: 'Agent2', handler: handleAgent2 };
      case 'Agent3':
        return { agent: 'Agent3', handler: handleAgent3 };
      case 'Agent4':
        return { agent: 'Agent4', handler: handleAgent4 };
      default:
        console.error('Unknown agent:', agentResult.agent);
        return { agent: 'Agent1', handler: null };
    }
  } catch (error) {
    console.error("Error in choice:", error);
    throw error;
  }
};