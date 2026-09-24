import type { FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Message, Section } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SPLIT_TYPES } from '@/features/expenses/constants';
import type { ExpenseFormValues } from '@/features/expenses/expenseForm';
import { translateError } from '@/i18n/errors';
import type { SplitType } from '@/types/expense';
import type { UserProfile } from '@/types/user';
import { formatMoney } from '@/utils/currency';
import type { SplitValidationError } from '@/utils/split';

interface ExpenseSplitSectionProps {
  allSelected: boolean;
  changeSplit: (type: SplitType) => void;
  errors: FieldErrors<ExpenseFormValues>;
  fillExactRemainder: () => void;
  groupCurrency: string;
  members: UserProfile[];
  originalAmount: number;
  owedPreview: Record<string, number>;
  participantIds: string[];
  participantValues: Record<string, number>;
  setParticipantValue: (userId: string, raw: string | number) => void;
  splitType: SplitType;
  toggleAll: () => void;
  toggleParticipant: (userId: string) => void;
  validationErrors: SplitValidationError[];
}

export function ExpenseSplitSection({
  allSelected,
  changeSplit,
  errors,
  fillExactRemainder,
  groupCurrency,
  members,
  originalAmount,
  owedPreview,
  participantIds,
  participantValues,
  setParticipantValue,
  splitType,
  toggleAll,
  toggleParticipant,
  validationErrors,
}: ExpenseSplitSectionProps) {
  const { t } = useTranslation();
  return (
    <Section compact title={t('3. How is it split?')}>
      <div
        role="group"
        aria-label={t('Split method')}
        className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1"
      >
        {SPLIT_TYPES.map((type) => (
          <Button
            key={type}
            className="h-auto min-h-10 min-w-0 whitespace-normal px-1 text-xs sm:text-sm"
            type="button"
            variant={type === splitType ? 'default' : 'ghost'}
            aria-label={t(type)}
            aria-pressed={type === splitType}
            onClick={() => changeSplit(type)}
          >
            {type === 'percentage' ? '%' : t(type)}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={toggleAll}>
          {allSelected ? t('Clear selection') : t('Select everyone')}
        </Button>
        {splitType === 'exact' && (
          <Button
            type="button"
            variant="ghost"
            disabled={!participantIds.length}
            onClick={fillExactRemainder}
          >
            {t('Fill last share with remainder')}
          </Button>
        )}
      </div>
      <div className="divide-y">
        {members.map(({ id, displayName }) => {
          const selected = participantIds.includes(id);
          return (
            <div className="flex items-center gap-3 py-2" key={id}>
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="size-4 shrink-0 accent-primary"
                  checked={selected}
                  onChange={() => toggleParticipant(id)}
                />
                <span className="truncate">{displayName}</span>
              </label>
              {selected && splitType !== 'equal' ? (
                <div className="flex w-32 shrink-0 items-center gap-1">
                  <Input
                    aria-label={t('{{name}}: {{method}}', {
                      name: displayName,
                      method: t(splitType),
                    })}
                    type="number"
                    inputMode="decimal"
                    min={splitType === 'shares' ? 1 : 0}
                    step={
                      splitType === 'shares'
                        ? 1
                        : splitType === 'percentage'
                          ? 0.0001
                          : 0.01
                    }
                    value={
                      participantValues[id] ?? (splitType === 'shares' ? 1 : 0)
                    }
                    onChange={(event) =>
                      setParticipantValue(id, event.target.value)
                    }
                  />
                  {splitType === 'percentage' && <span>%</span>}
                </div>
              ) : selected ? (
                <span className="text-sm tabular-nums text-muted-foreground">
                  {formatMoney(owedPreview[id] || 0, groupCurrency)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {!!validationErrors.length && originalAmount > 0 && (
        <Message error>
          {validationErrors
            .map(({ message }) => translateError(message))
            .join(' ')}
        </Message>
      )}
      {errors.splitType && <Message error>{errors.splitType.message}</Message>}
    </Section>
  );
}
