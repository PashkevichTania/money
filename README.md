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

Settings saves the default currency for new groups. Dashboard shows actual groups and currencies. The group Balances tab shows all-time expense totals, per-member balances and suggested transfers, including saved settlements. It updates through Firestore subscriptions and uses saved converted amounts, without fetching new exchange rates. Recording settlements, date filtering and activity remain future features. The development gallery includes safe expense-form and balance previews without database writes.

## Data integrity

Group base currency is fixed at creation. Splits and payer contributions use deterministic cent allocation. Member removal is conservatively blocked after expense history exists. Group deletion cleans ledger subcollections before removing the parent and can be retried after failure.

`firestore.rules` must be verified and deployed to the configured Firebase project before relying on the new server-side constraints. Local tests cover arithmetic, HTTP failure handling and API cleanup behavior; live Firebase verification is still pending.

See `IMPLEMENTATION_PLAN.md` for progress and remaining work.

## Google sign-in

Login and signup both offer Google sign-in through Firebase Auth (`signInWithPopup`). First sign-in creates the same Firestore user profile as email signup; returning users keep their existing profile and preferences.

In Firebase Console, enable **Authentication > Sign-in method > Google**, select the support email, and save. Under **Authentication > Settings > Authorized domains**, add the actual app hostname (including `localhost` or `127.0.0.1` when used for local development). No Google client secret belongs in the frontend environment. Allow browser pop-ups for the app.

The repository cannot establish whether the provider is enabled in the remote Firebase project. A successful Google popup/account flow must be verified with that project's configuration.
