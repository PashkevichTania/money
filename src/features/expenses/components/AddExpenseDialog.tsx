import { zodResolver } from '@hookform/resolvers/zod';
import { Check, LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { DEFAULT_BASE_CURRENCY } from '@/config/currencies';
import {
  buildExpenseDefaults,
  type ExpenseFormValues,
  expenseSchema,
} from '@/features/expenses/expenseForm';
import { useExpenseExchangeRate } from '@/features/expenses/hooks/useExpenseExchangeRate';
import { useExpenseParticipants } from '@/features/expenses/hooks/useExpenseParticipants';
import { useExpensePreview } from '@/features/expenses/hooks/useExpensePreview';
import { useExpenseSubmit } from '@/features/expenses/hooks/useExpenseSubmit';
import { useCurrentUser } from '@/hooks/useGroups';
import type { Expense } from '@/types/expense';
import type { Group } from '@/types/group';
import type { UserProfile } from '@/types/user';

import { ExpenseDetailsSection } from './ExpenseDetailsSection';
import { ExpensePayersSection } from './ExpensePayersSection';
import { ExpenseReviewSection } from './ExpenseReviewSection';
import { ExpenseSplitSection } from './ExpenseSplitSection';

export default function AddExpenseDialog({
  open,
  onClose,
  group,
  members,
  editingExpense,
  preview = false,
}: {
  open: boolean;
  onClose: () => void;
  group: Group;
  members: UserProfile[];
  editingExpense?: Expense | null;
  preview?: boolean;
}) {
  const { t } = useTranslation();
  const isEdit = Boolean(editingExpense);
  const me = useCurrentUser();

  const defaultCurrency = group.baseCurrency || DEFAULT_BASE_CURRENCY;
  const defaultPayerId = me?.id || members[0]?.id || '';
  const defaultParticipantIds = useMemo(
    () => members.map((m) => m.id),
    [members]
  );
  const memberById = useMemo(() => {
    const m = new Map<string, UserProfile>();
    members.forEach((x) => m.set(x.id, x));
    return m;
  }, [members]);

  const makeDefaults = useCallback(
    () =>
      buildExpenseDefaults({
        currency: defaultCurrency,
        editingExpense,
        participantIds: defaultParticipantIds,
        payerId: defaultPayerId,
      }),
    [defaultCurrency, defaultParticipantIds, defaultPayerId, editingExpense]
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
    clearErrors,
    setError,
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: makeDefaults(),
    mode: 'onChange',
  });

  const originalAmount = Number(
    useWatch({ control, name: 'originalAmount' }) || 0
  );
  const originalCurrency =
    useWatch({ control, name: 'originalCurrency' }) || defaultCurrency;
  const splitType = useWatch({ control, name: 'splitType' }) || 'equal';
  const paidBy = useWatch({ control, name: 'paidBy' });
  const participantIds = useWatch({ control, name: 'participantIds' });
  const participantValues = useWatch({ control, name: 'participantValues' });
  const expenseDate = useWatch({ control, name: 'expenseDate' });

  const { currencyMismatch, rateState } = useExpenseExchangeRate({
    enabled: open,
    expenseDate,
    groupCurrency: group.baseCurrency,
    originalCurrency,
    editingExpense,
  });

  useEffect(() => {
    if (!open) return;
    reset(makeDefaults());
    clearErrors();
  }, [open, makeDefaults, clearErrors, reset]);

  const {
    convertedAmount,
    owedPreview,
    participants,
    previewNetBalances,
    validationErrors: liveValidationErrors,
  } = useExpensePreview({
    expenseDate,
    groupCurrency: group.baseCurrency,
    groupId: group.id,
    originalAmount,
    originalCurrency,
    paidBy,
    participantIds,
    participantValues,
    rateState,
    splitType,
    userId: me?.id,
  });

  const { submitExpense } = useExpenseSubmit({
    editingExpense,
    group,
    onClose,
    preview,
    rateState,
    setError,
    user: me,
  });

  const {
    addPayer,
    allSelected: allIn,
    applyEvenPaidBy,
    applySinglePayer,
    changeSplit,
    fillExactRemainder,
    paidRemaining,
    paidSum,
    payerIds: payerSet,
    removePayer,
    setParticipantValue,
    toggleAll,
    toggleParticipant,
    updatePayerAmount,
  } = useExpenseParticipants({
    defaultParticipantIds,
    defaultPayerId,
    getValues,
    members,
    open,
    originalAmount,
    paidBy,
    participantIds,
    participantValues,
    participants,
    setValue,
    splitType,
  });

  const canSubmit =
    !isSubmitting &&
    (rateState.rate != null || !currencyMismatch) &&
    !rateState.loading &&
    !rateState.error &&
    liveValidationErrors.length === 0;

  const nameOf = (id: string) =>
    memberById.get(id)?.displayName || id.slice(0, 6);
  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={isSubmitting}
      wide
      title={isEdit ? t('Edit expense') : t('Add expense')}
      description={t('Record a shared expense in {{group}}.', {
        group: group.name,
      })}
    >
      <form
        onSubmit={handleSubmit(submitExpense)}
        noValidate
        aria-busy={isSubmitting}
        className="space-y-5"
      >
        <fieldset disabled={isSubmitting} className="space-y-5">
          <ExpenseDetailsSection
            control={control}
            convertedAmount={convertedAmount}
            currencyMismatch={currencyMismatch}
            errors={errors}
            groupCurrency={group.baseCurrency}
            originalCurrency={originalCurrency}
            rateState={rateState}
            register={register}
          />
          <ExpensePayersSection
            addPayer={addPayer}
            applyEvenPaidBy={applyEvenPaidBy}
            applySinglePayer={applySinglePayer}
            currency={originalCurrency}
            defaultPayerId={defaultPayerId}
            members={members}
            nameOf={nameOf}
            paidBy={paidBy}
            paidRemaining={paidRemaining}
            paidSum={paidSum}
            participantIds={participantIds}
            payerIds={payerSet}
            removePayer={removePayer}
            updatePayerAmount={updatePayerAmount}
          />
          <ExpenseSplitSection
            allSelected={allIn}
            changeSplit={changeSplit}
            errors={errors}
            fillExactRemainder={fillExactRemainder}
            groupCurrency={group.baseCurrency}
            members={members}
            originalAmount={originalAmount}
            owedPreview={owedPreview}
            participantIds={participantIds}
            participantValues={participantValues}
            setParticipantValue={setParticipantValue}
            splitType={splitType}
            toggleAll={toggleAll}
            toggleParticipant={toggleParticipant}
            validationErrors={liveValidationErrors}
          />
          <ExpenseReviewSection
            convertedAmount={convertedAmount}
            groupCurrency={group.baseCurrency}
            nameOf={nameOf}
            previewNetBalances={previewNetBalances}
            rateState={rateState}
            validationErrors={liveValidationErrors}
          />
        </fieldset>
        <div className="sticky -bottom-6 -mx-6 -mb-6 flex justify-end gap-2 border-t bg-popover p-4">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
          >
            {t('Cancel')}
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Check />
            )}
            {isSubmitting
              ? t('Saving...')
              : isEdit
                ? t('Save changes')
                : t('Add expense')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
