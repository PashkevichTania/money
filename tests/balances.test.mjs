import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const compile = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const currency = compile(read('../src/utils/currency.ts'))
const split = compile(read('../src/utils/split.ts').replace("'./currency'", JSON.stringify(currency)))
const { calculateBalances, aggregateNetBalances, simplifyDebts } = await import(compile(read('../src/utils/balances.ts').replace("'./split'", JSON.stringify(split))))
const expense = (patch = {}) => ({ id: 'e', title: 'Dinner', groupCurrency: 'EUR', originalAmount: 90, convertedAmount: 90, splitType: 'equal', paidBy: [{ userId: 'a', amount: 90 }], participants: ['a', 'b', 'c'].map(userId => ({ userId, value: 1 })), ...patch })

test('empty group includes members with zero balances and no suggestions', () => {
  const net = aggregateNetBalances([], [], 'EUR', ['a', 'b'])
  assert.deepEqual([...net], [['a', 0], ['b', 0]])
  assert.deepEqual(simplifyDebts(net), [])
})
test('paid, owed, net and suggestions agree for a shared dinner', () => {
  const rows = calculateBalances([expense()], [], 'EUR')
  assert.deepEqual(rows.find(r => r.userId === 'a'), { userId: 'a', paid: 90, owed: 30, settlementNet: 0, net: 60 })
  assert.deepEqual(simplifyDebts(aggregateNetBalances([expense()], [], 'EUR')), [{ from: 'b', to: 'a', amount: 30 }, { from: 'c', to: 'a', amount: 30 }])
})
test('partial and full settlements reduce debts without inflating expense totals', () => {
  const transfer = { fromUserId: 'b', toUserId: 'a', amount: 10, currency: 'EUR' }
  assert.deepEqual([...aggregateNetBalances([expense()], [transfer], 'EUR')], [['a', 50], ['b', -20], ['c', -30]])
  const settlements = simplifyDebts(aggregateNetBalances([expense()], [], 'EUR')).map(s => ({ fromUserId: s.from, toUserId: s.to, amount: s.amount, currency: 'EUR' }))
  assert.ok(calculateBalances([expense()], settlements, 'EUR').every(r => r.net === 0))
  assert.equal(calculateBalances([expense()], settlements, 'EUR').reduce((sum, r) => sum + r.paid, 0), 90)
})
test('edited and deleted expenses are reflected, historical members remain visible', () => {
  assert.equal(aggregateNetBalances([expense({ originalAmount: 60, convertedAmount: 60, paidBy: [{ userId: 'a', amount: 60 }] })], [], 'EUR').get('a'), 40)
  assert.equal(aggregateNetBalances([], [], 'EUR', ['a']).get('a'), 0)
  assert.equal(calculateBalances([expense()], [], 'EUR', ['new']).length, 4)
})
test('FX uses saved converted cents and many tiny expenses remain zero-sum', () => {
  const records = Array.from({ length: 1000 }, () => expense({ originalAmount: 1, convertedAmount: 0.02, paidBy: [{ userId: 'a', amount: 0.3 }, { userId: 'b', amount: 0.7 }] }))
  const net = aggregateNetBalances(records, [], 'EUR')
  assert.equal([...net.values()].reduce((sum, n) => sum + Math.round(n * 100), 0), 0)
  for (const transfer of simplifyDebts(net)) {
    net.set(transfer.from, net.get(transfer.from) + transfer.amount)
    net.set(transfer.to, net.get(transfer.to) - transfer.amount)
  }
  assert.ok([...net.values()].every(n => Math.round(n * 100) === 0))
})
test('mixed currencies, malformed splits and unbalanced nets fail closed', () => {
  assert.throws(() => calculateBalances([expense({ groupCurrency: 'USD' })], [], 'EUR'), /invalid/)
  assert.throws(() => calculateBalances([expense({ paidBy: [] })], [], 'EUR'), /invalid/)
  assert.throws(() => calculateBalances([], [{ currency: 'EUR', fromUserId: 'a', toUserId: 'a', amount: 1 }], 'EUR'), /invalid/)
  assert.throws(() => simplifyDebts(new Map([['a', 1], ['b', -2]])), /zero/)
})
