import { toast } from 'sonner';

import { translateError } from '@/i18n/errors';
type Variant = 'success' | 'error' | 'info' | 'warning' | 'default';
function enqueueSnackbar(message: string, options?: { variant?: Variant }) {
  message = translateError(message);
  const variant = options?.variant;
  return variant && variant !== 'default'
    ? toast[variant](message)
    : toast(message);
}
export function useNotify() {
  return { enqueueSnackbar };
}
