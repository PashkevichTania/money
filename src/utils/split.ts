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

// Largest-remainder allocation keeps totals exact and never assigns negative cents.
export function allocateMoney(total: number, weights: number[]): number[] {
  const cents = Math.round(total * 100)
  const sum = safeSum(weights)
  if (!Number.isSafeInteger(cents) || cents < 0 || weights.some(w => !Number.isFinite(w) || w < 0)) return weights.map(() => 0)
  if (!Number.isFinite(sum) || sum <= 0) return weights.map(() => 0)
  const raw = weights.map(w => cents * (w / sum))
  const units = raw.map(Math.floor)
  const order = raw.map((v, i) => ({ i, remainder: v - units[i] }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i)
  const remaining = cents - units.reduce((a, b) => a + b, 0)
  for (let i = 0; i < remaining; i++) units[order[i % order.length].i]++
  return units.map(v => v / 100)
}

export function resolveOwedPerUser(
  convertedTotal: number,
  participants: ParticipantShare[],
  splitType: SplitType,
): Record<string, number> {
  // Exact values are original-currency weights; the saved converted total
  // includes the FX snapshot and its rounding, so no new rate is fetched.
  const amounts = allocateMoney(convertedTotal, participants.map(p => splitType === 'equal' ? 1 : p.value))
  return Object.fromEntries(participants.map((p, i) => [p.userId, amounts[i]]))
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

  const payments = allocateMoney(expense.convertedAmount, expense.paidBy.map(p => p.amount))
  expense.paidBy.forEach((payer: PayerContribution, i) => {
    add(payer.userId, payments[i])
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

  if (!Number.isFinite(params.originalAmount) || params.originalAmount <= 0) {
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

  if (new Set(params.participants.map(p => p.userId)).size !== params.participants.length ||
      params.participants.some(p => !p.userId || !Number.isFinite(p.value) || p.value < 0)) {
    errors.push({ field: 'participants', message: 'Participants must be unique with finite, non-negative values.' })
  }
  if (new Set(params.paidBy.map(p => p.userId)).size !== params.paidBy.length ||
      params.paidBy.some(p => !p.userId || !Number.isFinite(p.amount) || p.amount < 0)) {
    errors.push({ field: 'paidBy', message: 'Payers must be unique with finite, non-negative amounts.' })
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

export function computeExactShares(
  participantUserIds: string[],
  valuesByUserId: Record<string, number> = {},
): ParticipantShare[] {
  return participantUserIds.map((userId) => ({
    userId,
    value: roundMoney(Number(valuesByUserId[userId]) || 0),
  }))
}

export function computePercentageShares(
  participantUserIds: string[],
  valuesByUserId: Record<string, number> = {},
): ParticipantShare[] {
  const n = participantUserIds.length
  if (!n) return []
  const hasAny = Object.values(valuesByUserId).some((v) => v != null && Number.isFinite(v))
  if (!hasAny) {
    const base = roundMoney(100 / n, 4)
    const shares = participantUserIds.map((userId) => ({ userId, value: base }))
    const total = safeSum(shares.map((s) => s.value))
    const diff = roundMoney(100 - total, 4)
    if (Math.abs(diff) > 0) {
      shares[shares.length - 1].value = roundMoney(shares[shares.length - 1].value + diff, 4)
    }
    return shares
  }
  return participantUserIds.map((userId) => ({
    userId,
    value: roundMoney(Number(valuesByUserId[userId]) || 0, 4),
  }))
}

export function computeSharesByRatio(
  participantUserIds: string[],
  valuesByUserId: Record<string, number> = {},
): ParticipantShare[] {
  return participantUserIds.map((userId) => {
    const raw = Number(valuesByUserId[userId])
    const value = raw && Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 1
    return { userId, value }
  })
}

export function autoFillExactRemainder(
  total: number,
  shares: ParticipantShare[],
  userIdOrder: string[],
): ParticipantShare[] {
  if (!userIdOrder.length) return shares
  const byId = new Map(shares.map((s) => [s.userId, s.value]))
  const othersSum = safeSum(
    userIdOrder
      .slice(0, -1)
      .map((uid) => roundMoney(Number(byId.get(uid)) || 0)),
  )
  const remainder = roundMoney(total - othersSum)
  const lastId = userIdOrder[userIdOrder.length - 1]
  return shares.map((s) =>
    s.userId === lastId ? { ...s, value: remainder } : s,
  )
}

export function buildParticipants(
  splitType: SplitType,
  participantIds: string[],
  valuesByUserId: Record<string, number>,
): ParticipantShare[] {
  if (splitType === 'equal') return computeEqualShares(0, participantIds)
  if (splitType === 'exact') return computeExactShares(participantIds, valuesByUserId)
  if (splitType === 'percentage') return computePercentageShares(participantIds, valuesByUserId)
  return computeSharesByRatio(participantIds, valuesByUserId)
}

export function autoDistributePaidBy(
  total: number,
  userIds: string[],
): PayerContribution[] {
  const amounts = allocateMoney(total, userIds.map(() => 1))
  return userIds.map((userId, i) => ({ userId, amount: amounts[i] }))
}
