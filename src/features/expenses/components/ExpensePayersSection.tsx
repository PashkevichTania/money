import { Check, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Field, Section } from '@/components/ui/field';
import type { PayerContribution } from '@/types/expense';
import type { UserProfile } from '@/types/user';
import { formatMoney } from '@/utils/currency';

interface ExpensePayersSectionProps {
  addPayer: (userId: string) => void;
  applyEvenPaidBy: () => void;
  applySinglePayer: (userId: string) => void;
  currency: string;
  defaultPayerId: string;
  members: UserProfile[];
  nameOf: (id: string) => string;
  paidBy: PayerContribution[];
  paidRemaining: number;
  paidSum: number;
  participantIds: string[];
  payerIds: Set<string>;
  removePayer: (userId: string) => void;
  updatePayerAmount: (userId: string, raw: string | number) => void;
}

export function ExpensePayersSection({
  addPayer,
  applyEvenPaidBy,
  applySinglePayer,
  currency,
  defaultPayerId,
  members,
  nameOf,
  paidBy,
  paidRemaining,
  paidSum,
  participantIds,
  payerIds,
  removePayer,
  updatePayerAmount,
}: ExpensePayersSectionProps) {
  const { t } = useTranslation();
  const isSelfPaid =
    paidBy.length === 1 &&
    paidBy[0].userId === defaultPayerId &&
    paidRemaining === 0;
  const [splitPayments, setSplitPayments] = useState(!isSelfPaid);
  return (
    <Section
      compact
      title={t('2. Who paid?')}
      description={t('Enter contributions in {{currency}}.', { currency })}
    >
      <div
        role="group"
        aria-label={t('2. Who paid?')}
        className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
      >
        <Button
          type="button"
          variant={!splitPayments ? 'default' : 'ghost'}
          className="h-auto min-h-10 min-w-0 whitespace-normal px-2"
          aria-pressed={!splitPayments}
          onClick={() => {
            setSplitPayments(false);
            applySinglePayer(defaultPayerId);
          }}
        >
          {!splitPayments && <Check />}
          {t('I paid (Full)')}
        </Button>
        <Button
          type="button"
          variant={splitPayments ? 'default' : 'ghost'}
          className="h-auto min-h-10 min-w-0 whitespace-normal px-2"
          aria-pressed={splitPayments}
          onClick={() => setSplitPayments(true)}
        >
          {t('Split payments')}
        </Button>
      </div>
      {!splitPayments ? (
        <div className="flex items-center justify-between gap-3 py-1 text-sm">
          <span className="truncate">{nameOf(defaultPayerId)}</span>
          <span className="shrink-0 font-medium tabular-nums">
            {formatMoney(paidSum, currency)}
          </span>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paidBy.map(({ userId, amount }) => (
              <div key={userId} className="flex items-end gap-2">
                <div className="flex-1">
                  <Field
                    label={t('Paid by {{name}}', { name: nameOf(userId) })}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) =>
                      updatePayerAmount(userId, event.target.value)
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={paidBy.length <= 1}
                  aria-label={t('Remove payer {{name}}', {
                    name: nameOf(userId),
                  })}
                  onClick={() => removePayer(userId)}
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!participantIds.length}
              onClick={applyEvenPaidBy}
            >
              {t('Split payments evenly')}
            </Button>
            {members
              .filter(({ id }) => !payerIds.has(id))
              .map(({ id, displayName }) => (
                <Button
                  type="button"
                  key={id}
                  variant="secondary"
                  size="sm"
                  onClick={() => addPayer(id)}
                >
                  <Plus />
                  {displayName}
                </Button>
              ))}
          </div>
        </>
      )}
      <p
        className={`text-sm tabular-nums ${Math.abs(paidRemaining) < 0.005 ? 'text-positive' : 'text-destructive'}`}
      >
        {t('Paid {{paid}} · Remaining {{remaining}}', {
          paid: formatMoney(paidSum, currency),
          remaining: formatMoney(paidRemaining, currency),
        })}
      </p>
    </Section>
  );
}
