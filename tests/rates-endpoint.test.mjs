import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const code = ts.transpileModule(
  readFileSync(new URL('../api/rates.ts', import.meta.url), 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;
const { GET } = await import(
  'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
);
const request = (query) =>
  new Request('https://app.example/api/rates?' + query);

test('rates endpoint validates input, hides credentials and normalizes the table', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.EXCHANGE_RATE_API_KEY;
  let calls = 0;
  try {
    process.env.EXCHANGE_RATE_API_KEY = 'test-secret';
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(url, 'https://v6.exchangerate-api.com/v6/latest/USD');
      assert.equal(options.headers.Authorization, 'Bearer test-secret');
      assert.ok(options.signal);
      return Response.json({
        result: 'success',
        base_code: 'USD',
        conversion_rates: { USD: 1, EUR: 0.9 },
        time_last_update_unix: 1704067200,
        time_next_update_unix: 1704153600,
      });
    };
    for (const query of ['', 'base=../secret', 'base=USD&base=EUR']) {
      assert.equal((await GET(request(query))).status, 400);
    }
    assert.equal(calls, 0);
    const response = await GET(request('base=usd'));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await response.json(), {
      base: 'USD',
      rates: { USD: 1, EUR: 0.9 },
      date: '2024-01-01',
      nextUpdate: 1704153600000,
    });
    delete process.env.EXCHANGE_RATE_API_KEY;
    assert.equal((await GET(request('base=USD'))).status, 503);
    assert.equal(calls, 1);
    process.env.EXCHANGE_RATE_API_KEY = 'test-secret';
    for (const data of [
      { result: 'error', 'error-type': 'quota-reached' },
      {},
      { result: 'success', base_code: 'EUR' },
    ]) {
      globalThis.fetch = async () => Response.json(data);
      const failed = await GET(request('base=USD'));
      assert.equal(failed.status, 502);
      assert.deepEqual(await failed.json(), { error: 'Rates unavailable' });
    }
    globalThis.fetch = async () => {
      throw new Error('test-secret');
    };
    const failed = await GET(request('base=USD'));
    assert.equal(failed.status, 502);
    assert.ok(!(await failed.text()).includes('test-secret'));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.EXCHANGE_RATE_API_KEY;
    else process.env.EXCHANGE_RATE_API_KEY = originalKey;
  }
});
