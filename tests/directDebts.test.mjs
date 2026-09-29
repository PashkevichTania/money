import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
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
const { buildDirectDebts, valueDebt } = await import(
  compile(
    read('../src/utils/directDebts.ts')
      .replace("'./balances'", JSON.stringify(balances))
      .replace("'./split'", JSON.stringify(split))
  )
);
const group = (id = 'g', currency = 'EUR') => ({
  id,
  name: id,
  baseCurrency: currency,
  memberIds: ['a', 'b', 'c', 'd'],
});
const expense = (id, from, to, amount, patch = {}) => ({
  id,
  groupId: 'g',
  title: id,
  originalAmount: amount,
  originalCurrency: 'EUR',
  convertedAmount: amount,
  groupCurrency: 'EUR',
  paidBy: [{ userId: to, amount }],
  participants: [{ userId: from, value: amount }],
  splitType: 'exact',
  expenseDate: '2026-09-01',
  createdAt: '2026-09-01',
  ...patch,
});
const payment = (id, from, to, amount, patch = {}) => ({
  id,
  fromUserId: from,
  toUserId: to,
  amount,
  currency: 'EUR',
  createdAt: '2026-09-03',
  ...patch,
});
const build = (expenses, settlements = []) =>
  buildDirectDebts([{ group: group(), expenses, settlements }]);
const amount = (graph, from, to) => {
  const edge = graph.edges.find((edge) => edge.from === from && edge.to === to);
  return edge
    ? edge.parts.reduce((sum, part) => sum + part.remainingMinor, 0) / 100
    : 0;
};

