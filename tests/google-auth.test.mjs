import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const url = (source) =>
  'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const user = {
  uid: 'google-user',
  displayName: 'Google User',
  email: 'USER@EXAMPLE.COM',
  photoURL: 'https://example.com/avatar.png',
};
let stored, popupError, providerParameters, popupCalls;
const authAdapter = {
  createUserWithEmailAndPassword: async () => ({ user }),
  signInWithEmailAndPassword: async () => ({ user }),
  signInWithPopup: async (_auth, provider) => {
    popupCalls++;
    providerParameters = provider.parameters;
    if (popupError) throw popupError;
    return { user };
  },
  signOut: async () => {},
  onAuthStateChanged: () => () => {},
  updateProfile: async () => {},
};
globalThis.__googleAuthAdapter = authAdapter;
globalThis.__googleProfileAdapter = {
  doc: (_db, collection, id) => ({ collection, id }),
  getDoc: async () => ({ exists: () => !!stored, data: () => stored }),
  setDoc: async (_ref, data, options) => {
    stored = options?.merge ? { ...stored, ...data } : data;
  },
};
const authModule = url(
  Object.keys(authAdapter)
    .map(
      (key) =>
        `export const ${key} = (...args) => globalThis.__googleAuthAdapter.${key}(...args)`
    )
    .join('\n') +
    '\nexport class GoogleAuthProvider { setCustomParameters(parameters) { this.parameters = parameters } }'
);
const firestoreModule = url(
  ['doc', 'getDoc', 'setDoc']
    .map(
      (key) =>
        `export const ${key} = (...args) => globalThis.__googleProfileAdapter.${key}(...args)`
    )
    .join('\n')
);
async function loadStore(configured) {
  let source = readFileSync(
    new URL('../src/stores/authStore.ts', import.meta.url),
    'utf8'
  );
  for (const [name, value] of [
    ['zustand', import.meta.resolve('zustand')],
    ['firebase/auth', authModule],
    ['firebase/firestore', firestoreModule],
    [
      '@/config/firebase',
      url(
        `export const auth = {}; export const db = {}; export const isFirebaseConfigured = ${configured}`
      ),
    ],
    ['@/config/currencies', url("export const DEFAULT_BASE_CURRENCY = 'USD'")],
    [
      '@/utils/dates',
      url("export const nowIso = () => '2026-09-20T00:00:00.000Z'"),
    ],
  ])
    source = source.replaceAll(`'${name}'`, JSON.stringify(value));
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return (await import(url(compiled))).useAuthStore;
}
const store = await loadStore(true);
function reset() {
  stored = null;
  popupError = null;
  providerParameters = null;
  popupCalls = 0;
  store.setState({
    status: 'unauthenticated',
    profile: null,
    firebaseUser: null,
    error: null,
  });
}
test('Google sign-in creates the standard profile and selects an account', async () => {
  reset();
  await store.getState().loginWithGoogle();
  assert.equal(store.getState().status, 'authenticated');
  assert.deepEqual(providerParameters, { prompt: 'select_account' });
  assert.deepEqual(stored, {
    id: user.uid,
    displayName: user.displayName,
    email: 'user@example.com',
    photoURL: user.photoURL,
    defaultCurrency: 'USD',
    createdAt: '2026-09-20T00:00:00.000Z',
  });
  assert.deepEqual(store.getState().profile, stored);
});
test('returning Google user keeps their profile and currency preference', async () => {
  reset();
  stored = {
    id: user.uid,
    displayName: 'My custom name',
    email: 'user@example.com',
    defaultCurrency: 'EUR',
    createdAt: '2024-01-01',
  };
  const existing = { ...stored };
  await store.getState().loginWithGoogle();
  assert.deepEqual(stored, existing);
  assert.deepEqual(store.getState().profile, existing);
});
test('closing or cancelling a popup returns to the idle form without an error', async () => {
  for (const code of [
    'auth/popup-closed-by-user',
    'auth/cancelled-popup-request',
  ]) {
    reset();
    popupError = { code };
    await assert.rejects(store.getState().loginWithGoogle());
    assert.equal(store.getState().status, 'unauthenticated');
    assert.equal(store.getState().error, null);
    assert.equal(stored, null);
  }
});
test('blocked popup, disabled provider, network and domain failures are actionable', async () => {
  for (const [code, message] of [
    ['auth/popup-blocked', /Allow pop-ups/],
    ['auth/operation-not-allowed', /not enabled/],
    ['auth/unauthorized-domain', /not available on this site/],
    ['auth/network-request-failed', /internet connection/],
    ['auth/account-exists-with-different-credential', /another sign-in method/],
  ]) {
    reset();
    popupError = { code };
    await assert.rejects(store.getState().loginWithGoogle());
    assert.equal(store.getState().status, 'unauthenticated');
    assert.match(store.getState().error, message);
    assert.equal(stored, null);
  }
});
test('an in-progress sign-in cannot open a second popup', async () => {
  reset();
  store.setState({ status: 'loading' });
  await store.getState().loginWithGoogle();
  assert.equal(popupCalls, 0);
});
test('unconfigured workspace reports an error without calling Google', async () => {
  reset();
  const unconfigured = await loadStore(false);
  await assert.rejects(
    unconfigured.getState().loginWithGoogle(),
    /workspace is configured/
  );
  assert.match(unconfigured.getState().error, /workspace is configured/);
  assert.equal(popupCalls, 0);
});
