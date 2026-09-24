import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { CurrencySelect, Field, Message, Section } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
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
    <Section title={t('1. The details')}>
      <Field
        label={t('Title')}
        placeholder={t('e.g. Dinner with friends')}
        {...register('title')}
        error={errors.title?.message}
      />
      <div className="grid gap-4 sm:grid-cols-2">
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
      <Field
        label={t('Date')}
        type="date"
        {...register('expenseDate')}
        error={errors.expenseDate?.message}
      />
      <div className="space-y-2">
        <Label htmlFor="expense-type">{t('Type (optional)')}</Label>
        <NativeSelect
          id="expense-type"
          className="w-full"
          {...register('type')}
          aria-invalid={!!errors.type}
        >
          <NativeSelectOption value="">{t('No type')}</NativeSelectOption>
          {EXPENSE_TYPES.map((type) => (
            <NativeSelectOption key={type} value={type}>
              {t(EXPENSE_TYPE_DETAILS[type].label)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
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
