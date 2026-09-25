import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const en = JSON.parse(read('../src/i18n/en.json'));
const be = JSON.parse(read('../src/i18n/be.json'));
const ru = JSON.parse(read('../src/i18n/ru.json'));
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

async function setup(t, initial, blocked = false) {
  const previousDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    'document'
  );
  const previousStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage'
  );
  const values = new Map([['SmartMoney.language', initial]]);
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { documentElement: { lang: '' } },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => {
        if (blocked) throw new Error('Storage blocked');
        return values.get(key) ?? null;
      },
      setItem: (key, value) => {
        if (blocked) throw new Error('Storage blocked');
        values.set(key, value);
      },
    },
  });
  t.after(() => {
    if (previousDocument)
      Object.defineProperty(globalThis, 'document', previousDocument);
    else delete globalThis.document;
    if (previousStorage)
      Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else delete globalThis.localStorage;
  });
  const source = read('../src/i18n/index.ts')
    .replace(
      "import i18n from 'i18next'",
      `import { createInstance } from ${JSON.stringify(import.meta.resolve('i18next'))}; const i18n = createInstance()`
    )
    .replace(
      "'react-i18next'",
      JSON.stringify(import.meta.resolve('react-i18next'))
    )
    .replace("import en from './en.json'", `const en = ${JSON.stringify(en)}`)
    .replace("import be from './be.json'", `const be = ${JSON.stringify(be)}`)
    .replace("import ru from './ru.json'", `const ru = ${JSON.stringify(ru)}`);
  const url = compile(source + `\n// instance: ${initial}-${blocked}`);
  const { default: i18n } = await import(url);
  return { i18n, values, url };
}

test('restores saved language and switches immediately with Russian plural forms', async (t) => {
  const { i18n, values } = await setup(t, 'ru');
  assert.equal(document.documentElement.lang, 'ru');
  assert.equal(i18n.t('Settings'), 'Настройки');
  for (const [count, expected] of [
    [1, '1 участник'],
    [2, '2 участника'],
    [5, '5 участников'],
    [11, '11 участников'],
    [21, '21 участник'],
    [22, '22 участника'],
  ]) {
    assert.equal(i18n.t('members', { count }), expected);
  }
  assert.equal(
    i18n.t('Group "{{name}}" created', { name: 'Settings <Trip>' }),
    'Группа «Settings <Trip>» создана'
  );
  await i18n.changeLanguage('en');
  assert.equal(i18n.t('Settings'), 'Settings');
  assert.equal(i18n.t('members', { count: 1 }), '1 member');
  assert.equal(values.get('SmartMoney.language'), 'en');
  assert.equal(document.documentElement.lang, 'en');
});

test('unsupported preference falls back to English', async (t) => {
  const { i18n } = await setup(t, 'unsupported');
  assert.equal(i18n.resolvedLanguage, 'en');
  assert.equal(document.documentElement.lang, 'en');
});

test('blocked browser storage does not prevent switching', async (t) => {
  const { i18n } = await setup(t, null, true);
  await i18n.changeLanguage('ru');
  assert.equal(i18n.t('Cancel'), 'Отмена');
  assert.equal(document.documentElement.lang, 'ru');
});

test('money, dates and domain validation messages follow the selected language', async (t) => {
  const { i18n, url } = await setup(t, 'ru-RU');
  await i18n.changeLanguage('ru');
  const { formatMoney } = await import(
    compile(read('../src/utils/currency.ts'))
  );
  const { formatDate } = await import(
    compile(
      read('../src/utils/dates.ts').replace(
        "'dayjs'",
        JSON.stringify(import.meta.resolve('dayjs'))
      )
    )
  );
  const { translateError } = await import(
    compile(
      read('../src/i18n/errors.ts').replace("'./index'", JSON.stringify(url))
    )
  );
  assert.equal(
    formatMoney(1234.5, 'EUR'),
    new Intl.NumberFormat('ru', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
    }).format(1234.5)
  );
  assert.equal(
    formatDate('2026-09-20'),
    new Intl.DateTimeFormat('ru', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(2026, 8, 20))
  );
  assert.equal(
    translateError('Percentages add to 75.00%, expected 100%.'),
    'Сумма процентов — 75.00%, должна быть 100%.'
  );
  assert.equal(
    translateError('Only the author can delete this payment record.'),
    'Удалить запись о платеже может только её автор.'
  );
  await i18n.changeLanguage('en');
  assert.equal(formatMoney(1234.5, 'EUR'), '€1,234.50');
  assert.equal(formatDate('2026-09-20'), 'Sep 20, 2026');
});

test('both dictionaries cover component keys and preserve interpolation variables', () => {
  for (const [key, value] of Object.entries(en)) {
    assert.ok(ru[key], `Missing Russian translation: ${key}`);
    const variables = (text) =>
      [...text.matchAll(/{{(\w+)}}/g)].map((match) => match[1]).sort();
    assert.deepEqual(variables(ru[key]), variables(value), key);
  }
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
      return entry.isDirectory() ? walk(url) : [url];
    });
  for (const file of walk(new URL('../src/', import.meta.url)).filter((file) =>
    /\.tsx?$/.test(file.pathname)
  )) {
    const ast = ts.createSourceFile(
      file.pathname,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    function visit(node) {
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(ast) === 't' &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const key = node.arguments[0].text;
        assert.ok(
          en[key] || en[`${key}_other`],
          `Missing English key in ${file.pathname}: ${key}`
        );
        assert.ok(
          ru[key] || ru[`${key}_other`],
          `Missing Russian key in ${file.pathname}: ${key}`
        );
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
});
