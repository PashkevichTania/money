import { useTranslation } from 'react-i18next';

import { Section } from '@/components/ui/field';
import type { ExpenseRateState } from '@/features/expenses/hooks/useExpenseExchangeRate';
import { formatMoney } from '@/utils/currency';
import type { SplitValidationError } from '@/utils/split';

interface ExpenseReviewSectionProps {
  convertedAmount: number;
  groupCurrency: string;
  nameOf: (id: string) => string;
  previewNetBalances: Record<string, number>;
  rateState: ExpenseRateState;
  validationErrors: SplitValidationError[];
}

export function ExpenseReviewSection({
  convertedAmount,
  groupCurrency,
  nameOf,
  previewNetBalances,
  rateState,
  validationErrors,
}: ExpenseReviewSectionProps) {
  const { t } = useTranslation();
  return (
    <Section
      title={t('Review')}
      description={t('Amounts below are in {{currency}}.', {
        currency: groupCurrency,
      })}
    >
      <div className="flex justify-between text-lg font-semibold tabular-nums">
        <span>{t('Total')}</span>
        <span>{formatMoney(convertedAmount, groupCurrency)}</span>
      </div>
      {!validationErrors.length && rateState.rate && !rateState.error ? (
        <div className="divide-y">
          {Object.entries(previewNetBalances).map(([id, net]) => (
            <div key={id} className="flex justify-between gap-3 py-2 text-sm">
              <span>{nameOf(id)}</span>
              <span
                className={`text-right tabular-nums ${net > 0 ? 'text-positive' : net < 0 ? 'text-destructive' : 'text-muted-foreground'}`}
              >
                {Math.abs(net) < 0.005
                  ? t('No balance')
                  : `${net > 0 ? t('Gets back') : t('Owes')} ${formatMoney(Math.abs(net), groupCurrency)}`}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t(
            "Complete the amounts and split to preview each person's balance."
          )}
        </p>
      )}
    </Section>
  );
}
