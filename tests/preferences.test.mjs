import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
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
const profiles = new Map();
const snapshot = (ref) => ({
  id: ref.id,
  exists: () => profiles.has(ref.id),
  data: () =>
    ref.converter.fromFirestore({
      id: ref.id,
      data: () => profiles.get(ref.id),
    }),
});
globalThis.__preferencesDb = {
  doc: (_db, _collection, id) => ({
    id,
    withConverter(converter) {
      return { id, converter };
    },
  }),
  getDoc: async (ref) => snapshot(ref),
  updateDoc: async (ref, patch) =>
    profiles.set(ref.id, { ...profiles.get(ref.id), ...patch }),
  setDoc: async (ref, profile) =>
    profiles.set(ref.id, ref.converter.toFirestore(profile)),
};
const firestore = compile(
  [
    'doc',
    'getDoc',
    'updateDoc',
    'setDoc',
    'collection',
    'documentId',
    'endAt',
    'getDocs',
    'limit',
    'orderBy',
    'query',
    'startAt',
    'where',
  ]
    .map(
      (name) =>
        `export const ${name} = (...args) => globalThis.__preferencesDb.${name}(...args);`
    )
    .join('\n')
);
let source = readFileSync(
  new URL('../src/api/users.ts', import.meta.url),
  'utf8'
);
for (const [name, value] of [
  ['firebase/firestore', firestore],
  [
    '@/config/firebase',
    compile('export const db = {}; export const isFirebaseConfigured = true;'),
  ],
  [
    '@/config/currencies',
    compile(
      "export const CURRENCIES = ['USD','EUR','BYN','RUB','GBP','JPY'].map(code => ({code}));"
    ),
  ],
])
  source = source.replaceAll(`'${name}'`, JSON.stringify(value));
const api = await import(compile(source));

test('preferences survive profile serialization, reload and independent account updates', async () => {
  const profile = {
    id: 'alice',
    displayName: 'Alice',
    email: 'a@example.com',
    photoURL: null,
    defaultCurrency: 'USD',
    createdAt: '2026-09-24',
  };
  await api.upsertUser(profile);
  await api.upsertUser({ ...profile, id: 'bob' });
  assert.deepEqual((await api.getUser('alice')).favoriteCurrencies, []);
  await api.updateProfile('alice', {
    favoriteCurrencies: ['BYN', 'EUR'],
    language: 'ru',
  });
  await api.updateProfile('alice', { defaultCurrency: 'EUR' });
  const saved = await api.getUser('alice');
  assert.deepEqual(saved.favoriteCurrencies, ['BYN', 'EUR']);
  assert.equal(saved.language, 'ru');
  await api.upsertUser(saved);
  assert.deepEqual(await api.getUser('alice'), saved);
  assert.deepEqual((await api.getUser('bob')).favoriteCurrencies, []);
  assert.equal((await api.getUser('bob')).language, undefined);
});

test('favorites reject duplicates, unknown currencies and a sixth currency without overwriting saved values', async () => {
  for (const favorites of [
    ['EUR', 'EUR'],
    ['INVALID'],
    ['USD', 'EUR', 'BYN', 'RUB', 'GBP', 'JPY'],
  ]) {
    await assert.rejects(
      api.updateProfile('alice', { favoriteCurrencies: favorites }),
      /five different currencies/
    );
  }
  assert.deepEqual((await api.getUser('alice')).favoriteCurrencies, [
    'BYN',
    'EUR',
  ]);
  await api.updateProfile('alice', {
    favoriteCurrencies: ['USD', 'EUR', 'BYN', 'RUB', 'GBP'],
  });
  assert.equal((await api.getUser('alice')).favoriteCurrencies.length, 5);
  await api.updateProfile('alice', { favoriteCurrencies: [] });
  assert.deepEqual((await api.getUser('alice')).favoriteCurrencies, []);
});
