# SmartMoney

A self-hostable app for shared expenses, flexible splits and currency conversion.

## Development

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set the Firebase project values for authentication and data access. The UI reference is available at `/ui-preview` during development without signing in; it uses sample data and is excluded from production routes.

```sh
npm test
npm run lint
npm run build
```

Tests require Node 22 or later. Production output is written to `dist`.

## UI migration

React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui (base-nova / Base UI), Lucide icons, Zustand, React Hook Form and Zod.

Migrated: navigation, login/signup, Dashboard, groups and members, expenses, Settings and all dialogs. Shared UI components live in `src/components/ui`; palette and light/dark tokens are in `src/globals.css`. The theme preference persists locally.

All screens use Tailwind/shadcn and Sonner notifications. MUI, Emotion, Roboto and notistack have been removed. Controls and surfaces use `rounded-md` (6px), with a subtle dotted workspace background. Add future shadcn components with `npx shadcn add <component>`.

Settings saves the default currency for new groups. Dashboard shows actual groups and currencies. The group Balances tab shows all-time expense totals, per-member balances and suggested transfers, including saved settlements. It updates through Firestore subscriptions and uses saved converted amounts, without fetching new exchange rates. Date filtering remains future work; Activity is excluded from this friends-only MVP. The development gallery includes safe expense-form, balance and payment previews without database writes.

Under Balances, the sender or recipient can record a full or partial payment already made outside the app. Records use the fixed group currency and can be deleted only by their author (with confirmation) to correct a mistake. A payment changes balances, not expense totals. Stable form identifiers prevent duplicate writes when retrying an uncertain save. No payment processing or Activity logging is performed. Updated settlement rules must be deployed before this feature can save to Firebase.

## Languages

English and Russian are available under **Settings → Language**, and on the login/signup screens. The choice applies immediately and is saved in this browser (`SmartMoney.language` in localStorage). It does not add Firestore reads/writes or sync across devices. English is the default and fallback.

UI dictionaries live in `src/i18n/en.json` and `src/i18n/ru.json`; use `useTranslation()` for new UI text and interpolation for dynamic values. Member counts use plural forms; displayed amounts, dates and currency names use the selected locale. User-entered names, expense descriptions and notes are not translated. Native date/number controls may follow the browser/OS locale. The development-only design gallery keeps its sample copy in English; its embedded production forms and settings are localized.

## Data integrity

Group base currency is fixed at creation. Splits and payer contributions use deterministic cent allocation. Member removal is conservatively blocked after expense history exists. Only the expense author can edit/delete an expense, and only the group author can delete a group. Group deletion cleans all ledger subcollections (including other authors' expenses) under an owner-only deletion lock before removing the parent; failed cleanup can be retried. The group author remains a member.

Dashboard balances show money owed to you, money you owe and net balance separately for each currency. Currency selectors support search. Current FX requests use ExchangeRate-API v6 through a Vercel Function, with Frankfurter v2 as fallback. Past dates use Frankfurter directly; saved expenses retain their original rate snapshots.

`firestore.rules` must be verified and deployed to the configured Firebase project before relying on the new server-side constraints. Local tests cover arithmetic, HTTP failure handling and API cleanup behavior; live Firebase verification is still pending.

See `IMPLEMENTATION_PLAN.md` for progress and remaining work.

## Google sign-in

Login and signup both offer Google sign-in through Firebase Auth (`signInWithPopup`). First sign-in creates the same Firestore user profile as email signup; returning users keep their existing profile and preferences.

In Firebase Console, enable **Authentication > Sign-in method > Google**, select the support email, and save. Under **Authentication > Settings > Authorized domains**, add the actual app hostname (including `localhost` or `127.0.0.1` when used for local development). No Google client secret belongs in the frontend environment. Allow browser pop-ups for the app.

The repository cannot establish whether the provider is enabled in the remote Firebase project. A successful Google popup/account flow must be verified with that project's configuration.

## License

This project is licensed under the [MIT License](LICENSE).

## Exchange rates

Set EXCHANGE_RATE_API_KEY in the Vercel project environment (Production and Preview as needed), then redeploy. This is a server-only variable: never use a VITE_ prefix. The /api/rates?base=USD function returns a validated rate table without exposing the key. API routes are excluded from the SPA rewrite. No server cache or extra datastore is required.

TanStack Query shares current tables by base currency until the provider's next update (at most 24 hours). Historical pairs are fresh for 30 days; fallback results and primary failures for five minutes. Automatic retries, focus and reconnect refetches are disabled. The cache is in memory and is lost on reload; it is not shared between browsers. The public endpoint hides the key but does not authenticate callers or protect the account quota against deliberate repeated calls.

Dates use UTC, matching the existing expense date defaults. Today uses the latest available rate; past dates use Frankfurter history; future FX dates are rejected. Snapshots store the provider's actual date and source.

For local full-stack development, use Vercel CLI: run npx vercel dev from the project root with EXCHANGE_RATE_API_KEY configured in the local server environment. Plain npm run dev serves only Vite; without a function, current-rate requests fall back to Frankfurter. No production API key is needed to run the mocked tests.

## Direct debt graph

The authenticated `/debts` page visualizes direct expense debts using React Flow, including links between other members of groups the viewer can access. It does not read private groups or write payments. The development-only `/ui-preview/debts` route provides a safe multi-currency example without authentication.

Each expense is calculated independently in saved group-currency cents. Payers cover their own shares first; remaining debtor shares are allocated proportionally across payer credits, with deterministic cent rounding and user-ID ordering. This is an allocation convention for multi-payer expenses, because historical records contain no explicit pairwise obligations. Opposite expenses remain separate, including cycles with zero net balance. Links aggregate one direction across groups and currencies.

Recorded payments consume the oldest expense contributions in the same group, ordered by expense date and ID. Payments are processed by creation date and ID. A direct link is consumed first; an existing simplified payment can then consume a directed chain of debts (shortest available path, deterministic tie-breaking). Legacy settlement expenses use the same allocation. If a payment cannot be matched, such as an advance or overpayment, the entire group is omitted with a visible warning and totals marked incomplete. The original records remain unchanged. Allocation is recomputed after expense or payment edits/deletions; it is not a persisted accounting assignment.

The display uses the user's default currency and existing current-rate cache. Underlying balances retain saved group-currency amounts. Missing FX leaves original group balances on links and marks totals incomplete. Display totals sum rounded link amounts, so they match the graph. Personal totals exclude friend-to-friend links and do not change with the participant focus filter. Hover/focus previews and click/tap details distinguish the full original purchase from the initial and remaining personal debt. The table provides an alternative to graph navigation.

Tests in `tests/directDebts.test.mjs` cover direct chains, cycles, reverse links, the multi-currency example, FIFO and partial payments, simplified payment paths, legacy payments, rounding, invalid data, and missing rates.
