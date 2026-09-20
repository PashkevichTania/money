import axios from 'axios'

const FRANKFURTER_BASE = 'https://api.frankfurter.dev/v2/rates'

export interface RateResult {
  rate: number
  date: string
  source: 'frankfurter' | 'identity'
}

export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  date?: string,
): Promise<RateResult> {
  if (!fromCurrency || !toCurrency) {
    throw new Error('Both currencies are required')
  }
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return {
      rate: 1,
      date: date || new Date().toISOString().slice(0, 10),
      source: 'identity',
    }
  }
  const base = fromCurrency.trim().toUpperCase()
  const quote = toCurrency.trim().toUpperCase()
  const params = new URLSearchParams({ base, quotes: quote })
  if (date) params.set('date', date.slice(0, 10))
  const url = `${FRANKFURTER_BASE}?${params}`
  try {
    const { data } = await axios.get<
      {
        date: string
        base: string
        quote: string
        rate: number
      }[]
    >(url, { timeout: 15000 })
    const entry = Array.isArray(data)
      ? data.find((row) => row.base === base && row.quote === quote)
      : undefined
    const rate = entry?.rate
    if (
      !rate ||
      !Number.isFinite(rate) ||
      rate <= 0 ||
      !entry ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)
    ) {
      throw new Error(`Rate not available for ${fromCurrency} -> ${toCurrency}`)
    }
    return {
      rate,
      date: entry.date,
      source: 'frankfurter',
    }
  } catch {
    throw new Error(
      `Failed to fetch exchange rate (${fromCurrency} -> ${toCurrency}). Check the currency and connection, then try again.`,
    )
  }
}
