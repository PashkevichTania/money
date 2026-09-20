# SplitSmart

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

English and Russian are available under **Settings → Language**, and on the login/signup screens. The choice applies immediately and is saved in this browser (`splitsmart.language` in localStorage). It does not add Firestore reads/writes or sync across devices. English is the default and fallback.

UI dictionaries live in `src/i18n/en.json` and `src/i18n/ru.json`; use `useTranslation()` for new UI text and interpolation for dynamic values. Member counts use plural forms; displayed amounts, dates and currency names use the selected locale. User-entered names, expense descriptions and notes are not translated. Native date/number controls may follow the browser/OS locale. The development-only design gallery keeps its sample copy in English; its embedded production forms and settings are localized.

## Data integrity

Group base currency is fixed at creation. Splits and payer contributions use deterministic cent allocation. Member removal is conservatively blocked after expense history exists. Only the expense author can edit/delete an expense, and only the group author can delete a group. Group deletion cleans all ledger subcollections (including other authors' expenses) under an owner-only deletion lock before removing the parent; failed cleanup can be retried. The group author remains a member.

Dashboard balances show money owed to you, money you owe and net balance separately for each currency. Currency selectors support search. New FX requests use Frankfurter v2; saved expenses retain their original rate snapshots.

`firestore.rules` must be verified and deployed to the configured Firebase project before relying on the new server-side constraints. Local tests cover arithmetic, HTTP failure handling and API cleanup behavior; live Firebase verification is still pending.

See `IMPLEMENTATION_PLAN.md` for progress and remaining work.

## Google sign-in

Login and signup both offer Google sign-in through Firebase Auth (`signInWithPopup`). First sign-in creates the same Firestore user profile as email signup; returning users keep their existing profile and preferences.

In Firebase Console, enable **Authentication > Sign-in method > Google**, select the support email, and save. Under **Authentication > Settings > Authorized domains**, add the actual app hostname (including `localhost` or `127.0.0.1` when used for local development). No Google client secret belongs in the frontend environment. Allow browser pop-ups for the app.

The repository cannot establish whether the provider is enabled in the remote Firebase project. A successful Google popup/account flow must be verified with that project's configuration.
