export function formatMoney(
  amount: number,
  currency: string,
  locale: string = typeof document === 'undefined'
    ? 'en-US'
    : document.documentElement.lang || 'en-US'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
}

export function roundMoney(amount: number, digits: number = 2): number {
  const factor = Math.pow(10, digits);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

export function safeSum(values: number[]): number {
  return values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
}
