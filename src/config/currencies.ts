export const DEFAULT_BASE_CURRENCY =
  import.meta.env.VITE_APP_BASE_CURRENCY || 'USD';

export interface CurrencyOption {
  code: string;
  label: string;
  symbol: string;
}

export const CURRENCIES: CurrencyOption[] = [
  // Major world currencies
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', label: 'Chinese Yuan', symbol: '¥' },

  // Rubles and Eastern European
  { code: 'RUB', label: 'Russian Ruble', symbol: '₽' },
  { code: 'BYN', label: 'Belarusian Ruble', symbol: 'Br' },
  { code: 'UAH', label: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'PLN', label: 'Polish Złoty', symbol: 'zł' },
  { code: 'CZK', label: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', label: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'RON', label: 'Romanian Leu', symbol: 'lei' },
  { code: 'BGN', label: 'Bulgarian Lev', symbol: 'лв' },

  // Other European
  { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SEK', label: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', label: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', label: 'Danish Krone', symbol: 'kr' },
  { code: 'ISK', label: 'Icelandic Króna', symbol: 'kr' },

  // Americas
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { code: 'MXN', label: 'Mexican Peso', symbol: '$' },
  { code: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
  { code: 'ARS', label: 'Argentine Peso', symbol: '$' },
  { code: 'CLP', label: 'Chilean Peso', symbol: '$' },
  { code: 'COP', label: 'Colombian Peso', symbol: '$' },
  { code: 'PEN', label: 'Peruvian Sol', symbol: 'S/' },

  // Asia-Pacific
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'NZD', label: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', label: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'KRW', label: 'South Korean Won', symbol: '₩' },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { code: 'IDR', label: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'PHP', label: 'Philippine Peso', symbol: '₱' },
  { code: 'MYR', label: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'THB', label: 'Thai Baht', symbol: '฿' },
  { code: 'VND', label: 'Vietnamese Dong', symbol: '₫' },
  { code: 'TWD', label: 'New Taiwan Dollar', symbol: 'NT$' },
  { code: 'PKR', label: 'Pakistani Rupee', symbol: 'Rs' },
  { code: 'BDT', label: 'Bangladeshi Taka', symbol: '৳' },

  // Middle East
  { code: 'ILS', label: 'Israeli Shekel', symbol: '₪' },
  { code: 'TRY', label: 'Turkish Lira', symbol: '₺' },
  { code: 'SAR', label: 'Saudi Riyal', symbol: '﷼' },
  { code: 'AED', label: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'EGP', label: 'Egyptian Pound', symbol: 'E£' },

  // Africa
  { code: 'ZAR', label: 'South African Rand', symbol: 'R' },
  { code: 'NGN', label: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', label: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'GHS', label: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'MAD', label: 'Moroccan Dirham', symbol: 'DH' },
];

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol || code;
}
