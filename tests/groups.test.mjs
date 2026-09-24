import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// In-memory Firestore adapter exercises API ordering and retry behavior.
// Security rules still require the real Firestore emulator.
let docs, failBatch, events
const ref = path => ({ path, id: path.split('/').at(-1), withConverter() { return this } })
const snapshot = reference => ({ ref: reference, exists: () => docs.has(reference.path),
  data: () => docs.get(reference.path), get: key => docs.get(reference.path)?.[key] })
const api = {
  runTransaction: async (_, work) => work({ get: async reference => snapshot(reference), update: async (reference, patch) => api.updateDoc(reference, patch) }),
  collection: (_, ...parts) => ref(parts.join('/')),
  doc: (parent, ...parts) => ref(parent.path ? `${parent.path}/${parts.join('/') || 'new-group'}` : parts.join('/')),
  getDoc: async reference => snapshot(reference),
  query: (reference, ...constraints) => ({ ...reference, constraints }),
  limit: count => ({ count }), where: () => ({}),
  getDocs: async reference => {
    const count = reference.constraints?.find(c => c.count)?.count ?? Infinity
    const children = [...docs.keys()].filter(p => p.startsWith(reference.path + '/') && p.split('/').length === reference.path.split('/').length + 1)
      .slice(0, count).map(p => snapshot(ref(p)))
    return { empty: !children.length, docs: children }
  },
  updateDoc: async (reference, patch) => {
    if (!docs.has(reference.path)) throw new Error('Missing parent')
    docs.set(reference.path, { ...docs.get(reference.path), ...patch })
    events.push(['update', reference.path])
  },
  deleteDoc: async reference => { docs.delete(reference.path); events.push(['delete', reference.path]) },
  setDoc: async (reference, value) => docs.set(reference.path, value),
  writeBatch: () => {
    const children = []
    return { delete: reference => children.push(reference), commit: async () => {
      if (failBatch) { failBatch = false; throw new Error('offline') }
      for (const child of children) { docs.delete(child.path); events.push(['delete', child.path]) }
    } }
  },
}
globalThis.__groupTestFirestore = api
const url = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
const firestore = url(Object.keys(api).map(key => `export const ${key} = (...args) => globalThis.__groupTestFirestore.${key}(...args)`).join('\n'))
globalThis.__groupAuth = { currentUser: { uid: 'a' } }
const config = url('export const db = {}; export const isFirebaseConfigured = true; export const auth = globalThis.__groupAuth')
const dates = url("export const nowIso = () => '2026-09-19T00:00:00.000Z'")
let source = readFileSync(new URL('../src/api/groups.ts', import.meta.url), 'utf8')
for (const [name, value] of [['firebase/firestore', firestore], ['@/config/firebase', config], ['@/utils/dates', dates]]) {
  source = source.replace(`'${name}'`, JSON.stringify(value))
}
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { createGroup, getGroup, updateGroup, deleteGroup, addMemberToGroup, removeMemberFromGroup } = await import(url(compiled))
function reset(history = false) {
  docs = new Map([['groups/g', { id: 'g', name: 'Trip', createdBy: 'a', baseCurrency: 'EUR', memberIds: ['a', 'b'], hasExpenseHistory: history }]])
  events = []; failBatch = false
}
test('currency cannot change even for an empty group', async () => {
  reset()
  await assert.rejects(updateGroup('g', { baseCurrency: 'USD' }), /cannot be changed/)
  assert.equal(docs.get('groups/g').baseCurrency, 'EUR')
  assert.equal(events.length, 0)
})

test('create, read, rename and add member preserve currency and deduplicate members', async () => {
  reset()
  const group = await createGroup({ name: ' Trip ', baseCurrency: 'EUR', memberIds: ['a', 'a'], createdBy: 'a' })
  assert.equal((await getGroup(group.id)).name, 'Trip')
  assert.deepEqual(group.memberIds, ['a'])
  await updateGroup(group.id, { name: ' Holiday ' })
  docs.set('friendships/a:b', { status: 'accepted', memberIds: ['a', 'b'] })
  await addMemberToGroup(group.id, 'b')
  await addMemberToGroup(group.id, 'b')
  const updated = await getGroup(group.id)
  assert.equal(updated.name, 'Holiday')
  assert.equal(updated.baseCurrency, 'EUR')
  assert.deepEqual(updated.memberIds, ['a', 'b'])
})
test('empty groups allow member removal; expense history prevents it', async () => {
  reset()
  await removeMemberFromGroup('g', 'b')
  assert.deepEqual(docs.get('groups/g').memberIds, ['a'])
  reset(true)
  await assert.rejects(removeMemberFromGroup('g', 'b'), /history must be retained/)
  assert.deepEqual(docs.get('groups/g').memberIds, ['a', 'b'])
})
test('unknown legacy history prevents member removal', async () => {
  reset()
  delete docs.get('groups/g').hasExpenseHistory
  await assert.rejects(removeMemberFromGroup('g', 'b'), /history must be retained/)
})
test('deletion locks writes, cleans multiple batches and all ledger collections before parent', async () => {
  reset(true)
  for (let i = 0; i < 405; i++) docs.set(`groups/g/expenses/${i}`, {})
  docs.set('groups/g/settlements/s', {})
  docs.set('groups/g/activity/a', {})
  await deleteGroup('g')
  assert.equal(docs.size, 0)
  assert.deepEqual(events[0], ['update', 'groups/g'])
  assert.deepEqual(events.at(-1), ['delete', 'groups/g'])
})
test('failed cleanup retains locked parent and can be retried', async () => {
  reset(true)
  docs.set('groups/g/expenses/e', {})
  failBatch = true
  await assert.rejects(deleteGroup('g'), /retry deletion/)
  assert.equal(docs.get('groups/g').deleting, true)
  assert.ok(docs.has('groups/g/expenses/e'))
  await deleteGroup('g')
  assert.equal(docs.size, 0)
})

test('only group author may initiate deletion; creator membership is retained', async () => {
  reset()
  await assert.rejects(removeMemberFromGroup('g', 'a'), /author must remain/)
  try {
    for (const user of [{ uid: 'b' }, null]) {
      globalThis.__groupAuth.currentUser = user
      await assert.rejects(deleteGroup('g'), /Only the group author/)
      assert.equal(docs.get('groups/g').deleting, undefined)
      assert.equal(events.length, 0)
    }
  } finally { globalThis.__groupAuth.currentUser = { uid: 'a' } }
})

test('group additions require accepted friendship with the acting member', async () => {
  reset()
  await assert.rejects(addMemberToGroup('g', 'c'), /Only confirmed friends/)
  docs.set('friendships/a:c', { status: 'pending', memberIds: ['a', 'c'] })
  await assert.rejects(addMemberToGroup('g', 'c'), /Only confirmed friends/)
  await assert.rejects(updateGroup('g', { memberIds: ['a', 'b', 'c'] }), /Only confirmed friends/)
  docs.set('friendships/b:c', { status: 'accepted', memberIds: ['b', 'c'] })
  await assert.rejects(addMemberToGroup('g', 'c'), /Only confirmed friends/)
  docs.set('friendships/a:c', { status: 'accepted', memberIds: ['a', 'c'] })
  await addMemberToGroup('g', 'c')
  docs.delete('friendships/a:c')
  assert.deepEqual(docs.get('groups/g').memberIds, ['a', 'b', 'c'])
})

test('group creation cannot bypass friendship consent', async () => {
  reset()
  await assert.rejects(createGroup({ name: 'Trip', baseCurrency: 'EUR', memberIds: ['a', 'c'], createdBy: 'a' }), /confirmed friends/)
})
