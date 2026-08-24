export const DEFAULT_BASE_CURRENCY = import.meta.env.VITE_APP_BASE_CURRENCY || 'USD'

export interface CurrencyOption {
  code: string
  label: string
  symbol: string
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', label: 'Chinese Yuan', symbol: '¥' },
  { code: 'CZK', label: 'Czech Koruna', symbol: 'Kč' },
  { code: 'DKK', label: 'Danish Krone', symbol: 'kr' },
  { code: 'HKD', label: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'HUF', label: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { code: 'ILS', label: 'Israeli Shekel', symbol: '₪' },
  { code: 'MXN', label: 'Mexican Peso', symbol: '$' },
  { code: 'MYR', label: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'NOK', label: 'Norwegian Krone', symbol: 'kr' },
  { code: 'NZD', label: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'PHP', label: 'Philippine Peso', symbol: '₱' },
  { code: 'PLN', label: 'Polish Złoty', symbol: 'zł' },
  { code: 'RON', label: 'Romanian Leu', symbol: 'lei' },
  { code: 'SEK', label: 'Swedish Krona', symbol: 'kr' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
  { code: 'THB', label: 'Thai Baht', symbol: '฿' },
  { code: 'TRY', label: 'Turkish Lira', symbol: '₺' },
  { code: 'ZAR', label: 'South African Rand', symbol: 'R' },
  { code: 'BGN', label: 'Bulgarian Lev', symbol: 'лв' },
  { code: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
  { code: 'KRW', label: 'South Korean Won', symbol: '₩' },
  { code: 'IDR', label: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'ISK', label: 'Icelandic Króna', symbol: 'kr' },
]

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol || code
}
