import type { Expense, Settlement } from '@/types/expense';

import { allocateMoney, resolveOwedPerUser, validateSplit } from './split';

export interface MemberBalance {
  userId: string;
  paid: number;
  owed: number;
  settlementNet: number;
  net: number;
}

const cents = (amount: number) => {
  const value = Math.round(amount * 100);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(value))
    throw new Error('An amount is too large or invalid.');
  return value;
};

/** All accumulation is in integer cents. Positive net means money to receive. */
export function calculateBalances(
  expenses: Expense[],
  settlements: Settlement[],
  currency: string,
  memberIds: string[] = []
) {
  const rows = new Map<string, MemberBalance>();
  const row = (id: string) => {
    if (!id) throw new Error('A ledger entry has no member identifier.');
    if (!rows.has(id))
      rows.set(id, { userId: id, paid: 0, owed: 0, settlementNet: 0, net: 0 });
    return rows.get(id)!;
  };
  memberIds.forEach(row);
  for (const expense of expenses) {
    if (
      expense.groupCurrency !== currency ||
      !['equal', 'exact', 'percentage', 'shares'].includes(expense.splitType) ||
      validateSplit(expense).length ||
      cents(expense.convertedAmount) <= 0
    ) {
      throw new Error(
        `Expense "${expense.title}" has invalid amounts or currency. Correct it before relying on balances.`
      );
    }
    const paid = allocateMoney(
      expense.convertedAmount,
      expense.paidBy.map((p) => p.amount)
    );
    const owed = resolveOwedPerUser(
      expense.convertedAmount,
      expense.participants,
      expense.splitType
    );
    expense.paidBy.forEach((p, i) => {
      const target = row(p.userId);
      if (expense.isSettlement) target.settlementNet += cents(paid[i]);
      else target.paid += cents(paid[i]);
    });
    Object.entries(owed).forEach(([id, amount]) => {
      if (expense.isSettlement) row(id).settlementNet -= cents(amount);
      else row(id).owed += cents(amount);
    });
  }
  for (const settlement of settlements) {
    if (
      settlement.currency !== currency ||
      settlement.fromUserId === settlement.toUserId ||
      cents(settlement.amount) <= 0
    ) {
      throw new Error(
        'A settlement has invalid amounts or currency. Correct it before relying on balances.'
      );
    }
    row(settlement.fromUserId).settlementNet += cents(settlement.amount);
    row(settlement.toUserId).settlementNet -= cents(settlement.amount);
  }
  return [...rows.values()].map((r) => {
    const net = r.paid - r.owed + r.settlementNet;
    if (![r.paid, r.owed, r.settlementNet, net].every(Number.isSafeInteger))
      throw new Error('Balance exceeds the supported amount.');
    return {
      userId: r.userId,
      paid: r.paid / 100,
      owed: r.owed / 100,
      settlementNet: r.settlementNet / 100,
      net: net / 100,
    };
  });
}

export function aggregateNetBalances(
  expenses: Expense[],
  settlements: Settlement[],
  currency: string,
  memberIds: string[] = []
) {
  return new Map(
    calculateBalances(expenses, settlements, currency, memberIds).map((r) => [
      r.userId,
      r.net,
    ])
  );
}

/** Deterministic greedy suggestions, not a guarantee of the minimum transfer count. */
export function simplifyDebts(net: Map<string, number>) {
  const entries = [...net].map(([id, amount]) => ({
    id,
    amount: cents(amount),
  }));
  if (entries.reduce((sum, r) => sum + r.amount, 0) !== 0)
    throw new Error('Balances must sum to zero.');
  const sort = (
    a: { id: string; amount: number },
    b: { id: string; amount: number }
  ) => b.amount - a.amount || a.id.localeCompare(b.id);
  const creditors = entries.filter((r) => r.amount > 0).sort(sort);
  const debtors = entries
    .filter((r) => r.amount < 0)
    .map((r) => ({ ...r, amount: -r.amount }))
    .sort(sort);
  const transfers: { from: string; to: string; amount: number }[] = [];
  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    transfers.push({
      from: debtors[i].id,
      to: creditors[j].id,
      amount: amount / 100,
    });
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (!debtors[i].amount) i++;
    if (!creditors[j].amount) j++;
  }
  return transfers;
}
