import i18n from './index'

// Domain/API errors retain their existing English contract. Translate only at
// presentation boundaries; never run this against user-entered names or notes.
const patterns: [RegExp, string, string[]][] = [
  [
    /^No user found with email "(.+)"\. Ask them to sign up first, then add them\.$/,
    'No user found with email "{{email}}". Ask them to sign up first, then add them.',
    ['email'],
  ],
  [
    /^Sum of payments \(([^)]+)\) must equal total amount \(([^)]+)\)\.$/,
    'Sum of payments ({{paid}}) must equal total amount ({{total}}).',
    ['paid', 'total'],
  ],
  [
    /^Exact amounts add to (.+), expected (.+)\.$/,
    'Exact amounts add to {{sum}}, expected {{total}}.',
    ['sum', 'total'],
  ],
  [
    /^Percentages add to (.+)%, expected 100%\.$/,
    'Percentages add to {{sum}}%, expected 100%.',
    ['sum'],
  ],
  [
    /^Failed to fetch exchange rate \((.+) -> (.+)\)\. Check the currency and connection, then try again\.$/,
    'Failed to fetch exchange rate ({{from}} → {{to}}). Check the currency and connection, then try again.',
    ['from', 'to'],
  ],
  [
    /^Expense "([\s\S]*)" has invalid amounts or currency\. Correct it before relying on balances\.$/,
    'Expense "{{title}}" has invalid amounts or currency. Correct it before relying on balances.',
    ['title'],
  ],
]

export function translateError(message: string): string {
  for (const [pattern, key, names] of patterns) {
    const match = message.match(pattern)
    if (match)
      return i18n.t(
        key,
        Object.fromEntries(
          names.map((name, index) => [name, match[index + 1]]),
        ),
      )
  }
  return i18n.t(message)
}
