import axios from 'axios'

const FRANKFURTER_BASE = 'https://api.frankfurter.app'

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
  const dateSegment = date ? date.slice(0, 10) : 'latest'
  const url = `${FRANKFURTER_BASE}/${dateSegment}?from=${fromCurrency.toUpperCase()}&to=${toCurrency.toUpperCase()}`
  try {
    const { data } = await axios.get<{
      date: string
      rates: Record<string, number>
    }>(url)
    const rate = data?.rates?.[toCurrency.toUpperCase()]
    if (!rate || !Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Rate not available for ${fromCurrency} -> ${toCurrency}`)
    }
    return {
      rate,
      date: data.date,
      source: 'frankfurter',
    }
  } catch {
    throw new Error(
      `Failed to fetch exchange rate (${fromCurrency} -> ${toCurrency}). Check the currency and connection, then try again.`,
    )
  }
}
