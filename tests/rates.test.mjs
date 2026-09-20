import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import axios from 'axios'

const source = readFileSync(new URL('../src/api/rates.ts', import.meta.url), 'utf8')
  .replace("'axios'", JSON.stringify(import.meta.resolve('axios')))
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { getExchangeRate } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))

test('same currency skips the network', async () => {
  const original = axios.get
  axios.get = () => { throw new Error('Unexpected network call') }
  try {
    assert.deepEqual(await getExchangeRate('eur', 'EUR', '2024-06-01'), {
      rate: 1, date: '2024-06-01', source: 'identity',
    })
  } finally { axios.get = original }
})
test('historical request keeps the actual rate date returned by provider', async () => {
  const original = axios.get
  axios.get = async url => {
    assert.equal(url, 'https://api.frankfurter.dev/v2/rates?base=EUR&quotes=USD&date=2024-06-01')
    return { data: [{ date: '2024-05-31', base: 'EUR', quote: 'USD', rate: 1.1 }] }
  }
  try {
    assert.deepEqual(await getExchangeRate('eur', 'usd', '2024-06-01'), {
      rate: 1.1, date: '2024-05-31', source: 'frankfurter',
    })
  } finally { axios.get = original }
})
test('unsupported currencies, network errors and invalid rates reject', async () => {
  const original = axios.get
  try {
    for (const rate of [undefined, 0, -1, Infinity, NaN]) {
      axios.get = async () => ({ data: [{ date: '2024-06-01', base: 'EUR', quote: 'USD', rate }] })
      await assert.rejects(getExchangeRate('EUR', 'USD', '2024-06-01'), /Failed to fetch/)
    }
    axios.get = async () => { throw new Error('offline') }
    await assert.rejects(getExchangeRate('EUR', 'USD'), /Failed to fetch/)
  } finally { axios.get = original }
})

test('latest v2 response selects the requested pair and rejects malformed responses', async () => {
  const original = axios.get
  try {
    axios.get = async (url, options) => {
      assert.equal(url, 'https://api.frankfurter.dev/v2/rates?base=USD&quotes=GBP')
      assert.equal(options.timeout, 15000)
      return { data: [{ base: 'EUR', quote: 'GBP', rate: 9, date: '2026-09-18' }, { base: 'USD', quote: 'GBP', rate: 0.75, date: '2026-09-18' }] }
    }
    assert.equal((await getExchangeRate('usd', 'gbp')).rate, 0.75)
    for (const data of [[], {}, [{ base: 'USD', quote: 'GBP', rate: 1, date: 'bad' }]]) {
      axios.get = async () => ({ data })
      await assert.rejects(getExchangeRate('USD', 'GBP'), /Failed to fetch/)
    }
  } finally { axios.get = original }
})
