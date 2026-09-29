import { useState } from 'react';

import { NativeSelect } from '@/components/ui/native-select';
import type { Expense } from '@/types/expense';
import type { Group } from '@/types/group';
import { buildDirectDebts, type DebtLedger } from '@/utils/directDebts';

import DebtGraphView from './DebtGraphView';

const group = (id: string, baseCurrency: string): Group => ({
  id,
  baseCurrency,
  name: baseCurrency === 'PLN' ? 'Warsaw weekend' : 'Summer trip',
  memberIds: ['me', 'alex', 'sam'],
  createdBy: 'me',
  createdAt: '',
  updatedAt: '',
});
const expense = (
  id: string,
  from: string,
  to: string,
  amount: number,
  currency: string,
  title: string
): Expense => ({
  id,
  groupId: currency,
  title,
  originalAmount: amount,
  originalCurrency: currency,
  convertedAmount: amount,
  groupCurrency: currency,
  paidBy: [{ userId: to, amount }],
  participants: [{ userId: from, value: amount }],
  splitType: 'exact',
  expenseDate: '2026-09-20',
  createdAt: '2026-09-20',
  updatedAt: '2026-09-20',
  createdBy: to,
  updatedBy: to,
});
const ledgers: DebtLedger[] = [
  {
    group: group('PLN', 'PLN'),
    settlements: [],
    expenses: [
      expense('coffee', 'alex', 'me', 15, 'PLN', 'Coffee'),
      expense('tickets', 'sam', 'me', 100, 'PLN', 'Train tickets'),
      expense('lunch', 'sam', 'alex', 40, 'PLN', 'Lunch together'),
    ],
  },
  {
    group: group('EUR', 'EUR'),
    settlements: [],
    expenses: [
      expense('museum', 'alex', 'me', 10, 'EUR', 'Museum'),
      expense('taxi', 'me', 'sam', 30, 'EUR', 'Airport taxi'),
    ],
  },
];

export default function DebtsPreview() {
  const [scenario, setScenario] = useState('reference');
  const records = structuredClone(ledgers);
  if (scenario === 'payment' || scenario === 'mismatch')
    records[0].settlements.push({
      id: 'preview-payment',
      groupId: 'PLN',
      fromUserId: 'sam',
      toUserId: 'me',
      amount: scenario === 'payment' ? 40 : 200,
      currency: 'PLN',
      createdBy: 'me',
      createdAt: '2026-09-21',
    });
  if (scenario === 'many') {
    for (let i = 0; i < 8; i++) {
      records[1].expenses.push(
        expense(
          'extra-' + i,
          'friend-' + i,
          i % 2 ? 'alex' : 'me',
          (i + 1) * 10,
          'EUR',
          'Shared expense ' + (i + 1)
        )
      );
    }
  }
  const graph = buildDirectDebts(scenario === 'empty' ? [] : records);
  return (
    <div className="space-y-4">
      <NativeSelect
        aria-label="Preview scenario"
        value={scenario}
        onChange={(event) => setScenario(event.target.value)}
      >
        <option value="reference">Reference example</option>
        <option value="payment">Partial payment</option>
        <option value="missing">Missing PLN rate</option>
        <option value="empty">No debts</option>
        <option value="mismatch">Unmatched payment</option>
        <option value="many">More participants</option>
      </NativeSelect>
      <DebtGraphView
        key={scenario}
        graph={graph}
        userId="me"
        names={{ alex: 'Alex', sam: 'Sam' }}
        currency="EUR"
        rates={scenario === 'missing' ? { EUR: 1 } : { EUR: 1, PLN: 0.235 }}
        dates={['2026-09-20']}
        ratesReady
        preview
      />
    </div>
  );
}
