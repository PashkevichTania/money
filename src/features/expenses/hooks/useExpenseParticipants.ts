import { useEffect, useMemo } from 'react'
import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form'
import type { ParticipantShare, PayerContribution, SplitType } from '@/types/expense'
import type { UserProfile } from '@/types/user'
import type { ExpenseFormValues } from '@/features/expenses/expenseForm'
import { roundMoney, safeSum } from '@/utils/currency'
import {
  autoDistributePaidBy,
  autoFillExactRemainder,
  buildParticipants,
} from '@/utils/split'

interface UseExpenseParticipantsOptions {
  defaultParticipantIds: string[]
  defaultPayerId: string
  getValues: UseFormGetValues<ExpenseFormValues>
  members: UserProfile[]
  open: boolean
  originalAmount: number
  paidBy: PayerContribution[]
  participantIds: string[]
  participantValues: Record<string, number>
  participants: ParticipantShare[]
  setValue: UseFormSetValue<ExpenseFormValues>
  splitType: SplitType
}

export function useExpenseParticipants({
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
}: UseExpenseParticipantsOptions) {
  useEffect(() => {
    if (!open) return
    const memberIds = new Set(members.map(({ id }) => id))
    const currentPaidBy = getValues('paidBy')
    const validPayers = currentPaidBy.filter(({ userId }) => memberIds.has(userId))
    if (validPayers.length !== currentPaidBy.length || validPayers.length === 0) {
      setValue(
        'paidBy',
        validPayers.length
          ? validPayers
          : [{ userId: defaultPayerId, amount: Number(getValues('originalAmount')) }],
        { shouldValidate: true },
      )
    }
    const currentParticipants = getValues('participantIds')
    const validParticipants = currentParticipants.filter((id) => memberIds.has(id))
    if (validParticipants.length !== currentParticipants.length) {
      setValue(
        'participantIds',
        validParticipants.length ? validParticipants : defaultParticipantIds,
        { shouldValidate: true },
      )
    }
  }, [defaultParticipantIds, defaultPayerId, getValues, members, open, setValue])

  useEffect(() => {
    if (!open || paidBy.length === 0) return
    if (originalAmount > 0 && safeSum(paidBy.map(({ amount }) => amount)) === 0) {
      setValue(
        'paidBy',
        paidBy.map((payer, index) =>
          index === 0 ? { ...payer, amount: originalAmount } : payer,
        ),
        { shouldValidate: true },
      )
    }
  }, [open, originalAmount, paidBy, setValue])

  const payerIds = useMemo(
    () => new Set(paidBy.map(({ userId }) => userId)),
    [paidBy],
  )
  const allSelected = participantIds.length === members.length && members.length > 0
  const paidSum = safeSum(paidBy.map(({ amount }) => amount))
  const paidRemaining = roundMoney(originalAmount - paidSum)

  const toggleParticipant = (userId: string) => {
    const selected = participantIds.includes(userId)
    const nextIds = selected
      ? participantIds.filter((id) => id !== userId)
      : [...participantIds, userId]
    setValue('participantIds', nextIds, { shouldValidate: true })

    if (!selected && splitType === 'percentage' && participantValues[userId] == null) {
      const equalPercentage = roundMoney(100 / nextIds.length, 4)
      const nextValues = Object.fromEntries(
        nextIds.map((id) => [id, equalPercentage]),
      )
      const difference = roundMoney(100 - safeSum(Object.values(nextValues)), 4)
      const lastId = nextIds.at(-1)
      if (lastId) nextValues[lastId] = roundMoney(nextValues[lastId] + difference, 4)
      setValue(
        'participantValues',
        { ...participantValues, ...nextValues },
        { shouldValidate: true },
      )
    }
  }

  const setParticipantValue = (userId: string, raw: string | number) => {
    setValue(
      'participantValues',
      { ...participantValues, [userId]: Number(raw) || 0 },
      { shouldValidate: true },
    )
  }

  const toggleAll = () => {
    setValue(
      'participantIds',
      allSelected ? [] : members.map(({ id }) => id),
      { shouldValidate: true },
    )
  }

  const applySinglePayer = (userId: string) => {
    setValue('paidBy', [{ userId, amount: originalAmount }], { shouldValidate: true })
  }

  const applyEvenPaidBy = () => {
    if (participantIds.length) {
      setValue('paidBy', autoDistributePaidBy(originalAmount, participantIds), {
        shouldValidate: true,
      })
    }
  }

  const addPayer = (userId: string) => {
    if (!payerIds.has(userId)) {
      setValue('paidBy', [...paidBy, { userId, amount: 0 }], { shouldValidate: true })
    }
  }

  const removePayer = (userId: string) => {
    if (paidBy.length > 1) {
      setValue('paidBy', paidBy.filter((payer) => payer.userId !== userId), {
        shouldValidate: true,
      })
    }
  }

  const updatePayerAmount = (userId: string, raw: string | number) => {
    setValue(
      'paidBy',
      paidBy.map((payer) =>
        payer.userId === userId ? { ...payer, amount: Number(raw) || 0 } : payer,
      ),
      { shouldValidate: true },
    )
  }

  const changeSplit = (type: SplitType) => {
    setValue('splitType', type, { shouldValidate: true })
    const defaults = buildParticipants(type, participantIds, {})
    setValue(
      'participantValues',
      Object.fromEntries(defaults.map(({ userId, value }) => [userId, value])),
      { shouldValidate: true },
    )
  }

  const fillExactRemainder = () => {
    const adjusted = autoFillExactRemainder(originalAmount, participants, participantIds)
    setValue(
      'participantValues',
      Object.fromEntries(adjusted.map(({ userId, value }) => [userId, value])),
      { shouldValidate: true },
    )
  }

  return {
    addPayer,
    allSelected,
    applyEvenPaidBy,
    applySinglePayer,
    changeSplit,
    fillExactRemainder,
    paidRemaining,
    paidSum,
    payerIds,
    removePayer,
    setParticipantValue,
    toggleAll,
    toggleParticipant,
    updatePayerAmount,
  }
}
