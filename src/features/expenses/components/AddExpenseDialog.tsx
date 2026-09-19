import { Plus, X, Check, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { Field, CurrencySelect, Section, Message } from '@/components/ui/field'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNotify } from '@/hooks/useNotify'
import type { Group } from '@/types/group'
import type { UserProfile } from '@/types/user'
import type {
  Expense,
  ParticipantShare,
  PayerContribution,
  SplitType,
} from '@/types/expense'
import { DEFAULT_BASE_CURRENCY } from '@/config/currencies'
import { useCurrentUser } from '@/hooks/useGroups'
import { useExpenseStore } from '@/stores/expenseStore'
import { formatMoney, roundMoney, safeSum } from '@/utils/currency'
import { nowIso, toIsoDate } from '@/utils/dates'
import {
  autoDistributePaidBy,
  autoFillExactRemainder,
  buildParticipants,
  computeEqualShares,
  computeNetBalances,
  resolveOwedPerUser,
  validateSplit,
} from '@/utils/split'
import { getExchangeRate } from '@/api/rates'

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  expenseDate: z.string().min(1, 'Date is required'),
  originalCurrency: z.string().min(3, 'Currency is required').max(3),
  originalAmount: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .positive('Amount must be positive')
    .finite('Amount must be a valid number')
    .max(999999999, 'Amount is too large'),
  splitType: z.enum(['equal', 'exact', 'percentage', 'shares']),
  participantIds: z.array(z.string()).min(1, 'Select at least one participant'),
  participantValues: z.record(z.string(), z.coerce.number()),
  paidBy: z
    .array(
      z.object({
        userId: z.string().min(1),
        amount: z.coerce.number().finite().gte(0),
      }),
    )
    .min(1, 'At least one person must pay'),
})

type FormValues = z.infer<typeof schema>

interface RateState {
  key: string
  loading: boolean
  rate: number | null
  date: string | null
  source: string | null
  error: string | null
}

