import { toast } from 'sonner'
type Variant = 'success' | 'error' | 'info' | 'warning' | 'default'
function enqueueSnackbar(message: string, options?: { variant?: Variant }) {
  const variant = options?.variant
  return variant && variant !== 'default'
    ? toast[variant](message)
    : toast(message)
}
export function useNotify() {
  return { enqueueSnackbar }
}
