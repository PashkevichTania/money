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
    assert.equal(url, 'https://api.frankfurter.app/2024-06-01?from=EUR&to=USD')
    return { data: { date: '2024-05-31', rates: { USD: 1.1 } } }
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
      axios.get = async () => ({ data: { date: '2024-06-01', rates: { USD: rate } } })
      await assert.rejects(getExchangeRate('EUR', 'USD', '2024-06-01'), /Failed to fetch/)
    }
    axios.get = async () => { throw new Error('offline') }
    await assert.rejects(getExchangeRate('EUR', 'USD'), /Failed to fetch/)
  } finally { axios.get = original }
})
