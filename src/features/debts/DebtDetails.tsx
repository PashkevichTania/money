import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { formatMoney } from '@/utils/currency';
import type { DirectDebt } from '@/utils/directDebts';

export function DebtDetails({
  debt,
  compact = false,
  preview = false,
}: {
  debt: DirectDebt;
  compact?: boolean;
  preview?: boolean;
}) {
  const { t } = useTranslation();
  const parts = compact ? debt.parts.slice(0, 3) : debt.parts;
  return (
    <div className="space-y-3">
      {parts.map((part) => (
        <article
          key={part.id}
          className="rounded-md border bg-muted/30 p-3 text-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="font-medium break-words">{part.title}</span>
            <span className="shrink-0 font-semibold">
              {formatMoney(part.remainingMinor / 100, part.currency)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {part.groupName} · {part.date}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('Original expense')}:{' '}
            {formatMoney(part.originalAmount, part.originalCurrency)}
          </p>
          {!compact && (
            <>
              <p className="mt-2">
                {t('Initial debt share')}:{' '}
                {formatMoney(part.initialMinor / 100, part.currency)}
              </p>
              <p>
                {t('Allocated payments')}:{' '}
                {formatMoney(
                  (part.initialMinor - part.remainingMinor) / 100,
                  part.currency
                )}
              </p>
              {part.payments.some((payment) => payment.indirect) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('Includes a payment through a chain of debts.')}
                </p>
              )}
              {part.multiplePayers && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t(
                    'Multiple payers: allocated proportionally after each payer covers their own share.'
                  )}
                </p>
              )}
              {!preview && (
                <Link
                  className="mt-3 inline-block text-positive underline"
                  to={'/groups/' + encodeURIComponent(part.groupId)}
                >
                  {t('Open group')}
                </Link>
              )}
            </>
          )}
        </article>
      ))}
      {compact && debt.parts.length > 3 && (
        <p className="text-xs text-muted-foreground">
          {t('More expenses')}: {debt.parts.length - 3}
        </p>
      )}
      {compact && (
        <p className="text-xs text-muted-foreground">
          {t('Click the amount for full details.')}
        </p>
      )}
    </div>
  );
}
