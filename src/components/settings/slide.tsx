import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import settingsStore from '@/features/stores/settings'
import menuStore from '@/features/stores/menu'
import slideStore from '@/features/stores/slide'
import { TextButton } from '../textButton'

const Slide = () => {
  const { t } = useTranslation()
  const selectAIService = settingsStore((s) => s.selectAIService)

  const slideMode = settingsStore((s) => s.slideMode)
  const conversationContinuityMode = settingsStore(
    (s) => s.conversationContinuityMode
  )

  const selectedSlideDocs = slideStore((s) => s.selectedSlideDocs)
  const [slideFolders, setSlideFolders] = useState<string[]>([])

  useEffect(() => {
    // フォルダリストを取得
    fetch('/api/getSlideFolders')
      .then((response) => response.json())
      .then((data) => setSlideFolders(data))
      .catch((error) => console.error('Error fetching slide folders:', error))
  }, [])

  useEffect(() => {
    // 初期値を 'demo' に設定
    if (!selectedSlideDocs) {
      slideStore.setState({ selectedSlideDocs: 'demo' })
    }
  }, [selectedSlideDocs])

  const toggleSlideMode = () => {
    const newSlideMode = !slideMode
    settingsStore.setState({
      slideMode: newSlideMode,
      // スライドモードがオンになったら、会話継続モードをオフにする
      conversationContinuityMode: newSlideMode
        ? false
        : conversationContinuityMode,
    })
    if (!newSlideMode) {
      menuStore.setState({ slideVisible: false })
    }
  }

  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    slideStore.setState({ selectedSlideDocs: e.target.value })
  }

  return (
    <>
      <div className="my-16 typography-20 font-bold">{t('SlideMode')}</div>
      <p className="">{t('SlideModeDescription')}</p>
      <div className="my-8">
        <TextButton
          onClick={toggleSlideMode}
          disabled={
            selectAIService !== 'openai' &&
            selectAIService !== 'anthropic' &&
            selectAIService !== 'google'
          }
        >
          {slideMode ? t('StatusOn') : t('StatusOff')}
        </TextButton>
      </div>
      {slideMode && (
        <>
          <div className="my-16 typography-20 font-bold">
            {t('SelectedSlideDocs')}
          </div>
          <select
            id="folder-select"
            className="px-16 py-16 bg-surface1 hover:bg-surface1-hover rounded-8 w-full md:w-1/2"
            value={selectedSlideDocs}
            onChange={handleFolderChange}
          >
            {slideFolders.map((folder) => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>
        </>
      )}
    </>
  )
}

export default Slide
