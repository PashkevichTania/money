import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { CurrencySelect, Field, Message, Section } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EXPENSE_TYPE_DETAILS } from '@/config/expenseTypes';
import type { ExpenseFormValues } from '@/features/expenses/expenseForm';
import type { ExpenseRateState } from '@/features/expenses/hooks/useExpenseExchangeRate';
import { EXPENSE_TYPES } from '@/types/expense';
import { formatMoney } from '@/utils/currency';
import { formatDate } from '@/utils/dates';

interface ExpenseDetailsSectionProps {
  control: Control<ExpenseFormValues>;
  convertedAmount: number;
  currencyMismatch: boolean;
  errors: FieldErrors<ExpenseFormValues>;
  groupCurrency: string;
  originalCurrency: string;
  rateState: ExpenseRateState;
  register: UseFormRegister<ExpenseFormValues>;
}

export function ExpenseDetailsSection({
  control,
  convertedAmount,
  currencyMismatch,
  errors,
  groupCurrency,
  originalCurrency,
  rateState,
  register,
}: ExpenseDetailsSectionProps) {
  const { t, i18n } = useTranslation();
  return (
    <Section compact title={t('1. The details')}>
      <Field
        label={t('Title')}
        placeholder={t('e.g. Dinner with friends')}
        {...register('title')}
        error={errors.title?.message}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
        <Field
          label={t('Amount')}
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          {...register('originalAmount')}
          error={errors.originalAmount?.message}
        />
        <Controller
          control={control}
          name="originalCurrency"
          render={({ field }) => (
            <CurrencySelect
              value={field.value}
              name={field.name}
              onBlur={field.onBlur}
              onValueChange={field.onChange}
            />
          )}
        />
      </div>
      {errors.type && <Message error>{errors.type.message}</Message>}
      <details
        className="group rounded-md border bg-muted/20 p-3"
        open={errors.expenseDate || errors.description ? true : undefined}
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          {t('More details')}
          <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
            {t('Date and notes')}
          </span>
          <ChevronDown className="ml-auto size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field
            label={t('Date')}
            type="date"
            {...register('expenseDate')}
            error={errors.expenseDate?.message}
          />
          <div className="space-y-2">
            <Label htmlFor="expense-notes">{t('Notes (optional)')}</Label>
            <Textarea
              id="expense-notes"
              placeholder={t('Anything useful to remember')}
              {...register('description')}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {t(errors.description.message || '')}
              </p>
            )}
          </div>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div
                role="group"
                aria-label={t('Type (optional)')}
                className="flex flex-wrap gap-2"
              >
                {EXPENSE_TYPES.map((type) => {
                  const { Icon, label } = EXPENSE_TYPE_DETAILS[type];
                  return (
                    <Button
                      key={type}
                      type="button"
                      size="sm"
                      className="rounded-full"
                      variant={field.value === type ? 'default' : 'outline'}
                      aria-pressed={field.value === type}
                      onClick={() =>
                        field.onChange(field.value === type ? '' : type)
                      }
                    >
                      <Icon />
                      {t(label)}
                    </Button>
                  );
                })}
              </div>
            )}
          />
        </div>
      </details>
      {currencyMismatch && (
        <Message error={!!rateState.error}>
          {rateState.loading
            ? t('Looking up the exchange rate...')
            : rateState.error ||
              t(
                '1 {{from}} = {{rate}} {{to}} · {{date}}. Converted total: {{amount}}',
                {
                  from: originalCurrency,
                  rate: new Intl.NumberFormat(i18n.resolvedLanguage, {
                    maximumFractionDigits: 6,
                  }).format(rateState.rate || 0),
                  to: groupCurrency,
                  date: rateState.date ? formatDate(rateState.date) : '',
                  amount: formatMoney(convertedAmount, groupCurrency),
                }
              )}
        </Message>
      )}
    </Section>
  );
}
