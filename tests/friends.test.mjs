import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

let docs = new Map()
const users = { alice: { id: 'a' }, bob: { id: 'b' }, carol: { id: 'c' } }
const auth = { currentUser: { uid: 'a' } }
const ref = (_, collection, id) => ({ path: collection + '/' + id })
const api = {
  doc: ref, collection: () => ({}), query: () => ({}), where: () => ({}), onSnapshot: () => () => {},
  serverTimestamp: () => 'server-time',
  runTransaction: async (_, work) => {
    const pending = []
    const result = await work({
      get: async ref => ({ exists: () => docs.has(ref.path), data: () => docs.get(ref.path) }),
      set: (ref, data) => pending.push(() => docs.set(ref.path, data)),
      update: (ref, patch) => pending.push(() => docs.set(ref.path, { ...docs.get(ref.path), ...patch })),
      delete: ref => pending.push(() => docs.delete(ref.path)),
    })
    pending.forEach(write => write())
    return result
  },
}
globalThis.__friendsTest = { api, auth, users }
const url = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
const firestore = url(Object.keys(api).map(key => 'export const ' + key + ' = (...args) => globalThis.__friendsTest.api.' + key + '(...args)').join('\n'))
const config = url('export const db = {}; export const auth = globalThis.__friendsTest.auth')
const userApi = url('export const getUserByEmail = async email => globalThis.__friendsTest.users[email]')
let source = readFileSync(new URL('../src/api/friends.ts', import.meta.url), 'utf8')
for (const [name, value] of [['firebase/firestore', firestore], ['@/config/firebase', config], ['./users', userApi]]) source = source.replace("'" + name + "'", JSON.stringify(value))
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { sendFriendRequest, respondToFriendship, friendshipId } = await import(url(compiled))
function reset(uid = 'a') { docs = new Map(); auth.currentUser = { uid } }

test('friend request requires a different registered user and authentication', async () => {
  reset()
  await assert.rejects(sendFriendRequest('alice'), /yourself/)
  await assert.rejects(sendFriendRequest('unknown'), /No account/)
  auth.currentUser = null
  await assert.rejects(sendFriendRequest('bob'), /sign in/)
  assert.equal(docs.size, 0)
})

test('only the recipient can accept, and only once', async () => {
  reset()
  await sendFriendRequest('bob')
  assert.equal(docs.get('friendships/a:b').status, 'pending')
  await assert.rejects(respondToFriendship('a:b', 'accept'), /no longer available/)
  auth.currentUser = { uid: 'c' }
  await assert.rejects(respondToFriendship('a:b', 'accept'), /Permission denied/)
  await assert.rejects(respondToFriendship('a:b', 'remove'), /Permission denied/)
  auth.currentUser = { uid: 'b' }
  await respondToFriendship('a:b', 'accept')
  assert.equal(docs.get('friendships/a:b').status, 'accepted')
  await assert.rejects(respondToFriendship('a:b', 'accept'), /no longer available/)
})

test('duplicate and crossed invitations share one record', async () => {
  reset()
  assert.equal(friendshipId('a', 'b'), friendshipId('b', 'a'))
  await sendFriendRequest('bob')
  await assert.rejects(sendFriendRequest('bob'), /already exists/)
  auth.currentUser = { uid: 'b' }
  await assert.rejects(sendFriendRequest('alice'), /already exists/)
  assert.equal(docs.size, 1)
  await respondToFriendship('a:b', 'accept')
  await assert.rejects(sendFriendRequest('alice'), /already exists/)
})

test('sender can cancel, recipient can decline, either friend can remove', async () => {
  for (const actor of ['a', 'b']) {
    reset()
    await sendFriendRequest('bob')
    auth.currentUser = { uid: actor }
    await respondToFriendship('a:b', 'remove')
    assert.equal(docs.size, 0)
    await assert.rejects(respondToFriendship('a:b', 'accept'), /no longer available/)
    auth.currentUser = { uid: 'a' }
    await sendFriendRequest('bob')
    auth.currentUser = { uid: 'b' }
    await respondToFriendship('a:b', 'accept')
    auth.currentUser = { uid: actor }
    await respondToFriendship('a:b', 'remove')
    assert.equal(docs.size, 0)
  }
})
