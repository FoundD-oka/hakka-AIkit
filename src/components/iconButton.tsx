import { ReactNode } from 'react'
import { ButtonHTMLAttributes } from 'react'
import { KnownIconType } from '@charcoal-ui/icons'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode
  iconName?: keyof KnownIconType
  isProcessing: boolean
  label?: string
}

export const IconButton = ({
  icon,
  iconName,
  isProcessing,
  label,
  ...rest
}: Props) => {
  return (
    <button
      {...rest}
      className={`bg-primary hover:bg-primary-hover active:bg-primary-press disabled:bg-primary-disabled text-white rounded-16 text-sm p-8 text-center inline-flex items-center mr-2
        ${rest.className}
      `}
    >
      {isProcessing ? (
        <div className="animate-spin rounded-full h-24 w-24 border-t-2 border-b-2 border-white"></div>
      ) : icon ? (
        icon
      ) : iconName ? (
        <pixiv-icon name={iconName} scale="1"></pixiv-icon>
      ) : null}
      {label && <div className="mx-4 font-bold">{label}</div>}
    </button>
  )
}