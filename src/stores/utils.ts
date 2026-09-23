export function getErrorMessage(error: unknown, fallback = 'Unknown error') {
  return error instanceof Error ? error.message : fallback
}

export function setRecordValue<T>(
  record: Record<string, T>,
  key: string,
  value: T,
) {
  return { ...record, [key]: value }
}

export function replaceById<T extends { id: string }>(items: T[], item: T) {
  return items.map((current) => (current.id === item.id ? item : current))
}

export function removeById<T extends { id: string }>(items: T[], id: string) {
  return items.filter((item) => item.id !== id)
}