test('keeps direct chain and opposite expenses instead of simplifying group balances', () => {
  const graph = build([
    expense('1', 'b', 'a', 100),
    expense('2', 'c', 'b', 100),
    expense('3', 'a', 'b', 30),
  ]);
  assert.deepEqual(graph.issues, []);
  assert.equal(graph.edges.length, 3);
  assert.equal(amount(graph, 'b', 'a'), 100);
  assert.equal(amount(graph, 'c', 'b'), 100);
  assert.equal(amount(graph, 'a', 'b'), 30);
  assert.equal(amount(graph, 'c', 'a'), 0);
});
test('a zero-net cycle stays visible until payments are recorded', () => {
  const graph = build([
    expense('1', 'a', 'b', 50),
    expense('2', 'b', 'c', 50),
    expense('3', 'c', 'a', 50),
  ]);
  assert.equal(graph.edges.length, 3);
  assert.deepEqual(graph.issues, []);
});
test('reference example merges currencies in one direction but preserves opposite direction', () => {
  const graph = buildDirectDebts([
    {
      group: group('pln', 'PLN'),
      settlements: [],
      expenses: [
        expense('1', 'b', 'a', 15, {
          originalCurrency: 'PLN',
          groupCurrency: 'PLN',
        }),
        expense('2', 'c', 'a', 100, {
          originalCurrency: 'PLN',
          groupCurrency: 'PLN',
        }),
      ],
    },
    {
      group: group('eur'),
      settlements: [],
      expenses: [expense('3', 'b', 'a', 10), expense('4', 'a', 'c', 30)],
    },
  ]);
  assert.deepEqual(graph.issues, []);
  assert.equal(graph.edges.length, 3);
  const edge = graph.edges.find((edge) => edge.from === 'b');
  assert.equal(edge.parts.length, 2);
  assert.equal(valueDebt(edge, { PLN: 0.235, EUR: 1 }).amountMinor, 1353);
  assert.equal(
    valueDebt(
      graph.edges.find((edge) => edge.from === 'c'),
      { PLN: 0.235, EUR: 1 }
    ).amountMinor,
    2350
  );
  assert.deepEqual(valueDebt(edge, { EUR: 1 }).missing, ['PLN']);
});
test('partial payments consume oldest expenses and preserve original purchase amounts', () => {
  const expenses = [
    expense('new', 'b', 'a', 20, { expenseDate: '2026-09-02' }),
    expense('old', 'b', 'a', 10),
  ];
  const before = JSON.stringify(expenses);
  const graph = build(expenses, [payment('p', 'b', 'a', 15)]);
  assert.equal(amount(graph, 'b', 'a'), 15);
  assert.equal(graph.edges[0].parts.length, 1);
  assert.equal(graph.edges[0].parts[0].expenseId, 'new');
  assert.equal(graph.edges[0].parts[0].originalAmount, 20);
  assert.equal(graph.edges[0].parts[0].payments[0].amountMinor, 500);
  assert.equal(JSON.stringify(expenses), before);
  assert.equal(amount(build(expenses), 'b', 'a'), 30);
});
test('payments never consume a different group or currency', () => {
  const graph = buildDirectDebts([
    {
      group: group('one'),
      expenses: [expense('1', 'b', 'a', 10)],
      settlements: [payment('p', 'b', 'a', 15)],
    },
    {
      group: group('two'),
      expenses: [expense('2', 'b', 'a', 20)],
      settlements: [],
    },
  ]);
  assert.equal(graph.issues[0].groupId, 'one');
  assert.equal(amount(graph, 'b', 'a'), 20);
});
test('existing simplified payment follows a debt chain and records allocation', () => {
  const graph = build(
    [expense('1', 'b', 'a', 100), expense('2', 'c', 'b', 100)],
    [payment('p', 'c', 'a', 40)]
  );
  assert.deepEqual(graph.issues, []);
  assert.equal(amount(graph, 'b', 'a'), 60);
  assert.equal(amount(graph, 'c', 'b'), 60);
  assert.ok(graph.edges.every((edge) => edge.parts[0].payments[0].indirect));
});
test('payments prefer a direct link, then use available chains', () => {
  const graph = build(
    [
      expense('1', 'c', 'a', 10),
      expense('2', 'c', 'b', 30),
      expense('3', 'b', 'a', 30),
    ],
    [payment('p', 'c', 'a', 25)]
  );
  assert.deepEqual(graph.issues, []);
  assert.equal(amount(graph, 'c', 'a'), 0);
  assert.equal(amount(graph, 'c', 'b'), 15);
  assert.equal(amount(graph, 'b', 'a'), 15);
});
test('legacy settlement expense reduces the same direct debt', () => {
  const graph = build([
    expense('1', 'b', 'a', 50),
    expense('p', 'a', 'b', 20, { isSettlement: true }),
  ]);
  assert.deepEqual(graph.issues, []);
  assert.equal(amount(graph, 'b', 'a'), 30);
});
test('full payment removes a connection; overpayment does not invent reverse debt', () => {
  assert.equal(
    build([expense('1', 'b', 'a', 10)], [payment('p', 'b', 'a', 10)]).edges
      .length,
    0
  );
  const graph = build(
    [expense('1', 'b', 'a', 10)],
    [payment('p', 'b', 'a', 11)]
  );
  assert.equal(graph.edges.length, 0);
  assert.equal(graph.issues[0].reason, 'payment');
});
test('multiple payers cover own shares then proportionally fund other participants', () => {
  const graph = build([
    expense('multi', 'c', 'a', 100, {
      paidBy: [
        { userId: 'a', amount: 60 },
        { userId: 'b', amount: 40 },
      ],
      participants: ['a', 'b', 'c', 'd'].map((userId) => ({
        userId,
        value: 25,
      })),
    }),
  ]);
  assert.deepEqual(graph.issues, []);
  assert.equal(amount(graph, 'c', 'a'), 17.5);
  assert.equal(amount(graph, 'c', 'b'), 7.5);
  assert.equal(amount(graph, 'd', 'a'), 17.5);
  assert.equal(amount(graph, 'd', 'b'), 7.5);
});
test('cent allocation conserves balances for many split totals and payer distributions', () => {
  for (let cents = 3; cents < 150; cents++) {
    const total = cents / 100;
    const paidA = Math.floor(cents * 0.65) / 100;
    const graph = build([
      expense('rounding', 'c', 'a', total, {
        splitType: 'equal',
        paidBy: [
          { userId: 'a', amount: paidA },
          { userId: 'b', amount: (cents - Math.round(paidA * 100)) / 100 },
        ],
        participants: ['a', 'b', 'c'].map((userId) => ({ userId, value: 1 })),
      }),
    ]);
    assert.deepEqual(graph.issues, [], 'total=' + total);
    assert.ok(
      graph.edges.every(
        (edge) =>
          edge.from !== edge.to &&
          edge.parts.every(
            (part) =>
              Number.isSafeInteger(part.remainingMinor) &&
              part.remainingMinor > 0
          )
      )
    );
  }
});
test('invalid ledger and unusable rates are never silently shown as zero', () => {
  assert.equal(
    build([expense('invalid', 'b', 'a', -10)]).issues[0].reason,
    'invalid'
  );
  const graph = build([expense('1', 'b', 'a', 10)]);
  assert.deepEqual(valueDebt(graph.edges[0], { EUR: NaN }).missing, ['EUR']);
  assert.deepEqual(valueDebt(graph.edges[0], { EUR: 0 }).missing, ['EUR']);
});
