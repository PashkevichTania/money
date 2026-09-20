# Operations and balances verification — 2026-09-20

## Completed locally

- 55 tests pass (`npm test`), together with TypeScript, ESLint and production build. Vite retains the existing large-chunk warning.
- In-memory Firestore adapters exercise group creation/read/rename, member addition/deduplication, immutable currency, guarded removal, deletion batching and failure/retry.
- Expense API tests exercise create/list/edit/delete, preserved history after deletion, FX snapshot preservation, rejected invalid amounts/members/currency, transaction conflict detection and deletion locks.
- API validation now rejects blank expense titles and unsupported split methods as well as invalid splits.
- Balance tests cover empty groups, paid/share/net totals, historical members, edited/deleted expenses, partial/full settlement signs, many tiny FX expenses, conservation of cents and invalid data rejection.
- Browser preview: EUR 84 split among three people gives EUR 56 to receive for the payer and two EUR 28 transfers. Dark desktop and light 390px layouts inspected; no browser console errors. No production records were changed.

## Limits and remaining integration gate

The adapters do not execute Firestore security rules, converters or the real SDK transaction engine. Java and Firebase Emulator are not installed in this environment. No claim is made that deployed Firebase rules or live CRUD have passed integration testing.

The rules were inspected: group membership gates ledger reads/writes, currency and creator fields are immutable, history prevents member removal, and deletion locks block new ledger writes. Settlement creation is limited to its sender/recipient with valid integer cents and matching group currency; deletion is author-only except for owner cleanup of a locked group. These updated rules are local and must be deployed. Nested expense payer/participant membership and split arithmetic are validated by the client API, not fully by security rules; a custom client can bypass those checks. The balance view rejects invalid split totals/currencies but is not a replacement for server-side validation.

Before relying on production balances, run these against a disposable emulator group with at least two member identities and one outsider:

1. Create a EUR group, add/remove a member before expenses, rename it and reject a currency change.
2. Create EUR and FX expenses for all four split methods and multiple payers; reload and verify saved converted totals and zero-sum balances.
3. Edit and delete expenses; confirm the balance subscription updates. Verify failed writes do not alter stored balances.
4. Reject outsider reads/writes, creator spoofing, currency changes, writes during group deletion and member removal after expense history.
5. Verify deletion removes child collections; simulate failure and retry.
6. Verify account switching removes subscriptions and permission failures show an error rather than a zero balance.

Balance scope is all time. Suggestions do not send money. Settlement entry records transfers already made outside the app; date filtering remains separate work.

## Settlements and removal of Activity

- Activity tab and unused types removed; no event documents or Activity listeners added. Legacy activity cleanup on group deletion is retained.
- Six settlement API-adapter tests cover full/partial record storage, history preservation, sender/recipient authorization, invalid amounts and currency, outsider/anonymous denial, deletion locks, idempotent retry after a simulated lost response, conflicting retries and author-only deletion.
- Browser preview: record EUR 10 against EUR 28 owed, see EUR 18 remaining; record the remainder, see EUR 0 for that participant. Total expense amount stays EUR 84. Dark desktop and 390px form inspected without writing Firebase records.
- Pending emulator/live checks: actual create/read/delete authorization and cents validation, atomic history marker, rejected updates, listener updates on group and Dashboard, and group-owner cleanup of other authors' payments. Deploying rules and live CRUD were not performed.

## TODO follow-up

- Expense/group API tests now reject non-authors and signed-out callers, including forged `updatedBy`. Existing author success cases and group cleanup retry cases pass. Rules restrict edit/delete to authors, with group-owner-only cleanup during locked group deletion. These rules have not been deployed or executed in an emulator.
- Dashboard tests verify per-currency aggregation, positive/negative group balances and settlement effects. Live authenticated Dashboard subscriptions remain part of the Firebase integration gate.
- Share weights reject fractions and zero instead of silently rounding or replacing them. Money step 0.01 was checked with ArrowUp; browser rejects 1.5 shares and disables save.
- Searchable currency dropdown checked inside the expense dialog in dark mode: search by currency name and selection using ArrowDown/Enter succeed. No browser console warnings/errors.
- Frankfurter v2 historical EUR/USD request succeeded; live GBP/EUR conversion also succeeded through the expense form. New tests cover array responses, requested pair matching, invalid dates/rates, timeouts and missing results. Saved FX snapshots are unchanged.
