import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog'
import { cn } from '@/lib/utils'
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  busy = false,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: string
  children: ReactNode
  busy?: boolean
  wide?: boolean
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) onClose()
      }}
    >
      <DialogContent
        showCloseButton={!busy}
        className={cn(
          'flex max-h-[90dvh] flex-col overflow-y-auto p-6 sm:max-w-lg',
          wide && 'sm:max-w-3xl',
        )}
      >
        <DialogHeader className="shrink-0 pr-7">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
