import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compile = (source) =>
  'data:text/javascript;base64,' +
  Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText
  ).toString('base64');
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const currency = compile(read('../src/utils/currency.ts'));
const split = compile(
  read('../src/utils/split.ts').replace(
    "'./currency'",
    JSON.stringify(currency)
  )
);
const balances = compile(
  read('../src/utils/balances.ts').replace("'./split'", JSON.stringify(split))
);
const plan = compile(
  read('../src/utils/settlementPlan.ts').replace(
    "'./balances'",
    JSON.stringify(balances)
  )
);
const { planSettlements, convertTotals } = await import(plan);
const expense = (payer = 'a', currency = 'USD') => ({
  id: 'e',
  title: 'Dinner',
  groupCurrency: currency,
  originalAmount: 90,
  convertedAmount: 90,
  splitType: 'equal',
  paidBy: [{ userId: payer, amount: 90 }],
  participants: ['a', 'b', 'c'].map((userId) => ({ userId, value: 1 })),
});

test('personal settlement plan handles incoming, outgoing, zero and partial debts', () => {
  assert.deepEqual(planSettlements([expense()], [], 'USD', 'a'), [
    { from: 'b', to: 'a', amount: 30 },
    { from: 'c', to: 'a', amount: 30 },
  ]);
  assert.deepEqual(planSettlements([expense()], [], 'USD', 'b'), [
    { from: 'b', to: 'a', amount: 30 },
  ]);
  assert.deepEqual(planSettlements([], [], 'USD', 'b'), []);
  assert.deepEqual(
    planSettlements(
      [expense()],
      [{ fromUserId: 'b', toUserId: 'a', amount: 10, currency: 'USD' }],
      'USD',
      'b'
    ),
    [{ from: 'b', to: 'a', amount: 20 }]
  );
});
test('default currency totals preserve net identity and report missing rates', () => {
  const totals = [
    { currency: 'USD', owed: 100, owing: 20 },
    { currency: 'EUR', owed: 50, owing: 10 },
  ];
  assert.deepEqual(convertTotals(totals, { USD: 1, EUR: 1.1 }), {
    owed: 155,
    owing: 31,
    net: 124,
    missing: [],
  });
  assert.deepEqual(convertTotals(totals, { USD: 1 }), {
    owed: 100,
    owing: 20,
    net: 80,
    missing: ['EUR'],
  });
  const tiny = convertTotals([{ currency: 'EUR', owed: 0.01, owing: 0.01 }], {
    EUR: 0.555,
  });
  assert.equal(tiny.net, tiny.owed - tiny.owing);
  assert.deepEqual(convertTotals([], {}), {
    owed: 0,
    owing: 0,
    net: 0,
    missing: [],
  });
});

let ledgers, failure, calls;
const api = {
  collection: (_, ...parts) => parts.join('/'),
  getDocsFromServer: async (path) => ({
    docs: (ledgers.get(path) ?? []).map((row) => ({
      id: row.id,
      data: () => row,
    })),
  }),
  createSettlement: async (id, input) => {
    calls.push(id);
    const list = ledgers.get(`groups/${input.groupId}/settlements`);
    const old = list.find((row) => row.id === id);
    if (old) {
      assert.equal(old.amount, input.amount);
      return old;
    }
    if (failure?.id === id && !failure.after) {
      failure = null;
      throw new Error('Network error');
    }
    const row = { ...input, id };
    list.push(row);
    if (failure?.id === id) {
      failure = null;
      throw new Error('Connection lost after commit');
    }
    return row;
  },
};
globalThis.__jobsApi = api;
const mock = compile(
  Object.keys(api)
    .map(
      (key) =>
        `export const ${key} = (...args) => globalThis.__jobsApi.${key}(...args)`
    )
    .join('\n')
);
let source = read('../src/api/settlementJobs.ts');
for (const [key, value] of [
  ['firebase/firestore', mock],
  ['@/config/firebase', compile('export const db = {}')],
  ['@/utils/settlementPlan', plan],
  ['./settlements', mock],
])
  source = source.replace(`'${key}'`, JSON.stringify(value));
const { saveSettlementJobs } = await import(compile(source));
function reset() {
  ledgers = new Map([
    ['groups/g/expenses', [expense()]],
    ['groups/g/settlements', []],
    ['groups/h/expenses', [expense('b', 'EUR')]],
    ['groups/h/settlements', []],
  ]);
  failure = null;
  calls = [];
}
const jobs = [
  { id: 'one', groupId: 'g', currency: 'USD', from: 'b', to: 'a', amount: 30 },
  { id: 'two', groupId: 'g', currency: 'USD', from: 'c', to: 'a', amount: 30 },
  {
    id: 'three',
    groupId: 'h',
    currency: 'EUR',
    from: 'a',
    to: 'b',
    amount: 30,
  },
];
test('bulk settlement records multiple recipients and currencies; retry never duplicates', async () => {
  reset();
  const saved = [];
  await saveSettlementJobs(jobs, 'a', (id) => saved.push(id));
  assert.deepEqual(saved, ['one', 'two', 'three']);
  await saveSettlementJobs(jobs, 'a', () => {});
  assert.equal(ledgers.get('groups/g/settlements').length, 2);
  assert.equal(ledgers.get('groups/h/settlements').length, 1);
});
test('partial batch failure resumes with stable IDs', async () => {
  reset();
  failure = { id: 'two' };
  const saved = new Set();
  await assert.rejects(
    saveSettlementJobs(jobs, 'a', (id) => saved.add(id)),
    /Network/
  );
  assert.deepEqual([...saved], ['one']);
  await saveSettlementJobs(jobs, 'a', (id) => saved.add(id));
  assert.equal(saved.size, 3);
  assert.equal(ledgers.get('groups/g/settlements').length, 2);
});
test('uncertain committed response is safe to retry', async () => {
  reset();
  failure = { id: 'one', after: true };
  await assert.rejects(
    saveSettlementJobs(jobs, 'a', () => {}),
    /after commit/
  );
  await saveSettlementJobs(jobs, 'a', () => {});
  assert.equal(ledgers.get('groups/g/settlements').length, 2);
});
test('stale preview blocks writes after someone else records a payment', async () => {
  reset();
  ledgers.get('groups/g/settlements').push({
    id: 'other',
    fromUserId: 'b',
    toUserId: 'a',
    amount: 10,
    currency: 'USD',
  });
  await assert.rejects(
    saveSettlementJobs(jobs, 'a', () => {}),
    /Balances changed/
  );
  assert.deepEqual(calls, []);
});

test('simultaneous dashboard buttons cannot double-record the same debt', async () => {
  reset();
  const outcomes = await Promise.allSettled([
    saveSettlementJobs([jobs[0]], 'a', () => {}),
    saveSettlementJobs([{ ...jobs[0], id: 'another-button' }], 'a', () => {}),
  ]);
  assert.equal(
    outcomes.filter((result) => result.status === 'fulfilled').length,
    1
  );
  assert.equal(ledgers.get('groups/g/settlements').length, 1);
});
