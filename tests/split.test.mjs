import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const transpile = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString('base64')
const currency = transpile(readFileSync(new URL('../src/utils/currency.ts', import.meta.url), 'utf8'))
const source = readFileSync(new URL('../src/utils/split.ts', import.meta.url), 'utf8').replace("'./currency'", JSON.stringify(currency))
const { computeNetBalances, resolveOwedPerUser, allocateMoney, validateSplit, buildParticipants } = await import(transpile(source))
const cents = values => Math.round(values.reduce((a, b) => a + b, 0) * 100)

for (const splitType of ['equal', 'exact', 'percentage', 'shares']) {
  for (const rate of [1, 1.1, 0.3333, 1.2345]) {
    test(`${splitType}, rate ${rate}, multiple payers conserve total`, () => {
      const values = splitType === 'equal' ? [1, 1, 1] : splitType === 'percentage' ? [20, 30, 50] : [2, 3, 5]
      const expense = {
        originalAmount: 10, convertedAmount: Math.round(10 * rate * 100) / 100,
        originalCurrency: 'EUR', groupCurrency: rate === 1 ? 'EUR' : 'USD',
        rateSnapshot: { rate }, splitType,
        participants: values.map((value, i) => ({ userId: String(i), value })),
        paidBy: [{ userId: '0', amount: 3.33 }, { userId: 'payer', amount: 6.67 }],
      }
      assert.deepEqual(validateSplit(expense), [])
      const owed = Object.values(resolveOwedPerUser(expense.convertedAmount, expense.participants, splitType))
      assert.equal(cents(owed), Math.round(expense.convertedAmount * 100))
      assert.ok(owed.every(v => v >= 0))
      assert.equal(cents(Object.values(computeNetBalances(expense))), 0)
    })
  }
}
test('exact FX shares use the converted total', () => {
  assert.deepEqual(resolveOwedPerUser(110, [{ userId: 'a', value: 60 }, { userId: 'b', value: 40 }], 'exact'), { a: 66, b: 44 })
})
test('tiny amounts never create negative shares, including many participants', () => {
  assert.deepEqual(allocateMoney(0.02, [1, 1, 1, 1]), [0.01, 0.01, 0, 0])
  for (let total = 1; total < 200; total++) {
    for (let count = 1; count < 40; count++) {
      const shares = allocateMoney(total / 100, Array.from({ length: count }, (_, i) => i % 7))
      if (count === 1) continue
      assert.equal(cents(shares), total)
      assert.ok(shares.every(v => v >= 0))
    }
  }
})
test('rejects invalid money and duplicate identities', () => {
  for (const amount of [NaN, Infinity, -1, 0]) {
    assert.ok(validateSplit({ originalAmount: amount, paidBy: [], participants: [], splitType: 'equal' }).length)
  }
  assert.ok(validateSplit({ originalAmount: 1, paidBy: [{ userId: 'a', amount: 1 }], participants: [{ userId: 'a', value: -1 }], splitType: 'exact' }).length)
})

test('share inputs retain entered values and reject fractional or zero weights', () => {
  for (const value of [0, -1, 1.5]) {
    const participants = buildParticipants('shares', ['a'], { a: value })
    assert.equal(participants[0].value, value)
    assert.ok(validateSplit({ originalAmount: 1, paidBy: [{ userId: 'a', amount: 1 }], participants, splitType: 'shares' }).some(e => e.field === 'split.shares'))
  }
  assert.equal(buildParticipants('shares', ['a'], {})[0].value, 1)
})
