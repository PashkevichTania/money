import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog';
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  busy = false,
  wide = false,
  mobileFullscreen = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
  busy?: boolean;
  wide?: boolean;
  mobileFullscreen?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!busy}
        className={cn(
          'flex max-h-[90dvh] flex-col overflow-y-auto p-6 sm:max-w-lg',
          wide && 'sm:max-w-3xl',
          mobileFullscreen &&
            'max-sm:inset-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:p-3 max-sm:pt-[max(0.75rem,env(safe-area-inset-top))] max-sm:gap-3'
        )}
      >
        <DialogHeader className="shrink-0 pr-7">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
