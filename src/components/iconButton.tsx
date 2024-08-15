import { KnownIconType } from '@charcoal-ui/icons'
import { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode
  iconName?: keyof KnownIconType
  isProcessing: boolean
  processingIcon?: ReactNode
  label?: string
}

export const IconButton = ({
  icon,
  iconName,
  isProcessing,
  processingIcon,
  label,
  ...rest
}: Props) => {
  console.log('IconButton render, isProcessing:', isProcessing);  // デバッグ用ログ

  return (
    <button
      {...rest}
      className={`bg-primary hover:bg-primary-hover active:bg-primary-press disabled:bg-primary-disabled text-white rounded-16 text-sm p-8 text-center inline-flex items-center mr-2
        ${rest.className}
      `}
    >
      {isProcessing ? (
        processingIcon || <pixiv-icon name={'24/Dot'} scale="1"></pixiv-icon>
      ) : icon ? (
        icon
      ) : iconName ? (
        <pixiv-icon name={iconName} scale="1"></pixiv-icon>
      ) : null}
      {label && <div className="mx-4 font-bold">{label}</div>}
    </button>
  )
}