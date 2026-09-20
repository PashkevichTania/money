import dayjs from 'dayjs'

export function toIsoDate(value?: string | Date | null): string {
  if (!value) return dayjs().toISOString()
  return dayjs(value).toISOString()
}

export function formatDate(value: string | Date, format?: string): string {
  if (format) return dayjs(value).format(format)
  const locale =
    typeof document === 'undefined'
      ? 'en-US'
      : document.documentElement.lang || 'en-US'
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(dayjs(value).toDate())
}

export function nowIso(): string {
  return dayjs().toISOString()
}
