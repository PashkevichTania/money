import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import axios from 'axios';

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
const queryModule = compile(
  readFileSync(
    new URL('../src/lib/queryClient.ts', import.meta.url),
    'utf8'
  ).replace(
    "'@tanstack/react-query'",
    JSON.stringify(import.meta.resolve('@tanstack/react-query'))
  )
);
const { queryClient } = await import(queryModule);
beforeEach(() => queryClient.clear());
afterEach(() => queryClient.clear());

const source = readFileSync(
  new URL('../src/api/rates.ts', import.meta.url),
  'utf8'
)
  .replace("'axios'", JSON.stringify(import.meta.resolve('axios')))
  .replace("'@/lib/queryClient'", JSON.stringify(queryModule));
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { getExchangeRate, exchangeRateQueryOptions } = await import(
  'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
);

test('same currency skips the network', async () => {
  const original = axios.get;
  axios.get = () => {
    throw new Error('Unexpected network call');
  };
  try {
    assert.deepEqual(await getExchangeRate('eur', 'EUR', '2024-06-01'), {
      rate: 1,
      date: '2024-06-01',
      source: 'identity',
    });
  } finally {
    axios.get = original;
  }
});
test('historical request keeps the actual rate date returned by provider', async () => {
  const original = axios.get;
  axios.get = async (url) => {
    assert.equal(
      url,
      'https://api.frankfurter.dev/v2/rates?base=EUR&quotes=USD&date=2024-06-01'
    );
    return {
      data: [{ date: '2024-05-31', base: 'EUR', quote: 'USD', rate: 1.1 }],
    };
  };
  try {
    const { expiresAt, ...result } = await getExchangeRate(
      'eur',
      'usd',
      '2024-06-01'
    );
    assert.ok(expiresAt > Date.now());
    assert.deepEqual(result, {
      rate: 1.1,
      date: '2024-05-31',
      source: 'frankfurter',
    });
  } finally {
    axios.get = original;
  }
});
test('unsupported currencies, network errors and invalid rates reject', async () => {
  const original = axios.get;
  try {
    for (const rate of [undefined, 0, -1, Infinity, NaN]) {
      axios.get = async () => ({
        data: [{ date: '2024-06-01', base: 'EUR', quote: 'USD', rate }],
      });
      await assert.rejects(
        getExchangeRate('EUR', 'USD', '2024-06-01'),
        /Failed to fetch/
      );
    }
    axios.get = async () => {
      throw new Error('offline');
    };
    await assert.rejects(getExchangeRate('EUR', 'USD'), /Failed to fetch/);
  } finally {
    axios.get = original;
  }
});

test('latest v2 response selects the requested pair and rejects malformed responses', async () => {
  const original = axios.get;
  try {
    axios.get = async (url, options) => {
      if (url === '/api/rates') throw new Error('Primary unavailable');
      assert.equal(
        url,
        'https://api.frankfurter.dev/v2/rates?base=USD&quotes=GBP'
      );
      assert.equal(options.timeout, 15000);
      return {
        data: [
          { base: 'EUR', quote: 'GBP', rate: 9, date: '2026-09-18' },
          { base: 'USD', quote: 'GBP', rate: 0.75, date: '2026-09-18' },
        ],
      };
    };
    assert.equal((await getExchangeRate('usd', 'gbp')).rate, 0.75);
    for (const data of [
      [],
      {},
      [{ base: 'USD', quote: 'GBP', rate: 1, date: 'bad' }],
    ]) {
      axios.get = async () => ({ data });
      await assert.rejects(getExchangeRate('USD', 'GBP'), /Failed to fetch/);
    }
  } finally {
    axios.get = original;
  }
});

test('primary table is shared between pairs, concurrent requests and today', async () => {
  const original = axios.get;
  let calls = 0;
  const today = new Date().toISOString().slice(0, 10);
  axios.get = async (url, options) => {
    calls++;
    assert.equal(url, '/api/rates');
    assert.equal(options.params.base, 'USD');
    return {
      data: {
        base: 'USD',
        rates: { USD: 1, EUR: 0.9, GBP: 0.75 },
        date: today,
        nextUpdate: Date.now() + 3600000,
      },
    };
  };
  try {
    const [eur, gbp] = await Promise.all([
      queryClient.fetchQuery(exchangeRateQueryOptions('usd', 'EUR')),
      queryClient.fetchQuery(exchangeRateQueryOptions('USD', 'GBP', today)),
    ]);
    assert.equal(eur.source, 'exchangerate-api');
    assert.equal(eur.rate, 0.9);
    assert.equal(gbp.rate, 0.75);
    await queryClient.fetchQuery(exchangeRateQueryOptions('USD', 'EUR'));
    assert.equal(calls, 1);
  } finally {
    axios.get = original;
  }
});

test('primary failure has a cooldown while Frankfurter retains the actual source', async () => {
  const original = axios.get;
  let primaryCalls = 0;
  axios.get = async (url) => {
    if (url === '/api/rates') {
      primaryCalls++;
      throw new Error('quota');
    }
    const params = new URL(url).searchParams;
    return {
      data: [
        {
          base: 'USD',
          quote: params.get('quotes'),
          date: '2026-09-18',
          rate: 0.8,
        },
      ],
    };
  };
  try {
    for (const currency of ['EUR', 'GBP']) {
      assert.equal(
        (await getExchangeRate('USD', currency)).source,
        'frankfurter'
      );
    }
    assert.equal(primaryCalls, 1);
  } finally {
    axios.get = original;
  }
});

test('missing primary quote falls back without throwing away the table', async () => {
  const original = axios.get;
  let primaryCalls = 0;
  axios.get = async (url) => {
    if (url === '/api/rates') {
      primaryCalls++;
      return {
        data: {
          base: 'USD',
          rates: { USD: 1, EUR: 0.9 },
          date: '2026-09-18',
          nextUpdate: Date.now() + 3600000,
        },
      };
    }
    return {
      data: [{ base: 'USD', quote: 'GBP', rate: 0.75, date: '2026-09-18' }],
    };
  };
  try {
    assert.equal((await getExchangeRate('USD', 'GBP')).source, 'frankfurter');
    assert.equal(
      (await getExchangeRate('USD', 'EUR')).source,
      'exchangerate-api'
    );
    assert.equal(primaryCalls, 1);
  } finally {
    axios.get = original;
  }
});

test('invalid and future dates make no requests; expired cache refreshes', async () => {
  const original = axios.get;
  let calls = 0;
  axios.get = async () => {
    calls++;
    throw new Error('offline');
  };
  try {
    await assert.rejects(
      getExchangeRate('USD', 'EUR', '9999-01-01'),
      /future dates/
    );
    await assert.rejects(
      getExchangeRate('USD', 'EUR', '2024-02-31'),
      /Invalid/
    );
    assert.equal(calls, 0);
    queryClient.setQueryData(
      ['exchange-rate-table', 'USD'],
      {
        base: 'USD',
        rates: { USD: 1, EUR: 0.9 },
        date: '2024-01-01',
        nextUpdate: Date.now() - 1000,
      },
      { updatedAt: Date.now() - 86400000 }
    );
    await assert.rejects(getExchangeRate('USD', 'EUR'), /Failed to fetch/);
    assert.equal(calls, 2);
  } finally {
    axios.get = original;
  }
});
