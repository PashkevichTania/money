# Operations and balances verification — 2026-09-20

## Completed locally

- 44 tests pass (`npm test`), together with TypeScript, ESLint and production build. Vite retains the existing large-chunk warning.
- In-memory Firestore adapters exercise group creation/read/rename, member addition/deduplication, immutable currency, guarded removal, deletion batching and failure/retry.
- Expense API tests exercise create/list/edit/delete, preserved history after deletion, FX snapshot preservation, rejected invalid amounts/members/currency, transaction conflict detection and deletion locks.
- API validation now rejects blank expense titles and unsupported split methods as well as invalid splits.
- Balance tests cover empty groups, paid/share/net totals, historical members, edited/deleted expenses, partial/full settlement signs, many tiny FX expenses, conservation of cents and invalid data rejection.
- Browser preview: EUR 84 split among three people gives EUR 56 to receive for the payer and two EUR 28 transfers. Dark desktop and light 390px layouts inspected; no browser console errors. No production records were changed.

## Limits and remaining integration gate

The adapters do not execute Firestore security rules, converters or the real SDK transaction engine. Java and Firebase Emulator are not installed in this environment. No claim is made that deployed Firebase rules or live CRUD have passed integration testing.

The rules were inspected: group membership gates ledger reads/writes, currency and creator fields are immutable, history prevents member removal, and deletion locks block new expense writes. Settlement writes are currently denied. Nested payer/participant membership and split arithmetic are validated by the client API, not fully by security rules; a custom client can bypass those checks. The balance view rejects invalid split totals/currencies but is not a replacement for server-side validation.

Before relying on production balances, run these against a disposable emulator group with at least two member identities and one outsider:

1. Create a EUR group, add/remove a member before expenses, rename it and reject a currency change.
2. Create EUR and FX expenses for all four split methods and multiple payers; reload and verify saved converted totals and zero-sum balances.
3. Edit and delete expenses; confirm the balance subscription updates. Verify failed writes do not alter stored balances.
4. Reject outsider reads/writes, creator spoofing, currency changes, writes during group deletion and member removal after expense history.
5. Verify deletion removes child collections; simulate failure and retry.
6. Verify account switching removes subscriptions and permission failures show an error rather than a zero balance.

Balance scope is all time. Transfer suggestions do not send payments or record settlements; settlement entry and date filtering remain separate work.
