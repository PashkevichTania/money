import type { Expense, Settlement } from '@/types/expense';
import type { Group } from '@/types/group';

import { aggregateNetBalances } from './balances';
import { allocateMoney, computeNetBalances } from './split';

export interface DebtPart {
  id: string;
  groupId: string;
  groupName: string;
  expenseId: string;
  title: string;
  date: string;
  currency: string;
  originalCurrency: string;
  originalAmount: number;
  initialMinor: number;
  remainingMinor: number;
  payments: { id: string; amountMinor: number; indirect: boolean }[];
  multiplePayers: boolean;
}
export interface DirectDebt {
  id: string;
  from: string;
  to: string;
  parts: DebtPart[];
}
export type DebtLedger = {
  group: Group;
  expenses: Expense[];
  settlements: Settlement[];
};
const pairKey = (from: string, to: string) => JSON.stringify([from, to]);
const minor = (n: number) => {
  const value = Math.round(n * 100);
  if (!Number.isFinite(n) || !Number.isSafeInteger(value))
    throw new Error('Invalid debt amount');
  return value;
};
const remaining = (edge: DirectDebt) =>
  edge.parts.reduce((sum, part) => sum + part.remainingMinor, 0);

/** Each expense stands alone. A payer covers their own share first.
 * Debtors fund remaining payer credits proportionally, in stable user-id order.
 * Opposite expenses and different currencies are never netted. */
