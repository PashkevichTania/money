import { z } from 'zod'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
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
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import FormHelperText from '@mui/material/FormHelperText'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import { useSnackbar } from 'notistack'
import type { Group } from '@/types/group'
import type { UserProfile } from '@/types/user'
import type { ParticipantShare, PayerContribution } from '@/types/expense'
import { CURRENCIES, DEFAULT_BASE_CURRENCY } from '@/config/currencies'
import { useCurrentUser } from '@/hooks/useGroups'
import { useExpenseStore } from '@/stores/expenseStore'
import { formatMoney, roundMoney } from '@/utils/currency'
import { nowIso, toIsoDate } from '@/utils/dates'
import { computeEqualShares, resolveOwedPerUser, validateSplit } from '@/utils/split'
import { getExchangeRate } from '@/api/rates'

const schema = z
  .object({
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
    payerId: z.string().min(1, 'Select who paid'),
    participantIds: z
      .array(z.string())
      .min(1, 'Select at least one participant'),
  })
  .superRefine((val, ctx) => {
    const participants: ParticipantShare[] = val.participantIds.map((userId) => ({
      userId,
      value: 1,
    }))
    const paidBy: PayerContribution[] = [
      { userId: val.payerId, amount: Number(val.originalAmount) },
    ]
    const errs = validateSplit({
      originalAmount: Number(val.originalAmount),
      participants,
      paidBy,
      splitType: val.splitType,
    })
    errs.forEach((e) => {
      if (e.field === 'participants') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['participantIds'],
          message: e.message,
        })
      } else if (e.field === 'paidBy') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['payerId'],
          message: e.message,
        })
      }
    })
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
}: {
  open: boolean
  onClose: () => void
  group: Group
  members: UserProfile[]
}) {
  const me = useCurrentUser()
  const { enqueueSnackbar } = useSnackbar()
  const addExpense = useExpenseStore((s) => s.addExpense)

  const defaultCurrency = group.baseCurrency || DEFAULT_BASE_CURRENCY
  const defaultPayerId = me?.id || members[0]?.id || ''
  const defaultParticipantIds = useMemo(() => members.map((m) => m.id), [members.length])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      expenseDate: nowIso().slice(0, 10),
      originalCurrency: defaultCurrency,
      originalAmount: 0 as unknown as number,
      splitType: 'equal',
      payerId: defaultPayerId,
      participantIds: defaultParticipantIds,
    },
  })

  const originalAmount = Number(watch('originalAmount') || 0)
  const originalCurrency = watch('originalCurrency') || defaultCurrency
  const splitType = watch('splitType') || 'equal'
  const payerId = watch('payerId')
  const participantIds = watch('participantIds') || []
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
  }, [currencyMismatch, originalCurrency, group.baseCurrency, expenseDate])

  useEffect(() => {
    if (open) {
      reset({
        title: '',
        description: '',
        expenseDate: nowIso().slice(0, 10),
        originalCurrency: defaultCurrency,
        originalAmount: 0 as unknown as number,
        splitType: 'equal',
        payerId: defaultPayerId,
        participantIds: defaultParticipantIds,
      })
    }
  }, [open, defaultCurrency, defaultPayerId, defaultParticipantIds])

  const convertedAmount = rateState.rate ? roundMoney(originalAmount * rateState.rate) : 0

  const participants: ParticipantShare[] = useMemo(() => {
    if (splitType === 'equal') {
      return computeEqualShares(originalAmount, participantIds)
    }
    return participantIds.map((userId) => ({ userId, value: 1 }))
  }, [splitType, originalAmount, participantIds])

  const owedPreview = useMemo<Record<string, number>>(() => {
    if (!rateState.rate || !participants.length) return {}
    return resolveOwedPerUser(convertedAmount, participants, splitType)
  }, [convertedAmount, participants, splitType, rateState.rate])

  const payerName = members.find((m) => m.id === payerId)?.displayName || payerId

  const canSubmit =
    !isSubmitting &&
    (rateState.rate != null || !currencyMismatch) &&
    !rateState.error

  const onSubmit = async (values: FormValues) => {
    if (!me) {
      enqueueSnackbar('You must be signed in', { variant: 'error' })
      return
    }
    if (rateState.error || rateState.rate == null) {
      enqueueSnackbar('A valid FX rate is required for currency conversion', { variant: 'error' })
      return
    }
    const participantsFinal: ParticipantShare[] =
      values.splitType === 'equal'
        ? computeEqualShares(Number(values.originalAmount), values.participantIds)
        : values.participantIds.map((userId) => ({ userId, value: 1 }))
    const paidBy: PayerContribution[] = [
      { userId: values.payerId, amount: Number(values.originalAmount) },
    ]
    const originalCur = values.originalCurrency.toUpperCase()
    const groupCur = group.baseCurrency.toUpperCase()
    const sameCurrency = originalCur === groupCur
    try {
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
        paidBy,
        participants: participantsFinal,
        splitType: values.splitType,
        expenseDate: toIsoDate(values.expenseDate),
        createdBy: me.id,
      })
      enqueueSnackbar('Expense added', { variant: 'success' })
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add expense'
      enqueueSnackbar(msg, { variant: 'error' })
    }
  }

  const toggleParticipant = (userId: string) => {
    const current = participantIds
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId]
    setValue('participantIds', next, { shouldValidate: true })
  }

  const allIn = participantIds.length === members.length
  const toggleAll = () => {
    setValue('participantIds', allIn ? [] : members.map((m) => m.id), {
      shouldValidate: true,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="md"
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
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
            <AttachMoneyIcon />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Add expense
          </Typography>
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
                error={!!errors.originalAmount}
                helperText={errors.originalAmount?.message}
                slotProps={{
                  input: {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    step: '0.01',
                    min: '0',
                    startAdornment: (
                      <InputAdornment position="start">{originalCurrency}</InputAdornment>
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

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap>
              <Controller
                name="payerId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.payerId}>
                    <InputLabel id="paid-by-label">Paid by</InputLabel>
                    <Select labelId="paid-by-label" label="Paid by" {...field}>
                      {members.map((m) => (
                        <MenuItem key={m.id} value={m.id}>
                          {m.displayName} {m.id === me?.id ? '(you)' : ''}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.payerId && (
                      <FormHelperText>{errors.payerId.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
              <Controller
                name="splitType"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.splitType}>
                    <InputLabel id="split-label" shrink>
                      Split
                    </InputLabel>
                    <ToggleButtonGroup
                      exclusive
                      color="primary"
                      value={field.value}
                      onChange={(_e, value) => value && field.onChange(value)}
                      fullWidth
                      sx={{ minHeight: 56, borderRadius: 1.5 }}
                    >
                      <ToggleButton value="equal">Equal</ToggleButton>
                      <ToggleButton value="exact" disabled title="Phase 5">
                        Exact
                      </ToggleButton>
                      <ToggleButton value="percentage" disabled title="Phase 5">
                        %
                      </ToggleButton>
                      <ToggleButton value="shares" disabled title="Phase 5">
                        Shares
                      </ToggleButton>
                    </ToggleButtonGroup>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}
                    >
                      Phase 4 supports Equal only — Exact/%/Shares arrive in Phase 5.
                    </Typography>
                  </FormControl>
                )}
              />
            </Stack>

            <Divider />

            <Box>
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
                    sm: 'repeat(2, minmax(0, 1fr))',
                  },
                  gap: 1,
                }}
              >
                {members.map((m) => {
                  const checked = participantIds.includes(m.id)
                  const perPerson =
                    checked && rateState.rate
                      ? formatMoney(owedPreview[m.id] ?? 0, group.baseCurrency)
                      : null
                  return (
                    <FormControlLabel
                      key={m.id}
                      control={
                        <Checkbox checked={checked} onChange={() => toggleParticipant(m.id)} />
                      }
                      label={
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            width: '100%',
                          }}
                        >
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              bgcolor: (t) => t.palette.secondary.main,
                              color: '#fff',
                              display: 'grid',
                              placeItems: 'center',
                              fontWeight: 700,
                              fontSize: 12,
                              flexShrink: 0,
                            }}
                          >
                            {initials(m.displayName)}
                          </Box>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {m.displayName}
                              {m.id === me?.id ? ' (you)' : ''}
                              {m.id === payerId && (
                                <Chip
                                  label="Payer"
                                  size="small"
                                  color="info"
                                  variant="filled"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Typography>
                            {perPerson && (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                owes {perPerson}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      }
                      sx={{
                        m: 0,
                        p: 1.5,
                        borderRadius: 2,
                        border: (t) =>
                          `1px solid ${
                            checked ? t.palette.primary.main + '66' : t.palette.divider
                          }`,
                        bgcolor: (t) => (checked ? t.palette.primary.main + '0a' : 'transparent'),
                      }}
                    />
                  )
                })}
              </FormGroup>
              {errors.participantIds && (
                <FormHelperText error sx={{ mt: 1 }}>
                  {Array.isArray(errors.participantIds)
                    ? errors.participantIds.map((e) => e.message).join(' ')
                    : errors.participantIds.message}
                </FormHelperText>
              )}
            </Box>

            <Divider />

            <Card sx={{ borderRadius: 3, p: 3, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Preview
              </Typography>
              {originalAmount > 0 && rateState.rate != null && participants.length ? (
                <Stack spacing={1.5}>
                  <Typography variant="body2">
                    <strong>{payerName}</strong> paid{' '}
                    <strong>{formatMoney(originalAmount, originalCurrency)}</strong>
                    {currencyMismatch && (
                      <>
                        {' '}
                        (~{formatMoney(convertedAmount, group.baseCurrency)} in group currency)
                      </>
                    )}
                    .
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Split <strong>{splitType}</strong>{' '}
                    {splitType === 'equal' ? `${participants.length} ways` : ''}:
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
                      const name =
                        members.find((m) => m.id === userId)?.displayName || userId
                      const isPayer = userId === payerId
                      return (
                        <Chip
                          key={userId}
                          label={
                            <>
                              {name}
                              {isPayer ? ' (payer)' : ''}: owes{' '}
                              {formatMoney(amount, group.baseCurrency)}
                            </>
                          }
                          variant={isPayer ? 'filled' : 'outlined'}
                          color={isPayer ? 'success' : 'default'}
                          sx={{ justifyContent: 'flex-start', px: 1, py: 0.5 }}
                        />
                      )
                    })}
                  </Box>
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Enter an amount and select participants to see the split preview.
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
          startIcon={<AddIcon />}
          disabled={!canSubmit}
          sx={{ minWidth: 180 }}
        >
          {isSubmitting ? 'Adding…' : 'Add expense'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
