import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const compile = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')
let docs, writes, failAfterCommit
globalThis.__settlementAuth = { currentUser: { uid: 'b' } }
const snap = reference => {
  const value = structuredClone(docs.get(reference.path))
  return { exists: () => value !== undefined, data: () => value, get: key => value?.[key] }
}
const api = {
  doc: (_, ...parts) => ({ path: parts.join('/') }),
  collection: (_, ...parts) => ({ path: parts.join('/') }),
  onSnapshot: () => () => {},
  getDoc: async reference => snap(reference),
  deleteDoc: async reference => { docs.delete(reference.path); writes++ },
  runTransaction: async (_, action) => {
    const operations = []
    const result = await action({
      get: async reference => snap(reference),
      set: (reference, value) => operations.push(() => docs.set(reference.path, structuredClone(value))),
      update: (reference, patch) => operations.push(() => docs.set(reference.path, { ...docs.get(reference.path), ...patch })),
    })
    for (const operation of operations) { operation(); writes++ }
    if (failAfterCommit) { failAfterCommit = false; throw new Error('Connection lost after commit') }
    return result
  },
}
globalThis.__settlementApi = api
const firestore = compile(Object.keys(api).map(key => `export const ${key} = (...args) => globalThis.__settlementApi.${key}(...args)`).join('\n'))
let source = readFileSync(new URL('../src/api/settlements.ts', import.meta.url), 'utf8')
for (const [key, value] of [['firebase/firestore', firestore], ['@/config/firebase', compile('export const db = {}; export const isFirebaseConfigured = true; export const auth = globalThis.__settlementAuth')], ['@/utils/dates', compile("export const nowIso = () => '2026-09-20T12:00:00.000Z'")]]) source = source.replace(`'${key}'`, JSON.stringify(value))
const { createSettlement, deleteSettlement } = await import(compile(source))
const input = (patch = {}) => ({ groupId: 'g', fromUserId: 'b', toUserId: 'a', amount: 12.34, currency: 'EUR', ...patch })
function reset(history = true) {
  docs = new Map([['groups/g', { memberIds: ['a', 'b', 'c'], baseCurrency: 'EUR', hasExpenseHistory: history }]])
  globalThis.__settlementAuth.currentUser = { uid: 'b' }; writes = 0; failAfterCommit = false
}
test('records partial payment in group currency with one write when history exists', async () => {
  reset()
  const saved = await createSettlement('payment-1', input({ note: ' Thanks ' }))
  assert.equal(saved.createdBy, 'b'); assert.equal(saved.note, 'Thanks')
  assert.equal(saved.amount, 12.34)
  assert.equal(docs.get('groups/g/settlements/payment-1').amountMinor, 1234)
  assert.equal(writes, 1)
})
test('first payment preserves participant history atomically', async () => {
  reset(false)
  await createSettlement('first', input())
  assert.equal(docs.get('groups/g').hasExpenseHistory, true)
  assert.equal(writes, 2)
})
test('sender or recipient can record, but third member and anonymous caller cannot', async () => {
  reset()
  globalThis.__settlementAuth.currentUser = { uid: 'a' }
  assert.equal((await createSettlement('received', input())).createdBy, 'a')
  for (const user of [{ uid: 'c' }, null]) {
    globalThis.__settlementAuth.currentUser = user
    await assert.rejects(createSettlement('forbidden', input()), /sender or recipient|signed in/)
  }
  assert.equal(writes, 1)
})
test('rejects invalid money, participants, currency and deletion lock without writes', async () => {
  for (const patch of [{ amount: 0 }, { amount: -1 }, { amount: NaN }, { amount: Infinity }, { amount: 1.001 }, { amount: 1e10 }, { toUserId: 'b' }, { toUserId: 'outsider' }, { currency: 'USD' }, { note: 'x'.repeat(501) }]) {
    reset(false)
    await assert.rejects(createSettlement('bad', input(patch)))
    assert.equal(writes, 0)
    assert.equal(docs.get('groups/g').hasExpenseHistory, false)
  }
  reset(); docs.get('groups/g').deleting = true
  await assert.rejects(createSettlement('locked', input()), /being deleted/)
  assert.equal(writes, 0)
})
test('uncertain save can be retried with the same identifier without duplicating payment', async () => {
  reset(); failAfterCommit = true
  await assert.rejects(createSettlement('stable-id', input()), /Connection lost/)
  const saved = await createSettlement('stable-id', input())
  assert.equal(saved.id, 'stable-id'); assert.equal(writes, 1)
  await assert.rejects(createSettlement('stable-id', input({ amount: 20 })), /different details/)
  assert.equal(docs.size, 2)
})
test('only author can delete payment; retrying completed deletion is harmless', async () => {
  reset()
  await createSettlement('payment', input())
  globalThis.__settlementAuth.currentUser = { uid: 'a' }
  await assert.rejects(deleteSettlement('g', 'payment'), /Only the author/)
  globalThis.__settlementAuth.currentUser = { uid: 'b' }
  await deleteSettlement('g', 'payment')
  await deleteSettlement('g', 'payment')
  assert.equal(docs.size, 1)
  assert.equal(docs.get('groups/g').hasExpenseHistory, true)
})