export default function AddExpenseDialog({
  open,
  onClose,
  group,
  members,
  editingExpense,
  preview = false,
}: {
  open: boolean
  onClose: () => void
  group: Group
  members: UserProfile[]
  editingExpense?: Expense | null
  preview?: boolean
}) {
  const isEdit = Boolean(editingExpense)
  const me = useCurrentUser()
  const { enqueueSnackbar } = useNotify()
  const addExpense = useExpenseStore((s) => s.addExpense)
  const updateExpense = useExpenseStore((s) => s.updateExpense)

  const defaultCurrency = group.baseCurrency || DEFAULT_BASE_CURRENCY
  const defaultPayerId = me?.id || members[0]?.id || ''
  const defaultParticipantIds = useMemo(
    () => members.map((m) => m.id),
    [members],
  )
  const memberById = useMemo(() => {
    const m = new Map<string, UserProfile>()
    members.forEach((x) => m.set(x.id, x))
    return m
  }, [members])

  const makeDefaults = useCallback((): FormValues => {
    if (editingExpense) {
      const participantValues: Record<string, number> = {}
      editingExpense.participants.forEach((p) => {
        participantValues[p.userId] = p.value
      })
      return {
        title: editingExpense.title,
        description: editingExpense.description ?? '',
        expenseDate: editingExpense.expenseDate.slice(0, 10),
        originalCurrency: editingExpense.originalCurrency,
        originalAmount: editingExpense.originalAmount as unknown as number,
        splitType: editingExpense.splitType,
        participantIds: editingExpense.participants.map((p) => p.userId),
        participantValues,
        paidBy: editingExpense.paidBy.map((p) => ({
          userId: p.userId,
          amount: p.amount as unknown as number,
        })),
      }
    }
    return {
      title: '',
      description: '',
      expenseDate: nowIso().slice(0, 10),
      originalCurrency: defaultCurrency,
      originalAmount: 0 as unknown as number,
      splitType: 'equal',
      participantIds: defaultParticipantIds,
      participantValues: {},
      paidBy: [
        {
          userId: defaultPayerId,
          amount: 0 as unknown as number,
        },
      ],
    }
  }, [editingExpense, defaultCurrency, defaultParticipantIds, defaultPayerId])

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
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: makeDefaults(),
    mode: 'onChange',
  })

  const originalAmount = Number(
    useWatch({ control, name: 'originalAmount' }) || 0,
  )
  const originalCurrency =
    useWatch({ control, name: 'originalCurrency' }) || defaultCurrency
  const splitType = useWatch({ control, name: 'splitType' }) || 'equal'
  const paidBy = useWatch({ control, name: 'paidBy' })
  const participantIds = useWatch({ control, name: 'participantIds' })
  const participantValues = useWatch({ control, name: 'participantValues' })
  const expenseDate = useWatch({ control, name: 'expenseDate' })

  const currencyMismatch =
    originalCurrency.toUpperCase() !== group.baseCurrency.toUpperCase()

  const rateRequestKey = `${originalCurrency.toUpperCase()}:${group.baseCurrency.toUpperCase()}:${expenseDate}`
  const [storedRateState, setRateState] = useState<RateState>({
    key: '',
    loading: false,
    rate: null,
    date: null,
    source: null,
    error: null,
  })

  const savedSnapshot =
    editingExpense &&
    editingExpense.originalCurrency === originalCurrency.toUpperCase() &&
    editingExpense.groupCurrency === group.baseCurrency.toUpperCase() &&
    editingExpense.expenseDate.slice(0, 10) === expenseDate.slice(0, 10)
      ? editingExpense.rateSnapshot
      : undefined
  const rateState: RateState = !currencyMismatch
    ? {
        key: rateRequestKey,
        loading: false,
        rate: 1,
        date: expenseDate,
        source: 'identity',
        error: null,
      }
    : savedSnapshot
      ? { key: rateRequestKey, loading: false, error: null, ...savedSnapshot }
      : storedRateState.key === rateRequestKey
        ? storedRateState
        : {
            key: rateRequestKey,
            loading: true,
            rate: null,
            date: null,
            source: null,
            error: null,
          }

  useEffect(() => {
    if (!open) return
    reset(makeDefaults())
    clearErrors()
  }, [open, makeDefaults, clearErrors, reset])

  useEffect(() => {
    if (!open) return
    if (!currencyMismatch || savedSnapshot) return
    let cancelled = false
    void (async () => {
      try {
        const result = await getExchangeRate(
          originalCurrency.toUpperCase(),
          group.baseCurrency.toUpperCase(),
          expenseDate,
        )
        if (cancelled) return
        setRateState({
          key: rateRequestKey,
          loading: false,
          rate: result.rate,
          date: result.date,
          source: result.source,
          error: null,
        })
      } catch (err) {
        if (cancelled) return
        const msg =
          err instanceof Error ? err.message : 'Failed to fetch FX rate'
        setRateState({
          key: rateRequestKey,
          loading: false,
          rate: null,
          date: null,
          source: null,
          error: msg,
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    open,
    currencyMismatch,
    originalCurrency,
    group.baseCurrency,
    expenseDate,
    savedSnapshot,
    rateRequestKey,
  ])

  useEffect(() => {
    if (!open) return
    const memberIds = new Set(members.map((m) => m.id))
    const currentPaidBy = getValues('paidBy')
    const pruned = currentPaidBy.filter((p) => memberIds.has(p.userId))
    if (pruned.length !== currentPaidBy.length || pruned.length === 0) {
      const next = pruned.length
        ? pruned
        : [
            {
              userId: defaultPayerId,
              amount: getValues('originalAmount') as unknown as number,
            },
          ]
      setValue('paidBy', next, { shouldValidate: true })
    }
    const currentIds = getValues('participantIds')
    const kept = currentIds.filter((uid) => memberIds.has(uid))
    if (kept.length !== currentIds.length) {
      setValue('participantIds', kept.length ? kept : defaultParticipantIds, {
        shouldValidate: true,
      })
    }
  }, [
    members,
    open,
    getValues,
    setValue,
    defaultPayerId,
    defaultParticipantIds,
  ])

  useEffect(() => {
    if (!open) return
    if (paidBy.length === 0) return
    const sum = safeSum(paidBy.map((p) => p.amount))
    if (originalAmount > 0 && sum === 0) {
      setValue(
        'paidBy',
        paidBy.map((p, i) =>
          i === 0 ? { ...p, amount: originalAmount as unknown as number } : p,
        ),
        { shouldValidate: true },
      )
    }
  }, [originalAmount, paidBy, open, setValue])

  const convertedAmount = rateState.rate
    ? roundMoney(originalAmount * rateState.rate)
    : 0

  const participants: ParticipantShare[] = useMemo(
    () => buildParticipants(splitType, participantIds, participantValues),
    [splitType, participantIds, participantValues],
  )

  const owedPreview = useMemo<Record<string, number>>(() => {
    if (!rateState.rate || !participants.length) return {}
    return resolveOwedPerUser(convertedAmount, participants, splitType)
  }, [convertedAmount, participants, splitType, rateState.rate])

  const previewNetBalances = useMemo<Record<string, number>>(() => {
    if (!rateState.rate || !participants.length || !paidBy.length) return {}
    const originalCur = originalCurrency.toUpperCase()
    const groupCur = group.baseCurrency.toUpperCase()
    const needRate = originalCur !== groupCur
    const syntheticExpense: Expense = {
      id: '__preview__',
      groupId: group.id,
      title: '',
      originalAmount,
      originalCurrency: originalCur,
      convertedAmount,
      groupCurrency: groupCur,
      rateSnapshot:
        needRate && rateState.rate
          ? {
              date: rateState.date || expenseDate,
              rate: rateState.rate,
              source: rateState.source || 'frankfurter',
            }
          : undefined,
      paidBy,
      participants,
      splitType,
      expenseDate: toIsoDate(expenseDate),
      createdBy: me?.id || '',
      updatedBy: me?.id || '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    return computeNetBalances(syntheticExpense)
  }, [
    rateState.rate,
    rateState.date,
    rateState.source,
    participants,
    paidBy,
    originalCurrency,
    group.baseCurrency,
    originalAmount,
    convertedAmount,
    splitType,
    expenseDate,
    group.id,
    me?.id,
  ])

  const liveValidationErrors = useMemo(() => {
    return validateSplit({
      originalAmount,
      participants,
      paidBy,
      splitType,
    })
  }, [originalAmount, participants, paidBy, splitType])

  const paidSum = safeSum(paidBy.map((p) => p.amount))
  const paidRemaining = roundMoney(originalAmount - paidSum)

  const canSubmit =
    !isSubmitting &&
    (rateState.rate != null || !currencyMismatch) &&
    !rateState.loading &&
    !rateState.error &&
    liveValidationErrors.length === 0

  const submitValidation = (values: FormValues) => {
    const errs = validateSplit({
      originalAmount: Number(values.originalAmount),
      participants: buildParticipants(
        values.splitType,
        values.participantIds,
        values.participantValues,
      ),
      paidBy: values.paidBy.map((p) => ({ ...p, amount: Number(p.amount) })),
      splitType: values.splitType,
    })
    if (errs.length) {
      errs.forEach((e) => {
        if (e.field === 'originalAmount') {
          setError('originalAmount', { message: e.message })
        } else if (e.field === 'participants') {
          setError('participantIds', { message: e.message })
        } else if (e.field === 'paidBy') {
          setError('paidBy', { message: e.message })
        } else if (e.field === 'paidBy.sum') {
          setError('paidBy', { message: e.message })
        } else if (e.field.startsWith('split')) {
          setError('splitType', { message: e.message })
        }
      })
      return false
    }
    return true
  }

  const onSubmit = async (values: FormValues) => {
    if (import.meta.env.DEV && preview) {
      if (submitValidation(values))
        enqueueSnackbar('Preview validated. No expense was saved.', {
          variant: 'success',
        })
      return
    }
    if (!me) {
      enqueueSnackbar('You must be signed in', { variant: 'error' })
      return
    }
    if (rateState.loading || rateState.error || rateState.rate == null) {
      enqueueSnackbar('A valid FX rate is required for currency conversion', {
        variant: 'error',
      })
      return
    }
    if (!submitValidation(values)) return
    const participantsFinal = buildParticipants(
      values.splitType,
      values.participantIds,
      values.participantValues,
    )
    const paidByFinal: PayerContribution[] = values.paidBy.map((p) => ({
      userId: p.userId,
      amount: Number(p.amount),
    }))
    const originalCur = values.originalCurrency.toUpperCase()
    const groupCur = group.baseCurrency.toUpperCase()
    const sameCurrency = originalCur === groupCur
    try {
      if (isEdit && editingExpense) {
        await updateExpense(group.id, editingExpense.id, {
          title: values.title,
          description: values.description,
          originalAmount: Number(values.originalAmount),
          originalCurrency: originalCur,
          convertedAmount: sameCurrency
            ? Number(values.originalAmount)
            : roundMoney(Number(values.originalAmount) * rateState.rate),
          groupCurrency: groupCur,
          rateSnapshot: sameCurrency
            ? undefined
            : {
                date: rateState.date || values.expenseDate,
                rate: rateState.rate,
                source: rateState.source || 'frankfurter',
              },
          paidBy: paidByFinal,
          participants: participantsFinal,
          splitType: values.splitType,
          expenseDate: toIsoDate(values.expenseDate),
          updatedBy: me.id,
        })
        enqueueSnackbar('Expense updated', { variant: 'success' })
      } else {
        await addExpense(group.id, {
          groupId: group.id,
          title: values.title,
          description: values.description,
          originalAmount: Number(values.originalAmount),
          originalCurrency: originalCur,
          convertedAmount: sameCurrency
            ? Number(values.originalAmount)
            : roundMoney(Number(values.originalAmount) * rateState.rate),
          groupCurrency: groupCur,
          rateSnapshot: sameCurrency
            ? undefined
            : {
                date: rateState.date || values.expenseDate,
                rate: rateState.rate,
                source: rateState.source || 'frankfurter',
              },
          paidBy: paidByFinal,
          participants: participantsFinal,
          splitType: values.splitType,
          expenseDate: toIsoDate(values.expenseDate),
          createdBy: me.id,
        })
        enqueueSnackbar('Expense added', { variant: 'success' })
      }
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save expense'
      enqueueSnackbar(msg, { variant: 'error' })
    }
  }

  const toggleParticipant = (userId: string) => {
    const current = participantIds
    const isIn = current.includes(userId)
    const next = isIn
      ? current.filter((id) => id !== userId)
      : [...current, userId]
    setValue('participantIds', next, { shouldValidate: true })
    if (!isIn && splitType !== 'equal' && participantValues[userId] == null) {
      if (splitType === 'percentage') {
        const freshN = next.length
        if (freshN) {
          const freshValues = computeEqualShares(0, next).reduce<
            Record<string, number>
          >((acc, p) => {
            acc[p.userId] = roundMoney(100 / freshN, 4)
            return acc
          }, {})
          const sum = safeSum(Object.values(freshValues))
          const diff = roundMoney(100 - sum, 4)
          if (Math.abs(diff) > 0 && next.length) {
            freshValues[next[next.length - 1]] = roundMoney(
              (freshValues[next[next.length - 1]] ?? 0) + diff,
              4,
            )
          }
          setValue(
            'participantValues',
            { ...participantValues, ...freshValues },
            {
              shouldValidate: true,
            },
          )
        }
      }
    }
  }

  const setParticipantValue = (userId: string, raw: string | number) => {
    const next = { ...participantValues, [userId]: Number(raw) || 0 }
    setValue('participantValues', next, { shouldValidate: true })
  }

  const allIn = participantIds.length === members.length && members.length > 0
  const toggleAll = () => {
    const next = allIn ? [] : members.map((m) => m.id)
    setValue('participantIds', next, { shouldValidate: true })
  }

  const applySinglePayer = (userId: string) => {
    setValue(
      'paidBy',
      [{ userId, amount: originalAmount as unknown as number }],
      { shouldValidate: true },
    )
  }

  const applyEvenPaidBy = () => {
    if (!participantIds.length) return
    setValue(
      'paidBy',
      autoDistributePaidBy(originalAmount, participantIds).map((p) => ({
        ...p,
        amount: p.amount as unknown as number,
      })),
      { shouldValidate: true },
    )
  }

  const addPayer = (userId: string) => {
    if (paidBy.some((p) => p.userId === userId)) return
    setValue(
      'paidBy',
      [...paidBy, { userId, amount: 0 as unknown as number }],
      { shouldValidate: true },
    )
  }

  const removePayer = (userId: string) => {
    if (paidBy.length <= 1) return
    setValue(
      'paidBy',
      paidBy.filter((p) => p.userId !== userId),
      { shouldValidate: true },
    )
  }

  const updatePayerAmount = (userId: string, raw: string | number) => {
    const next = paidBy.map((p) =>
      p.userId === userId
        ? { ...p, amount: (Number(raw) || 0) as unknown as number }
        : p,
    )
    setValue('paidBy', next, { shouldValidate: true })
  }

  const payerSet = useMemo(() => new Set(paidBy.map((p) => p.userId)), [paidBy])

  const changeSplit = (type: SplitType) => {
    setValue('splitType', type, { shouldValidate: true })
    const defaults = buildParticipants(type, participantIds, {})
    setValue(
      'participantValues',
      Object.fromEntries(defaults.map((p) => [p.userId, p.value])),
      { shouldValidate: true },
    )
  }
  const fillExactRemainder = () => {
    const adjusted = autoFillExactRemainder(
      originalAmount,
      participants,
      participantIds,
    )
    setValue(
      'participantValues',
      Object.fromEntries(adjusted.map((p) => [p.userId, p.value])),
      { shouldValidate: true },
    )
  }
  const nameOf = (id: string) =>
    memberById.get(id)?.displayName || id.slice(0, 6)
  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={isSubmitting}
      wide
      title={isEdit ? 'Edit expense' : 'Add expense'}
      description={`Record a shared expense in ${group.name}.`}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-busy={isSubmitting}
        className="space-y-5"
      >
        <fieldset disabled={isSubmitting} className="space-y-5">
          <Section title="1. The details">
            <Field
              label="Title"
              placeholder="e.g. Dinner with friends"
              {...register('title')}
              error={errors.title?.message}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                {...register('originalAmount')}
                error={errors.originalAmount?.message}
              />
              <CurrencySelect {...register('originalCurrency')} />
            </div>
            <Field
              label="Date"
              type="date"
              {...register('expenseDate')}
              error={errors.expenseDate?.message}
            />
            <div className="space-y-2">
              <Label htmlFor="expense-notes">Notes (optional)</Label>
              <Textarea
                id="expense-notes"
                placeholder="Anything useful to remember"
                {...register('description')}
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>
            {currencyMismatch && (
              <Message error={!!rateState.error}>
                {rateState.loading
                  ? 'Looking up the exchange rate...'
                  : rateState.error ||
                    `1 ${originalCurrency} = ${rateState.rate} ${group.baseCurrency} · ${rateState.date}. Converted total: ${formatMoney(convertedAmount, group.baseCurrency)}`}
              </Message>
            )}
          </Section>
          <Section
            title="2. Who paid?"
            description={`Enter contributions in ${originalCurrency}.`}
          >
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => applySinglePayer(defaultPayerId)}
              >
                I paid
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!participantIds.length}
                onClick={applyEvenPaidBy}
              >
                Split payments evenly
              </Button>
            </div>
            <div className="space-y-3">
              {paidBy.map((payer) => (
                <div key={payer.userId} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field
                      label={`Paid by ${nameOf(payer.userId)}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={payer.amount}
                      onChange={(e) =>
                        updatePayerAmount(payer.userId, e.target.value)
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={paidBy.length <= 1}
                    aria-label={`Remove payer ${nameOf(payer.userId)}`}
                    onClick={() => removePayer(payer.userId)}
                  >
                    <X />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {members
                .filter((m) => !payerSet.has(m.id))
                .map((m) => (
                  <Button
                    type="button"
                    key={m.id}
                    variant="secondary"
                    onClick={() => addPayer(m.id)}
                  >
                    <Plus />
                    {m.displayName}
                  </Button>
                ))}
            </div>
            <p
              className={`text-sm tabular-nums ${Math.abs(paidRemaining) < 0.005 ? 'text-positive' : 'text-destructive'}`}
            >
              Paid {formatMoney(paidSum, originalCurrency)} · Remaining{' '}
              {formatMoney(paidRemaining, originalCurrency)}
            </p>
          </Section>
          <Section title="3. How is it split?">
            <div
              role="group"
              aria-label="Split method"
              className="flex flex-wrap gap-2"
            >
              {(['equal', 'exact', 'percentage', 'shares'] as SplitType[]).map(
                (type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={type === splitType ? 'default' : 'outline'}
                    aria-pressed={type === splitType}
                    onClick={() => changeSplit(type)}
                  >
                    {type === 'percentage'
                      ? 'Percentage'
                      : type[0].toUpperCase() + type.slice(1)}
                  </Button>
                ),
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={toggleAll}>
                {allIn ? 'Clear selection' : 'Select everyone'}
              </Button>
              {splitType === 'exact' && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!participantIds.length}
                  onClick={fillExactRemainder}
                >
                  Fill last share with remainder
                </Button>
              )}
            </div>
            <div className="divide-y">
              {members.map((member) => {
                const selected = participantIds.includes(member.id)
                return (
                  <div className="flex items-center gap-3 py-3" key={member.id}>
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 accent-primary"
                        checked={selected}
                        onChange={() => toggleParticipant(member.id)}
                      />
                      <span className="truncate">{member.displayName}</span>
                    </label>
                    {selected && splitType !== 'equal' ? (
                      <div className="flex w-32 shrink-0 items-center gap-1">
                        <Input
                          aria-label={`${member.displayName} ${splitType} share`}
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
                            participantValues[member.id] ??
                            (splitType === 'shares' ? 1 : 0)
                          }
                          onChange={(e) =>
                            setParticipantValue(member.id, e.target.value)
                          }
                        />
                        {splitType === 'percentage' && <span>%</span>}
                      </div>
                    ) : (
                      selected && (
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatMoney(
                            owedPreview[member.id] || 0,
                            group.baseCurrency,
                          )}
                        </span>
                      )
                    )}
                  </div>
                )
              })}
            </div>
            {!!liveValidationErrors.length && originalAmount > 0 && (
              <Message error>
                {liveValidationErrors.map((e) => e.message).join(' ')}
              </Message>
            )}
            {errors.splitType && (
              <Message error>{errors.splitType.message}</Message>
            )}
          </Section>
          <Section
            title="Review"
            description={`Amounts below are in ${group.baseCurrency}.`}
          >
            <div className="flex justify-between text-lg font-semibold tabular-nums">
              <span>Total</span>
              <span>{formatMoney(convertedAmount, group.baseCurrency)}</span>
            </div>
            {!liveValidationErrors.length &&
            rateState.rate &&
            !rateState.error ? (
              <div className="divide-y">
                {Object.entries(previewNetBalances).map(([id, net]) => (
                  <div
                    key={id}
                    className="flex justify-between gap-3 py-2 text-sm"
                  >
                    <span>{nameOf(id)}</span>
                    <span
                      className={`text-right tabular-nums ${net > 0 ? 'text-positive' : net < 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                    >
                      {Math.abs(net) < 0.005
                        ? 'No balance'
                        : `${net > 0 ? 'Gets back' : 'Owes'} ${formatMoney(Math.abs(net), group.baseCurrency)}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete the amounts and split to preview each person's balance.
              </p>
            )}
          </Section>
        </fieldset>
        <div className="sticky -bottom-6 -mx-6 -mb-6 flex justify-end gap-2 border-t bg-popover p-4">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Check />
            )}
            {isSubmitting
              ? 'Saving...'
              : isEdit
                ? 'Save changes'
                : 'Add expense'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