function expenseTransfers(expense: Expense) {
  const net = Object.entries(computeNetBalances(expense))
    .map(([id, amount]) => ({ id, amount: minor(amount) }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const creditors = net.filter((person) => person.amount > 0);
  const transfers: { from: string; to: string; amountMinor: number }[] = [];
  for (const debtor of net.filter((person) => person.amount < 0)) {
    const shares = allocateMoney(
      -debtor.amount / 100,
      creditors.map((person) => person.amount)
    );
    creditors.forEach((creditor, index) => {
      const amountMinor = minor(shares[index]);
      creditor.amount -= amountMinor;
      if (amountMinor)
        transfers.push({ from: debtor.id, to: creditor.id, amountMinor });
    });
  }
  return transfers;
}

/** Oldest expenses first. An existing simplified payment can cancel a directed
 * path (A -> B -> C paid as A -> C), without inventing debts. Unmatched
 * payments make the entire group's graph unavailable rather than misleading. */
function applyPayment(
  edges: DirectDebt[],
  payment: {
    id: string;
    from: string;
    to: string;
    amountMinor: number;
  }
) {
  let unpaid = payment.amountMinor;
  while (unpaid > 0) {
    const queue: { id: string; path: DirectDebt[] }[] = [
      { id: payment.from, path: [] },
    ];
    const seen = new Set([payment.from]);
    let path: DirectDebt[] | undefined;
    for (let index = 0; index < queue.length && !path; index++) {
      const current = queue[index];
      for (const edge of edges) {
        if (
          edge.from !== current.id ||
          remaining(edge) <= 0 ||
          seen.has(edge.to)
        )
          continue;
        const next = [...current.path, edge];
        if (edge.to === payment.to) {
          path = next;
          break;
        }
        seen.add(edge.to);
        queue.push({ id: edge.to, path: next });
      }
    }
    if (!path) return false;
    const amount = Math.min(unpaid, ...path.map(remaining));
    for (const edge of path) {
      let rest = amount;
      for (const part of edge.parts) {
        const consumed = Math.min(rest, part.remainingMinor);
        if (!consumed) continue;
        part.remainingMinor -= consumed;
        part.payments.push({
          id: payment.id,
          amountMinor: consumed,
          indirect: path.length > 1,
        });
        rest -= consumed;
      }
    }
    unpaid -= amount;
  }
  return true;
}

export function buildDirectDebts(ledgers: DebtLedger[]) {
  const combined = new Map<string, DirectDebt>();
  const issues: {
    groupId: string;
    groupName: string;
    reason: 'payment' | 'invalid';
  }[] = [];
  for (const { group, expenses, settlements } of ledgers) {
    try {
      const expected = aggregateNetBalances(
        expenses,
        settlements,
        group.baseCurrency
      );
      const local = new Map<string, DirectDebt>();
      const sorted = [...expenses].sort(
        (a, b) =>
          a.expenseDate.localeCompare(b.expenseDate) || a.id.localeCompare(b.id)
      );
      for (const expense of sorted.filter((item) => !item.isSettlement)) {
        for (const transfer of expenseTransfers(expense)) {
          const id = pairKey(transfer.from, transfer.to);
          const edge = local.get(id) ?? {
            id,
            from: transfer.from,
            to: transfer.to,
            parts: [],
          };
          edge.parts.push({
            id: JSON.stringify([
              group.id,
              expense.id,
              transfer.from,
              transfer.to,
            ]),
            groupId: group.id,
            groupName: group.name,
            expenseId: expense.id,
            title: expense.title,
            date: expense.expenseDate,
            currency: group.baseCurrency,
            originalCurrency: expense.originalCurrency,
            originalAmount: expense.originalAmount,
            initialMinor: transfer.amountMinor,
            remainingMinor: transfer.amountMinor,
            payments: [],
            multiplePayers: expense.paidBy.length > 1,
          });
          local.set(id, edge);
        }
      }
      const payments = [
        ...settlements.map((item) => ({
          id: item.id,
          from: item.fromUserId,
          to: item.toUserId,
          amountMinor: minor(item.amount),
          date: item.createdAt,
        })),
        ...sorted
          .filter((item) => item.isSettlement)
          .flatMap((item) =>
            expenseTransfers(item).map((transfer) => ({
              id: item.id,
              from: transfer.to,
              to: transfer.from,
              amountMinor: transfer.amountMinor,
              date: item.createdAt,
            }))
          ),
      ].sort(
        (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
      );
      const edges = [...local.values()].sort((a, b) =>
        a.id.localeCompare(b.id)
      );
      if (!payments.every((payment) => applyPayment(edges, payment))) {
        issues.push({
          groupId: group.id,
          groupName: group.name,
          reason: 'payment',
        });
        continue;
      }
      const actual = new Map<string, number>();
      for (const edge of edges) {
        actual.set(edge.from, (actual.get(edge.from) ?? 0) - remaining(edge));
        actual.set(edge.to, (actual.get(edge.to) ?? 0) + remaining(edge));
      }
      if (
        [...expected].some(
          ([id, value]) => minor(value) !== (actual.get(id) ?? 0)
        )
      )
        throw new Error('Debt graph does not match the ledger');
      for (const edge of edges) {
        edge.parts = edge.parts.filter((part) => part.remainingMinor > 0);
        if (!edge.parts.length) continue;
        const saved = combined.get(edge.id);
        if (saved) saved.parts.push(...edge.parts);
        else combined.set(edge.id, edge);
      }
    } catch {
      issues.push({
        groupId: group.id,
        groupName: group.name,
        reason: 'invalid',
      });
    }
  }
  return {
    edges: [...combined.values()].sort((a, b) => a.id.localeCompare(b.id)),
    issues,
  };
}

export function valueDebt(edge: DirectDebt, rates: Record<string, number>) {
  const currencies = new Map<string, number>();
  for (const part of edge.parts)
    currencies.set(
      part.currency,
      (currencies.get(part.currency) ?? 0) + part.remainingMinor
    );
  let amountMinor = 0;
  const missing: string[] = [];
  for (const [currency, amount] of currencies) {
    const rate = rates[currency];
    if (!Number.isFinite(rate) || rate <= 0) missing.push(currency);
    else amountMinor += Math.round(amount * rate);
  }
  if (!Number.isSafeInteger(amountMinor))
    throw new Error('Invalid converted amount');
  return { amountMinor, missing, currencies };
}
