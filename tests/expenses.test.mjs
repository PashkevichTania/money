import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const compile = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
let docs, concurrentChange
globalThis.__expenseAuth = { currentUser: { uid: 'a' } }
const ref = path => ({ path, id: path.split('/').at(-1), withConverter() { return this } })
const snap = reference => {
  const value = structuredClone(docs.get(reference.path))
  return { exists: () => value !== undefined, data: () => value, get: key => value?.[key] }
}
const api = {
  doc: (parent, ...parts) => ref(parent.path ? `${parent.path}/${parts.join('/') || 'new-expense'}` : parts.join('/')),
  collection: (_, ...parts) => ref(parts.join('/')),
  getDoc: async reference => snap(reference),
  deleteDoc: async reference => docs.delete(reference.path),
  query: reference => reference, orderBy: () => ({}), limit: () => ({}), onSnapshot: () => () => {},
  getDocs: async reference => ({ forEach: callback => [...docs].filter(([path]) => path.startsWith(reference.path + '/')).forEach(([, value]) => callback({ data: () => value })) }),
  runTransaction: async (_, fn) => {
    if (concurrentChange) concurrentChange()
    const writes = []
    await fn({ get: async reference => snap(reference), update: (reference, value) => writes.push(() => docs.set(reference.path, { ...docs.get(reference.path), ...value })), set: (reference, value) => writes.push(() => docs.set(reference.path, structuredClone(value))) })
    writes.forEach(write => write())
  },
}
globalThis.__expenseApiTest = api
const firestore = compile(Object.keys(api).map(key => `export const ${key} = (...args) => globalThis.__expenseApiTest.${key}(...args)`).join('\n'))
const currency = compile(read('../src/utils/currency.ts'))
const split = compile(read('../src/utils/split.ts').replace("'./currency'", JSON.stringify(currency)))
let source = read('../src/api/expenses.ts')
for (const [key, value] of [['firebase/firestore', firestore], ['@/config/firebase', compile('export const db = {}; export const isFirebaseConfigured = true; export const auth = globalThis.__expenseAuth')], ['@/types/expense', compile(read('../src/types/expense.ts'))], ['@/utils/currency', currency], ['@/utils/split', split], ['@/utils/dates', compile("export const nowIso = () => '2026-09-20T00:00:00.000Z'")]]) source = source.replaceAll(`'${key}'`, JSON.stringify(value))
const { createExpense, updateExpense, listExpenses, deleteExpense } = await import(compile(source))
const input = () => ({ groupId: 'g', title: ' Dinner ', originalAmount: 100, originalCurrency: 'EUR', convertedAmount: 100, groupCurrency: 'EUR', paidBy: [{ userId: 'a', amount: 100 }], participants: [{ userId: 'a', value: 60 }, { userId: 'b', value: 40 }], splitType: 'exact', expenseDate: '2026-09-20', createdBy: 'a' })
const reset = () => { docs = new Map([['groups/g', { baseCurrency: 'EUR', memberIds: ['a', 'b'], hasExpenseHistory: false }]]); concurrentChange = undefined }

test('expense create/list/edit/delete round trip retains group expense history', async () => {
  reset()
  const expense = await createExpense(input())
  assert.equal(expense.title, 'Dinner')
  assert.equal(docs.get('groups/g').hasExpenseHistory, true)
  assert.equal((await listExpenses('g')).length, 1)
  const updated = await updateExpense('g', expense.id, { title: 'Lunch', updatedBy: 'a' })
  assert.equal(updated.title, 'Lunch')
  assert.equal(updated.createdBy, 'a')
  assert.equal(updated.updatedBy, 'a')
  await deleteExpense('g', expense.id)
  assert.deepEqual(await listExpenses('g'), [])
  assert.equal(docs.get('groups/g').hasExpenseHistory, true)
})
test('failed validation never marks history or writes an expense', async () => {
  for (const patch of [{ title: ' ' }, { splitType: 'unknown' }, { convertedAmount: 99 }, { paidBy: [{ userId: 'a', amount: 80 }] }, { participants: [{ userId: 'stranger', value: 100 }] }, { groupCurrency: 'USD', originalCurrency: 'USD' }]) {
    reset()
    await assert.rejects(createExpense({ ...input(), ...patch }))
    assert.equal(docs.size, 1)
    assert.equal(docs.get('groups/g').hasExpenseHistory, false)
  }
})
test('FX creation and metadata edit preserve the saved exchange rate', async () => {
  reset()
  const expense = await createExpense({ ...input(), originalCurrency: 'USD', convertedAmount: 90, rateSnapshot: { rate: 0.9, date: '2026-09-18', source: 'test' } })
  const next = await updateExpense('g', expense.id, { title: 'Updated', updatedBy: 'a' })
  assert.equal(next.convertedAmount, 90)
  assert.deepEqual(next.rateSnapshot, expense.rateSnapshot)
})
test('concurrent edits and deletion locks reject stale expense writes', async () => {
  reset()
  const expense = await createExpense(input())
  concurrentChange = () => { docs.get(`groups/g/expenses/${expense.id}`).updatedAt = 'newer-version' }
  await assert.rejects(updateExpense('g', expense.id, { title: 'Overwrite', updatedBy: 'a' }), /changed or was deleted/)
  concurrentChange = undefined
  docs.get('groups/g').deleting = true
  await assert.rejects(createExpense(input()), /being deleted/)
})

test('non-authors and signed-out users cannot edit or delete expenses, even with spoofed updatedBy', async () => {
  reset()
  const expense = await createExpense(input())
  try {
    for (const user of [{ uid: 'b' }, null]) {
      globalThis.__expenseAuth.currentUser = user
      await assert.rejects(updateExpense('g', expense.id, { title: 'Forbidden', updatedBy: 'a' }), /Only the expense author/)
      await assert.rejects(deleteExpense('g', expense.id), /Only the expense author/)
      assert.equal(docs.get(`groups/g/expenses/${expense.id}`).title, 'Dinner')
    }
  } finally { globalThis.__expenseAuth.currentUser = { uid: 'a' } }
})

test('expense type is optional, retained on unrelated edits, changeable and removable', async () => {
  reset()
  const untyped = await createExpense(input())
  assert.equal(untyped.type, undefined)
  const expense = await createExpense({ ...input(), type: 'food' })
  assert.equal(expense.type, 'food')
  assert.equal((await updateExpense('g', expense.id, { title: 'Lunch', updatedBy: 'a' })).type, 'food')
  assert.equal((await updateExpense('g', expense.id, { type: 'housing', updatedBy: 'a' })).type, 'housing')
  assert.equal((await updateExpense('g', expense.id, { type: undefined, updatedBy: 'a' })).type, undefined)
  await assert.rejects(createExpense({ ...input(), type: 'invalid' }), /Unsupported expense type/)
})
