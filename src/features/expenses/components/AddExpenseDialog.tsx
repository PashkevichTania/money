import { z } from 'zod'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormGroup from '@mui/material/FormGroup'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import { useSnackbar } from 'notistack'
import type { Group } from '@/types/group'
import type { UserProfile } from '@/types/user'
import type { Expense, ParticipantShare, PayerContribution, SplitType } from '@/types/expense'
import { CURRENCIES, DEFAULT_BASE_CURRENCY, getCurrencySymbol } from '@/config/currencies'
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

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

interface RateState {
  loading: boolean
  rate: number | null
  date: string | null
  source: string | null
  error: string | null
}

function useRateState(initial: RateState): [RateState, (u: RateState | ((p: RateState) => RateState)) => void] {
  const ref = useRef<RateState>(initial)
  const [, setTick] = useState(0)
  const set = (u: RateState | ((p: RateState) => RateState)) => {
    ref.current = typeof u === 'function' ? u(ref.current) : u
    setTick((n) => n + 1)
  }
  return [ref.current, set]
}

export default function AddExpenseDialog({
  open,
  onClose,
  group,
  members,
  editingExpense,
}: {
  open: boolean
  onClose: () => void
  group: Group
  members: UserProfile[]
  editingExpense?: Expense | null
}) {
  const isEdit = Boolean(editingExpense)
  const me = useCurrentUser()
  const { enqueueSnackbar } = useSnackbar()
  const addExpense = useExpenseStore((s) => s.addExpense)
  const updateExpense = useExpenseStore((s) => s.updateExpense)

  const defaultCurrency = group.baseCurrency || DEFAULT_BASE_CURRENCY
  const defaultPayerId = me?.id || members[0]?.id || ''
  const defaultParticipantIds = useMemo(() => members.map((m) => m.id), [members.length])
  const memberById = useMemo(() => {
    const m = new Map<string, UserProfile>()
    members.forEach((x) => m.set(x.id, x))
    return m
  }, [members])

  const makeDefaults = (): FormValues => {
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
  }

  const {
    register,
    handleSubmit,
    reset,
    watch,
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

  const originalAmount = Number(watch('originalAmount') || 0)
  const originalCurrency = watch('originalCurrency') || defaultCurrency
  const splitType = watch('splitType') || 'equal'
  const paidBy = watch('paidBy') || []
  const participantIds = watch('participantIds') || []
  const participantValues = watch('participantValues') || {}
  const expenseDate = watch('expenseDate')

  const currencyMismatch = originalCurrency.toUpperCase() !== group.baseCurrency.toUpperCase()

  const [rateState, setRateState] = useRateState({
    loading: false,
    rate: null,
    date: null,
    source: null,
    error: null,
  })

  useEffect(() => {
    if (!open) return
    reset(makeDefaults())
    clearErrors()
  }, [open, editingExpense])

  useEffect(() => {
    if (!open) return
    if (!currencyMismatch) {
      setRateState({
        loading: false,
        rate: 1,
        date: expenseDate || nowIso().slice(0, 10),
        source: 'identity',
        error: null,
      })
      return
    }
    let cancelled = false
    setRateState((s) => ({ ...s, loading: true, error: null }))
    void (async () => {
      try {
        const result = await getExchangeRate(
          originalCurrency.toUpperCase(),
          group.baseCurrency.toUpperCase(),
          expenseDate,
        )
        if (cancelled) return
        setRateState({
          loading: false,
          rate: result.rate,
          date: result.date,
          source: result.source,
          error: null,
        })
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Failed to fetch FX rate'
        setRateState({
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
  }, [open, currencyMismatch, originalCurrency, group.baseCurrency, expenseDate])

  useEffect(() => {
    if (!open) return
    const memberIds = new Set(members.map((m) => m.id))
    const currentPaidBy = getValues('paidBy')
    const pruned = currentPaidBy.filter((p) => memberIds.has(p.userId))
    if (pruned.length !== currentPaidBy.length || pruned.length === 0) {
      const next = pruned.length
        ? pruned
        : [{ userId: defaultPayerId, amount: getValues('originalAmount') as unknown as number }]
      setValue('paidBy', next, { shouldValidate: true })
    }
    const currentIds = getValues('participantIds')
    const kept = currentIds.filter((uid) => memberIds.has(uid))
    if (kept.length !== currentIds.length) {
      setValue('participantIds', kept.length ? kept : defaultParticipantIds, {
        shouldValidate: true,
      })
    }
  }, [members])

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
  }, [originalAmount, paidBy.length])

  const convertedAmount = rateState.rate ? roundMoney(originalAmount * rateState.rate) : 0

  const participants: ParticipantShare[] = useMemo(() => {
    const base = buildParticipants(splitType, participantIds, participantValues)
    if (splitType === 'exact') {
      return autoFillExactRemainder(originalAmount, base, participantIds)
    }
    return base
  }, [splitType, participantIds, participantValues, originalAmount])

  const owedPreview = useMemo<Record<string, number>>(() => {
    if (!rateState.rate || !participants.length) return {}
    return resolveOwedPerUser(convertedAmount, participants, splitType)
  }, [convertedAmount, participants, splitType, rateState.rate])

  const previewNetBalances = useMemo<Record<string, number>>(() => {
    if (!rateState.rate || !participants.length || !paidBy.length) return {}
    const originalCur = originalCurrency.toUpperCase()
    const groupCur = group.baseCurrency.toUpperCase()
    const needRate = originalCur !== groupCur
    const convertedPaidBy: PayerContribution[] = paidBy.map((p) => ({
      userId: p.userId,
      amount: needRate && rateState.rate ? roundMoney(p.amount * rateState.rate) : p.amount,
    }))
    const syntheticExpense: Expense = {
      id: '__preview__',
      groupId: group.id,
      title: '',
      originalAmount,
      originalCurrency: originalCur,
      convertedAmount,
      groupCurrency: groupCur,
      rateSnapshot: needRate && rateState.rate
        ? { date: rateState.date || expenseDate, rate: rateState.rate, source: rateState.source || 'frankfurter' }
        : undefined,
      paidBy: convertedPaidBy,
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

  const splitTypeError = liveValidationErrors.find(
    (e) => e.field === 'split.sum' || e.field === 'split.percentage' || e.field === 'split.shares',
  )
  const paidBySumError = liveValidationErrors.find((e) => e.field === 'paidBy.sum')
  const participantsError = liveValidationErrors.find((e) => e.field === 'participants')
  const paidByError = liveValidationErrors.find((e) => e.field === 'paidBy')
  const amountError = liveValidationErrors.find((e) => e.field === 'originalAmount')

  const paidSum = safeSum(paidBy.map((p) => p.amount))
  const paidRemaining = roundMoney(originalAmount - paidSum)

  const exactSum = safeSum(participantIds.map((uid) => roundMoney(Number(participantValues[uid]) || 0)))
  const pctSum = roundMoney(
    safeSum(participantIds.map((uid) => roundMoney(Number(participantValues[uid]) || 0, 4))),
    4,
  )
  const totalShares = safeSum(
    participantIds.map((uid) => {
      const raw = Number(participantValues[uid])
      return raw && Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 1
    }),
  )

  const canSubmit =
    !isSubmitting &&
    (rateState.rate != null || !currencyMismatch) &&
    !rateState.error &&
    liveValidationErrors.length === 0

  const submitValidation = (values: FormValues) => {
    const errs = validateSplit({
      originalAmount: Number(values.originalAmount),
      participants: buildParticipants(values.splitType, values.participantIds, values.participantValues),
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
    if (!me) {
      enqueueSnackbar('You must be signed in', { variant: 'error' })
      return
    }
    if (rateState.error || rateState.rate == null) {
      enqueueSnackbar('A valid FX rate is required for currency conversion', { variant: 'error' })
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
    const next = isIn ? current.filter((id) => id !== userId) : [...current, userId]
    setValue('participantIds', next, { shouldValidate: true })
    if (!isIn && splitType !== 'equal' && participantValues[userId] == null) {
      if (splitType === 'percentage') {
        const freshN = next.length
        if (freshN) {
          const freshValues = computeEqualShares(0, next).reduce<Record<string, number>>(
            (acc, p) => {
              acc[p.userId] = roundMoney(100 / freshN, 4)
              return acc
            },
            {},
          )
          const sum = safeSum(Object.values(freshValues))
          const diff = roundMoney(100 - sum, 4)
          if (Math.abs(diff) > 0 && next.length) {
            freshValues[next[next.length - 1]] = roundMoney(
              (freshValues[next[next.length - 1]] ?? 0) + diff,
              4,
            )
          }
          setValue('participantValues', { ...participantValues, ...freshValues }, {
            shouldValidate: true,
          })
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
      autoDistributePaidBy(originalAmount, participantIds).map(
        (p) => ({ ...p, amount: p.amount as unknown as number }),
      ),
      { shouldValidate: true },
    )
  }

  const addPayer = (userId: string) => {
    if (paidBy.some((p) => p.userId === userId)) return
    setValue('paidBy', [
      ...paidBy,
      { userId, amount: 0 as unknown as number },
    ], { shouldValidate: true })
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
      p.userId === userId ? { ...p, amount: (Number(raw) || 0) as unknown as number } : p,
    )
    setValue('paidBy', next, { shouldValidate: true })
  }

  const payerSet = useMemo(() => new Set(paidBy.map((p) => p.userId)), [paidBy])

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="lg"
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: (t) => t.palette.primary.main + '14',
                color: (t) => t.palette.primary.main,
              }}
            >
              {isEdit ? <SaveIcon /> : <AttachMoneyIcon />}
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              {isEdit ? 'Edit expense' : 'Add expense'}
            </Typography>
          </Stack>
          <IconButton size="small" onClick={onClose} disabled={isSubmitting}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Box
          component="form"
          id="add-expense-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <Stack spacing={3}>
            <TextField
              label="Title"
              placeholder="e.g. Dinner at Luigi's"
              autoFocus
              {...register('title')}
              error={!!errors.title}
              helperText={errors.title?.message}
            />
            <TextField
              label="Description (optional)"
              placeholder="Notes, links, attendees…"
              multiline
              rows={2}
              {...register('description')}
              error={!!errors.description}
              helperText={errors.description?.message}
            />

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              useFlexGap
            >
              <TextField
                {...register('expenseDate')}
                type="date"
                label="Date"
                slotProps={{ inputLabel: { shrink: true } }}
                error={!!errors.expenseDate}
                helperText={errors.expenseDate?.message}
                sx={{ flex: 1 }}
              />
              <Controller
                name="originalCurrency"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.originalCurrency} sx={{ flex: 1 }}>
                    <InputLabel id="currency-label">Currency</InputLabel>
                    <Select labelId="currency-label" label="Currency" {...field}>
                      {CURRENCIES.map((c) => (
                        <MenuItem key={c.code} value={c.code}>
                          {c.label} ({c.symbol})
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.originalCurrency && (
                      <FormHelperText>{errors.originalCurrency.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
              <TextField
                {...register('originalAmount')}
                label="Amount"
                type="number"
                error={!!errors.originalAmount || !!amountError}
                helperText={errors.originalAmount?.message || amountError?.message}
                slotProps={{
                  input: {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    step: '0.01',
                    min: '0',
                    startAdornment: (
                      <InputAdornment position="start">{getCurrencySymbol(originalCurrency)}</InputAdornment>
                    ),
                  },
                }}
                sx={{ flex: 1 }}
              />
            </Stack>

            {currencyMismatch && (
              <Box>
                {rateState.loading ? (
                  <Skeleton variant="rounded" height={56} sx={{ borderRadius: 2 }} />
                ) : rateState.error ? (
                  <Alert severity="warning">
                    <AlertTitle>FX rate unavailable</AlertTitle>
                    <Typography variant="body2">{rateState.error}</Typography>
                  </Alert>
                ) : (
                  <Alert severity="info" icon={<AttachMoneyIcon />}>
                    <AlertTitle sx={{ fontWeight: 700 }}>
                      Converting {originalCurrency} → {group.baseCurrency}
                    </AlertTitle>
                    <Typography variant="body2">
                      {formatMoney(originalAmount, originalCurrency)} ×{' '}
                      <strong>
                        1 {originalCurrency} = {rateState.rate} {group.baseCurrency}
                      </strong>
                      {rateState.date &&
                        ` (rate on ${rateState.date}${rateState.source ? ` via ${rateState.source}` : ''})`}
                      <br />
                      Group total:{' '}
                      <strong style={{ color: 'text.primary' }}>
                        {formatMoney(convertedAmount, group.baseCurrency)}
                      </strong>
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}

            <Divider />

            <Box>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Paid by
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap>
                  <Chip
                    label="One person"
                    size="small"
                    variant="outlined"
                    onClick={() => applySinglePayer(defaultPayerId)}
                    clickable
                  />
                  <Chip
                    label="Evenly among participants"
                    size="small"
                    variant="outlined"
                    onClick={applyEvenPaidBy}
                    clickable
                    disabled={!participantIds.length}
                  />
                </Stack>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap sx={{ mb: 1.5, flexWrap: 'wrap' }}>
                {paidBy.map((p) => {
                  const user = memberById.get(p.userId)
                  const name = user?.displayName || p.userId
                  return (
                    <Card
                      key={p.userId}
                      variant="outlined"
                      sx={{
                        p: 1,
                        pr: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        borderRadius: 3,
                        borderColor: (t) => t.palette.primary.main + '66',
                        bgcolor: (t) => t.palette.primary.main + '0a',
                      }}
                    >
                      <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: (t) => t.palette.secondary.main }}>
                        {initials(name)}
                      </Avatar>
                      <Stack sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                          {name}
                          {p.userId === me?.id ? ' (you)' : ''}
                        </Typography>
                        <TextField
                          size="small"
                          type="number"
                          value={p.amount}
                          onChange={(e) => updatePayerAmount(p.userId, e.target.value)}
                          slotProps={{
                            htmlInput: { step: '0.01', min: 0, style: { paddingTop: 2, paddingBottom: 2 } },
                            input: {
                              startAdornment: (
                                <InputAdornment position="start" sx={{ fontSize: 12 }}>
                                  {getCurrencySymbol(originalCurrency)}
                                </InputAdornment>
                              ),
                            },
                          }}
                          sx={{
                            mt: 0.25,
                            '& .MuiInputBase-root': { height: 28, fontSize: 12 },
                            width: 130,
                          }}
                        />
                      </Stack>
                      {paidBy.length > 1 && (
                        <Tooltip title="Remove payer">
                          <IconButton
                            size="small"
                            onClick={() => removePayer(p.userId)}
                            sx={{ alignSelf: 'flex-start', mt: -0.5 }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Card>
                  )
                })}
                {members
                  .filter((m) => !payerSet.has(m.id))
                  .slice(0, 6 - paidBy.length)
                  .map((m) => (
                    <Chip
                      key={`add-${m.id}`}
                      avatar={
                        <Avatar sx={{ width: 24, height: 24, fontSize: 10 }}>
                          {initials(m.displayName)}
                        </Avatar>
                      }
                      label={`Add ${m.displayName}`}
                      variant="outlined"
                      size="small"
                      onClick={() => addPayer(m.id)}
                      sx={{ borderRadius: 2 }}
                      clickable
                    />
                  ))}
              </Stack>

              <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Sum:{' '}
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ fontWeight: 700, color: 'text.primary' }}
                  >
                    {formatMoney(paidSum, originalCurrency)}
                  </Typography>
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color:
                      Math.abs(paidRemaining) < 0.005
                        ? 'success.main'
                        : 'error.main',
                    fontWeight: 700,
                  }}
                >
                  Remaining:{' '}
                  {Math.abs(paidRemaining) < 0.005
                    ? '✓ matches total'
                    : formatMoney(paidRemaining, originalCurrency)}
                </Typography>
                {paidBySumError && (
                  <Typography variant="caption" color="error">
                    {paidBySumError.message}
                  </Typography>
                )}
                {paidByError && (
                  <Typography variant="caption" color="error">
                    {paidByError.message}
                  </Typography>
                )}
                {errors.paidBy && (
                  <Typography variant="caption" color="error">
                    {Array.isArray(errors.paidBy)
                      ? errors.paidBy.map((x) => (x as z.ZodIssue).message || String(x)).join(' ')
                      : (errors.paidBy as unknown as { message?: string }).message || String(errors.paidBy)}
                  </Typography>
                )}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap sx={{ mb: 2 }}>
                <Controller
                  name="splitType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.splitType || !!splitTypeError}>
                      <InputLabel id="split-label" shrink>
                        Split
                      </InputLabel>
                      <ToggleButtonGroup
                        exclusive
                        color="primary"
                        value={field.value}
                        onChange={(_e, value) => {
                          if (!value) return
                          field.onChange(value)
                          const nextType = value as SplitType
                          const curIds = getValues('participantIds')
                          const curValues = { ...getValues('participantValues') }
                          if (nextType === 'percentage') {
                            const n = curIds.length
                            curIds.forEach((uid) => {
                              if (curValues[uid] == null) {
                                curValues[uid] = roundMoney(100 / n, 4)
                              }
                            })
                            const sum = safeSum(
                              curIds.map((uid) => roundMoney(Number(curValues[uid]) || 0, 4)),
                            )
                            const diff = roundMoney(100 - sum, 4)
                            if (Math.abs(diff) > 0 && curIds.length) {
                              const lastId = curIds[curIds.length - 1]
                              curValues[lastId] = roundMoney(
                                (Number(curValues[lastId]) || 0) + diff,
                                4,
                              )
                            }
                          } else if (nextType === 'shares') {
                            curIds.forEach((uid) => {
                              if (curValues[uid] == null) curValues[uid] = 1
                            })
                          } else if (nextType === 'exact') {
                            curIds.forEach((uid) => {
                              if (curValues[uid] == null) curValues[uid] = 0
                            })
                          }
                          setValue('participantValues', curValues, { shouldValidate: true })
                        }}
                        fullWidth
                        sx={{ minHeight: 56, borderRadius: 1.5 }}
                      >
                        <ToggleButton value="equal">Equal</ToggleButton>
                        <ToggleButton value="exact">Exact</ToggleButton>
                        <ToggleButton value="percentage">%</ToggleButton>
                        <ToggleButton value="shares">Shares</ToggleButton>
                      </ToggleButtonGroup>
                      {(errors.splitType || splitTypeError) && (
                        <FormHelperText error sx={{ mt: 0.5 }}>
                          {errors.splitType?.message || splitTypeError?.message}
                        </FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Stack>

              <Stack
                direction="row"
                spacing={2}
                sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Split with
                </Typography>
                <Button size="small" onClick={toggleAll}>
                  {allIn ? 'Clear all' : 'Select all'}
                </Button>
              </Stack>

              <FormGroup
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(1, minmax(0, 1fr))',
                    md: 'repeat(2, minmax(0, 1fr))',
                  },
                  gap: 1.25,
                }}
              >
                {members.map((m) => {
                  const checked = participantIds.includes(m.id)
                  const perPerson =
                    checked && rateState.rate
                      ? formatMoney(owedPreview[m.id] ?? 0, group.baseCurrency)
                      : null
                  const rawVal = Number(participantValues[m.id])
                  return (
                    <Box
                      key={m.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        p: 1.5,
                        borderRadius: 2.5,
                        border: (t) =>
                          `1px solid ${
                            checked ? t.palette.primary.main + '88' : t.palette.divider
                          }`,
                        bgcolor: (t) =>
                          checked ? t.palette.primary.main + '0a' : 'transparent',
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={checked}
                        onChange={() => toggleParticipant(m.id)}
                        sx={{ p: 0, alignSelf: 'flex-start', mt: 0.5 }}
                      />
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          fontSize: 12,
                          bgcolor: (t) => t.palette.secondary.main,
                          color: '#fff',
                          flexShrink: 0,
                          alignSelf: 'flex-start',
                          mt: 0.25,
                        }}
                      >
                        {initials(m.displayName)}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {m.displayName}
                            {m.id === me?.id ? ' (you)' : ''}
                          </Typography>
                          {payerSet.has(m.id) && (
                            <Chip
                              label="Payer"
                              size="small"
                              color="info"
                              variant="filled"
                              sx={{ height: 18, '& .MuiChip-label': { px: 0.75, py: 0, fontSize: 10 } }}
                            />
                          )}
                        </Stack>
                        {splitType === 'equal' ? (
                          <Box>
                            {perPerson ? (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                owes {perPerson}
                              </Typography>
                            ) : checked ? null : (
                              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                Not in split
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Box sx={{ mt: 0.5 }}>
                            {splitType === 'exact' && (
                              <TextField
                                size="small"
                                type="number"
                                label="Exact amount"
                                disabled={!checked}
                                value={checked ? rawVal : ''}
                                onChange={(e) => setParticipantValue(m.id, e.target.value)}
                                slotProps={{
                                  htmlInput: { step: '0.01', min: 0 },
                                  input: {
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        {getCurrencySymbol(originalCurrency)}
                                      </InputAdornment>
                                    ),
                                  },
                                }}
                                sx={{
                                  width: 160,
                                  '& .MuiInputBase-root': { height: 32, fontSize: 12 },
                                }}
                              />
                            )}
                            {splitType === 'percentage' && (
                              <TextField
                                size="small"
                                type="number"
                                label="Percentage"
                                disabled={!checked}
                                value={checked ? roundMoney(rawVal, 4) : ''}
                                onChange={(e) => setParticipantValue(m.id, e.target.value)}
                                slotProps={{
                                  htmlInput: { step: '0.01', min: 0, max: 100 },
                                  input: {
                                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                  },
                                }}
                                sx={{
                                  width: 150,
                                  '& .MuiInputBase-root': { height: 32, fontSize: 12 },
                                }}
                              />
                            )}
                            {splitType === 'shares' && (
                              <TextField
                                size="small"
                                type="number"
                                label="Shares"
                                disabled={!checked}
                                value={checked ? (rawVal > 0 ? Math.round(rawVal) : 1) : ''}
                                onChange={(e) => setParticipantValue(m.id, e.target.value)}
                                slotProps={{
                                  htmlInput: { step: '1', min: 1 },
                                }}
                                sx={{
                                  width: 120,
                                  '& .MuiInputBase-root': { height: 32, fontSize: 12 },
                                }}
                              />
                            )}
                          </Box>
                        )}
                        {checked && splitType !== 'equal' && perPerson ? (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                            → owes {perPerson}
                          </Typography>
                        ) : null}
                      </Box>
                    </Box>
                  )
                })}
              </FormGroup>

              <Stack
                direction="row"
                spacing={2}
                useFlexGap
                sx={{
                  mt: 1.5,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                {splitType === 'exact' && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: Math.abs(exactSum - originalAmount) < 0.005 ? 'success.main' : 'error.main',
                    }}
                  >
                    Exact total: {formatMoney(exactSum, originalCurrency)}
                    {Math.abs(exactSum - originalAmount) < 0.005 ? ' ✓' : ` of ${formatMoney(originalAmount, originalCurrency)}`}
                  </Typography>
                )}
                {splitType === 'percentage' && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: Math.abs(pctSum - 100) < 0.005 ? 'success.main' : 'error.main',
                    }}
                  >
                    Percentage total: {pctSum.toFixed(2)}%
                    {Math.abs(pctSum - 100) < 0.005 ? ' ✓' : ' of 100.00%'}
                  </Typography>
                )}
                {splitType === 'shares' && (
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Total shares: {totalShares}
                  </Typography>
                )}
                {(participantsError || errors.participantIds) && (
                  <Typography variant="caption" color="error">
                    {participantsError?.message ||
                      (Array.isArray(errors.participantIds)
                        ? errors.participantIds.map((e) => (e as z.ZodIssue).message || String(e)).join(' ')
                        : (errors.participantIds as unknown as { message?: string }).message || String(errors.participantIds))}
                  </Typography>
                )}
              </Stack>
            </Box>

            <Divider />

            <Card sx={{ borderRadius: 3, p: 3, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Preview
              </Typography>

              {(splitTypeError || paidBySumError || amountError) && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {splitTypeError?.message || paidBySumError?.message || amountError?.message}
                </Alert>
              )}

              {originalAmount > 0 && rateState.rate != null && participants.length && paidBy.length ? (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Paid:
                    </Typography>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                      {paidBy.map((p) => {
                        const name = memberById.get(p.userId)?.displayName || p.userId
                        return (
                          <Chip
                            key={p.userId}
                            label={`${name} paid ${formatMoney(p.amount, originalCurrency)}`}
                            variant="filled"
                            color="success"
                            sx={{ borderRadius: 2 }}
                          />
                        )
                      })}
                      {currencyMismatch && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
                          (~{formatMoney(convertedAmount, group.baseCurrency)} in group currency)
                        </Typography>
                      )}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Split <strong>{splitType}</strong>
                      {splitType === 'equal' ? ` · ${participants.length} ways` : ''}:
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'repeat(1, minmax(0, 1fr))',
                          sm: 'repeat(2, minmax(0, 1fr))',
                        },
                        gap: 1,
                      }}
                    >
                      {Object.entries(owedPreview).map(([userId, amount]) => {
                        const name = memberById.get(userId)?.displayName || userId
                        const isPayer = payerSet.has(userId)
                        return (
                          <Chip
                            key={userId}
                            label={
                              <Box sx={{ textAlign: 'left' }}>
                                {name}
                                {isPayer ? ' (payer)' : ''}: owes{' '}
                                <strong>{formatMoney(amount, group.baseCurrency)}</strong>
                              </Box>
                            }
                            variant={isPayer ? 'filled' : 'outlined'}
                            color={isPayer ? 'primary' : 'default'}
                            sx={{
                              justifyContent: 'flex-start',
                              px: 1,
                              py: 1,
                              height: 'auto',
                              minHeight: 36,
                              '& .MuiChip-label': { py: 0.25 },
                            }}
                          />
                        )
                      })}
                    </Box>
                  </Box>

                  {Object.keys(previewNetBalances).length > 0 && (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Net effect:
                      </Typography>
                      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        {Object.entries(previewNetBalances).map(([userId, amount]) => {
                          const name = memberById.get(userId)?.displayName || userId
                          if (Math.abs(amount) < 0.005) {
                            return (
                              <Chip
                                key={userId}
                                label={`${name}: settled`}
                                variant="outlined"
                                size="small"
                                sx={{ bgcolor: 'background.paper' }}
                              />
                            )
                          }
                          if (amount > 0) {
                            return (
                              <Chip
                                key={userId}
                                label={`${name} gets back ${formatMoney(amount, group.baseCurrency)}`}
                                color="success"
                                variant="filled"
                                size="small"
                              />
                            )
                          }
                          return (
                            <Chip
                              key={userId}
                              label={`${name} owes ${formatMoney(Math.abs(amount), group.baseCurrency)}`}
                              color="error"
                              variant="filled"
                              size="small"
                            />
                          )
                        })}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Enter an amount, at least one payer, and select participants to see the split preview.
                </Typography>
              )}
            </Card>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="text" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="add-expense-form"
          variant="contained"
          startIcon={isEdit ? <SaveIcon /> : <AddIcon />}
          disabled={!canSubmit}
          sx={{ minWidth: 180 }}
        >
          {isSubmitting
            ? isEdit
              ? 'Saving…'
              : 'Adding…'
            : isEdit
              ? 'Save changes'
              : 'Add expense'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
