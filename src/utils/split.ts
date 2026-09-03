import type {
  Expense,
  ParticipantShare,
  PayerContribution,
  SplitType,
} from '@/types/expense'
import { roundMoney, safeSum } from './currency'

export function computeEqualShares(
  _total: number,
  participantUserIds: string[],
): ParticipantShare[] {
  if (!participantUserIds.length) return []
  return participantUserIds.map((userId) => ({
    userId,
    value: 1,
  }))
}

export function resolveOwedPerUser(
  convertedTotal: number,
  participants: ParticipantShare[],
  splitType: SplitType,
): Record<string, number> {
  const out: Record<string, number> = {}
  if (!participants.length) return out

  if (splitType === 'equal') {
    const n = participants.length
    const per = convertedTotal / n
    const perRounded = roundMoney(per)
    let sum = 0
    participants.forEach((p, i) => {
      if (i === n - 1) {
        out[p.userId] = roundMoney(convertedTotal - sum)
      } else {
        out[p.userId] = perRounded
        sum += perRounded
      }
    })
    return out
  }

  if (splitType === 'exact') {
    participants.forEach((p) => {
      out[p.userId] = roundMoney(p.value)
    })
    return out
  }

  if (splitType === 'percentage') {
    participants.forEach((p) => {
      out[p.userId] = roundMoney((convertedTotal * p.value) / 100)
    })
    const totaled = safeSum(Object.values(out))
    if (participants.length && Math.abs(totaled - convertedTotal) > 0.001) {
      const diff = roundMoney(convertedTotal - totaled)
      const lastId = participants[participants.length - 1].userId
      out[lastId] = roundMoney((out[lastId] ?? 0) + diff)
    }
    return out
  }

  if (splitType === 'shares') {
    const totalShares = safeSum(participants.map((p) => Math.max(0, p.value)))
    if (totalShares <= 0) {
      return computeEqualShares(convertedTotal, participants.map((p) => p.userId)).reduce<
        Record<string, number>
      >((acc, p) => {
        acc[p.userId] = roundMoney(convertedTotal / participants.length)
        return acc
      }, {})
    }
    const perShare = convertedTotal / totalShares
    participants.forEach((p) => {
      out[p.userId] = roundMoney(p.value * perShare)
    })
    const totaled = safeSum(Object.values(out))
    if (participants.length && Math.abs(totaled - convertedTotal) > 0.001) {
      const diff = roundMoney(convertedTotal - totaled)
      const lastId = participants[participants.length - 1].userId
      out[lastId] = roundMoney((out[lastId] ?? 0) + diff)
    }
    return out
  }

  return out
}

export function computeNetBalances(
  expense: Expense,
): Record<string, number> {
  const net: Record<string, number> = {}
  const add = (userId: string, delta: number) => {
    net[userId] = roundMoney((net[userId] ?? 0) + delta)
  }

  const owed = resolveOwedPerUser(
    expense.convertedAmount,
    expense.participants,
    expense.splitType,
  )

  Object.entries(owed).forEach(([userId, amount]) => {
    add(userId, -amount)
  })

  expense.paidBy.forEach((payer: PayerContribution) => {
    let convertedPaid = payer.amount
    if (expense.originalCurrency !== expense.groupCurrency && expense.rateSnapshot?.rate) {
      convertedPaid = payer.amount * expense.rateSnapshot.rate
    }
    add(payer.userId, roundMoney(convertedPaid))
  })

  Object.keys(net).forEach((k) => {
    if (Object.is(net[k], -0)) net[k] = 0
  })

  return net
}

export interface SplitValidationError {
  field:
    | 'participants'
    | 'paidBy'
    | 'split.sum'
    | 'split.percentage'
    | 'split.shares'
    | 'paidBy.sum'
    | 'originalAmount'
  message: string
}

export function validateSplit(params: {
  originalAmount: number
  participants: ParticipantShare[]
  paidBy: PayerContribution[]
  splitType: SplitType
}): SplitValidationError[] {
  const errors: SplitValidationError[] = []

  if (!params.originalAmount || params.originalAmount <= 0) {
    errors.push({
      field: 'originalAmount',
      message: 'Amount must be greater than zero.',
    })
  }

  if (!params.participants.length) {
    errors.push({
      field: 'participants',
      message: 'Select at least one participant.',
    })
  }

  if (!params.paidBy.length) {
    errors.push({
      field: 'paidBy',
      message: 'At least one person must pay.',
    })
  }

  const paidSum = safeSum(params.paidBy.map((p) => p.amount))
  if (params.originalAmount > 0 && Math.abs(paidSum - params.originalAmount) > 0.005) {
    errors.push({
      field: 'paidBy.sum',
      message: `Sum of payments (${paidSum.toFixed(2)}) must equal total amount (${params.originalAmount.toFixed(2)}).`,
    })
  }

  if (params.splitType === 'exact' && params.participants.length) {
    const exactSum = safeSum(params.participants.map((p) => p.value))
    if (Math.abs(exactSum - params.originalAmount) > 0.005) {
      errors.push({
        field: 'split.sum',
        message: `Exact amounts add to ${exactSum.toFixed(2)}, expected ${params.originalAmount.toFixed(2)}.`,
      })
    }
  }

  if (params.splitType === 'percentage' && params.participants.length) {
    const pctSum = safeSum(params.participants.map((p) => p.value))
    if (Math.abs(pctSum - 100) > 0.005) {
      errors.push({
        field: 'split.percentage',
        message: `Percentages add to ${pctSum.toFixed(2)}%, expected 100%.`,
      })
    }
  }

  if (params.splitType === 'shares') {
    const zeroShares = params.participants.some((p) => !p.value || p.value <= 0)
    if (zeroShares) {
      errors.push({
        field: 'split.shares',
        message: 'Each participant must have positive shares.',
      })
    }
  }

  return errors
}

export function applySplitTypeToConverted(
  expense: Expense,
): Record<string, number> {
  return resolveOwedPerUser(
    expense.convertedAmount,
    expense.participants,
    expense.splitType,
  )
}
