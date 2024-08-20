import { Form } from '@/components/form'
import { Introduction } from '@/components/introduction'
import { Menu } from '@/components/menu'
import { Meta } from '@/components/meta'
import ModalImage from '@/components/modalImage'
import VrmViewer from '@/components/vrmViewer'
import CustomPopup from '@/components/CustomPopup'
import homeStore from '@/features/stores/home'
import '@/lib/i18n'
import { buildUrl } from '@/utils/buildUrl'

const Home = () => {
  const bgUrl = homeStore((s) => `url(${buildUrl(s.backgroundImageUrl)})`)
  const { isPopupOpen, popupContent } = homeStore()
  const closePopup = () => homeStore.setState({ isPopupOpen: false })

  return (
    <div className="min-h-screen bg-cover" style={{ backgroundImage: bgUrl }}>
      <Meta />
      <Introduction />
      <VrmViewer />
      <Form />
      <Menu />
      <ModalImage />
      <CustomPopup
        isOpen={isPopupOpen}
        onClose={closePopup}
        content={popupContent}
      />
    </div>
  )
}
export default Home