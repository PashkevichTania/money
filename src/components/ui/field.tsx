import { useTranslation } from 'react-i18next'
import { translateError } from '@/i18n/errors'
import { useMemo, useId, type ComponentProps, type ReactNode } from 'react'
import { Input } from './input'
import { Label } from './label'
import { Combobox } from '@base-ui/react/combobox'
import { ChevronDown, Check } from 'lucide-react'
import { CURRENCIES } from '@/config/currencies'
export function Field({
  label,
  error,
  id: suppliedId,
  ...props
}: ComponentProps<'input'> & { label: string; error?: string }) {
  useTranslation()
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
          {translateError(error)}
        </p>
      )}
    </div>
  )
}
export function CurrencySelect({
  label,
  value,
  onValueChange,
  disabled,
  name,
  onBlur,
}: {
  label?: string
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  name?: string
  onBlur?: () => void
}) {
  const { t, i18n } = useTranslation()
  const currencies = useMemo(() => {
    const names = new Intl.DisplayNames([i18n.resolvedLanguage || 'en'], {
      type: 'currency',
    })
    return CURRENCIES.map((currency) => ({
      ...currency,
      label: names.of(currency.code) || currency.label,
    }))
  }, [i18n.resolvedLanguage])
  const id = useId()
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label ?? t('Currency')}</Label>
      <Combobox.Root
        items={currencies}
        value={currencies.find((c) => c.code === value) ?? null}
        onValueChange={(currency) => {
          if (currency) onValueChange(currency.code)
        }}
        itemToStringLabel={(c) => `${c.code} · ${c.label}`}
        itemToStringValue={(c) => c.code}
        name={name}
        disabled={disabled}
      >
        <Combobox.Trigger
          id={id}
          onBlur={onBlur}
          className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm disabled:opacity-50 dark:bg-input/30"
        >
          <Combobox.Value placeholder={t('Select currency')} />
          <ChevronDown className="size-4 shrink-0" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner sideOffset={6} className="z-[100]" align="start">
            <Combobox.Popup className="w-[var(--anchor-width)] min-w-60 max-w-[calc(100vw-2rem)] rounded-md border bg-popover p-2 text-popover-foreground shadow-lg dark:bg-neutral-900">
              <Combobox.Input
                aria-label={t('Search currencies')}
                placeholder={t('Search code or currency...')}
                className="mb-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              />
              <Combobox.Empty className="p-3 text-sm text-muted-foreground">
                {t('No currencies found.')}
              </Combobox.Empty>
              <Combobox.List className="max-h-64 overflow-y-auto overscroll-contain">
                {(currency: (typeof CURRENCIES)[number]) => (
                  <Combobox.Item
                    key={currency.code}
                    value={currency}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    {currency.code} · {currency.label}
                    <Combobox.ItemIndicator>
                      <Check className="size-4" />
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
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
  useTranslation()
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`rounded-md border p-3 text-sm leading-6 ${error ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'bg-muted/50 text-muted-foreground'}`}
    >
      {error && typeof children === 'string'
        ? translateError(children)
        : children}
    </p>
  )
}
