import dayjs from 'dayjs'

export function toIsoDate(value?: string | Date | null): string {
  if (!value) return dayjs().toISOString()
  return dayjs(value).toISOString()
}

export function formatDate(value: string | Date, format: string = 'MMM D, YYYY'): string {
  return dayjs(value).format(format)
}

export function nowIso(): string {
  return dayjs().toISOString()
}
