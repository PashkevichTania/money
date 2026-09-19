import { useId, type ComponentProps, type ReactNode } from 'react'
import { Input } from './input'
import { Label } from './label'
import { NativeSelect } from './native-select'
import { CURRENCIES } from '@/config/currencies'
export function Field({
  label,
  error,
  id: suppliedId,
  ...props
}: ComponentProps<'input'> & { label: string; error?: string }) {
  const generated = useId()
  const id = suppliedId || generated
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
export function CurrencySelect({
  label = 'Currency',
  ...props
}: Omit<ComponentProps<'select'>, 'size'> & { label?: string }) {
  const id = useId()
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect {...props} id={id} className="w-full">
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} · {c.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}
export function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-md border bg-card p-5 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      {description && (
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  )
}
export function Message({
  children,
  error = false,
}: {
  children: ReactNode
  error?: boolean
}) {
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`rounded-md border p-3 text-sm leading-6 ${error ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'bg-muted/50 text-muted-foreground'}`}
    >
      {children}
    </p>
  )
}
