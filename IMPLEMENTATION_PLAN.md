# Splitwise Clone — Step-by-Step Implementation Plan

---

## 0. Project Overview & Tech Stack

**Goal:** Build a free, self-hostable Splitwise clone with groups, multi-currency expenses, flexible split rules, and balances.

**Final stack:**
- `React 18 + Vite + TypeScript`
- `MUI` (UI components + theme)
- `Zustand` (state management)
- `Firebase` (Auth, Firestore, Hosting) — or Supabase as drop-in
- `react-router-dom` (routing)
- `react-hook-form + zod` (forms + validation)
- `dayjs` (dates)
- `notistack` (toasts)
- `Frankfurter API` (free FX rates)

**Delivery phases:**
1. Bootstrap project + Firebase setup
2. Auth shell & core layout
3. Groups & members
4. Expenses with equal split + single payer
5. Flexible splitting & multiple payers
6. Multi-currency conversion + FX snapshots
7. Balances, settlement, activity log
8. Polish, validation, security rules, deploy

---

## 1. Phase 1 — Bootstrap Project & Firebase Setup

**1.1 Scaffold Vite + React + TS**
- `npm create vite@latest money -- --template react-ts`
- `cd money`
- `npm install`

**1.2 Install core dependencies**
- `@mui/material @emotion/react @emotion/styled @mui/icons-material`
- `@fontsource/roboto`
- `zustand`
- `react-router-dom`
- `react-hook-form @hookform/resolvers zod`
- `dayjs`
- `notistack`
- `firebase`
- `axios` (for FX API calls)

**1.3 Install dev dependencies**
- `eslint prettier eslint-config-prettier eslint-plugin-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin`
- `vitest` optional; otherwise just TSC for safety

**1.4 Base project structure**
```
src/
├─ api/             # network services (FX rates, thin Firestore wrappers)
├─ assets/
├─ components/      # shared UI: Layout, Navbar, Sidebar, Dialogs, Cards, Form fields
├─ config/          # firebase config, env constants, currencies list
├─ features/        # auth, groups, expenses, balances, settings
│  ├─ auth/
│  ├─ groups/
│  ├─ expenses/
│  ├─ balances/
│  └─ settings/
├─ hooks/           # useAuth, useGroup, useExpenses, useMembers
├─ routes/          # routing + protected route wrapper
├─ stores/          # zustand stores
├─ theme/           # MUI theme + design tokens
├─ types/           # shared TS types
├─ utils/           # math, formatters, split logic, currency helpers
├─ App.tsx
├─ main.tsx
```

**1.5 Firebase project**
- Create a Firebase project in console
- Enable `Email/Password auth` (and optionally Google sign-in)
- Create Firestore DB in test-mode first, then lock down
- Create `src/config/firebase.ts` with `initializeApp`, export `auth`, `db`, `app`
- Add `.env.local`:
  - `VITE_FIREBASE_API_KEY=...`
  - `VITE_FIREBASE_AUTH_DOMAIN=...`
  - `VITE_FIREBASE_PROJECT_ID=...`
  - `VITE_FIREBASE_STORAGE_BUCKET=...`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID=...`
  - `VITE_FIREBASE_APP_ID=...`
  - `VITE_APP_BASE_CURRENCY=USD` (fallback default)

**1.6 Validation gate**
- Run `npm run dev`
- Verify MUI theme loaded
- Verify Firebase app initialized without errors
- Commit: `chore: bootstrap app + firebase`

---

## 2. Phase 2 — Auth Shell, Theme, Layout, Routing

**2.1 Theme**
- `theme/index.ts` with light/dark palettes, typography, spacing tokens
- Wrap app in `ThemeProvider`, `CssBaseline`, `SnackbarProvider`

**2.2 Routing skeleton**
- Public: `/login`, `/signup`
- Protected: `/`, `/groups`, `/groups/:id`, `/settings`
- Create `<ProtectedRoute />` redirecting unauthenticated users

**2.3 Auth store (zustand)**
- `stores/authStore.ts`
  - `user` | `loading` | `initialized`
  - `login(email, pass)`
  - `signup(email, pass, displayName)`
  - `logout()`
  - persist session via `onAuthStateChanged` in a hook

**2.4 Auth pages**
- Login page: email + password form (react-hook-form + zod schema)
- Signup page: email + password + display name
- Basic error messages: invalid credentials, weak password, email in use
- Logout button in topbar

**2.5 Layout / Shell**
- `<AppLayout>` with:
  - `<Topbar>`: logo, user avatar menu, logout
  - `<Sidebar>`: Dashboard, Groups, Settings
  - `<Main content area>`
- Make it responsive (drawer on mobile)

**2.6 User profile creation on signup**
- On signup create Firestore doc `users/{uid}`:
  - `id`, `displayName`, `email`, `photoURL`, `defaultCurrency: 'USD'`, `createdAt`
- Make login also ensure profile exists / update last seen if you want

**2.7 Validation gate**
- Signup → auto-login → redirect to `/groups`
- Logout returns to `/login`
- Direct visit to protected route redirects correctly
- Commit: `feat: auth shell + layout + routing`

---

## 3. Phase 3 — Groups & Members

**3.1 Types**
- `types/group.ts`
  - `Group { id, name, baseCurrency, memberIds: string[], createdBy, createdAt, updatedAt }`
- `types/user.ts`
  - `User { id, displayName, email, photoURL, defaultCurrency }`

**3.2 Firestore wrappers**
- `api/groups.ts`
  - `createGroup(data)`
  - `getGroupsForUser(userId)`
  - `getGroup(groupId)`
  - `updateGroup(groupId, patch)`
  - `deleteGroup(groupId)` — be careful with cascading
- `api/users.ts`
  - `getUser(id)`
  - `getUsersByIds(ids)`
  - `updateProfile(id, patch)`

**3.3 Zustand stores**
- `stores/groupStore.ts`
  - `groups`, `selectedGroupId`, `membersMap`, `loading`
  - `loadGroups()`, `selectGroup(id)`, `createGroup()`, `updateGroup()`, `deleteGroup()`
  - `loadMembers(groupId)` populates `membersMap`
- `stores/uiStore.ts`
  - snackbar queue, open dialog flags, selected currency/filters

**3.4 Custom hooks**
- `hooks/useGroups()` wraps store actions
- `hooks/useSelectedGroup()` returns current group + members

**3.5 Pages & Components**
- `/groups` — Group list (MUI `List` or `Card` grid with base currency, member count)
- `/groups/new` or modal — create group: name + base currency picker
- `/groups/:id` — group detail page with tabs: `Expenses | Balances | Members | Settings`
- Group Members tab:
  - Show current members list
  - “Add member by email” UI (search existing users by email)
  - Remove member (with guardrails if they have balances)
- Settings tab: rename, change base currency (warn existing expenses already converted)

**3.6 Firestore data & structure**
```
users/{uid}
groups/{gid}
  - id
  - name
  - baseCurrency
  - memberIds: [uid1, uid2]
  - createdBy
  - createdAt, updatedAt
```

**3.7 Minimal security rules v1**
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /groups/{gid} {
      allow read, write: if request.auth != null && request.auth.uid in resource.data.memberIds;
      allow create: if request.auth != null && request.auth.uid in request.resource.data.memberIds;
    }
  }
}
```

**3.8 Validation gate**
- Create group with 2+ members, list appears on dashboard
- Group detail loads members
- Add member by email works for existing users
- Commit: `feat: groups + members`

---

## 4. Phase 4 — Expenses: Equal Split + Single Payer

**4.1 Types**
- `types/expense.ts`
```ts
export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export interface PayerContribution {
  userId: string;
  amount: number; // in original currency (raw expense amount)
}

export interface ParticipantShare {
  userId: string;
  value: number; // equal share is 1, exact is amount, percentage is %, shares is share count
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  groupCurrency: string;
  rateSnapshot?: { date: string; rate: number; source: string };
  paidBy: PayerContribution[];
  participants: ParticipantShare[];
  splitType: SplitType;
  expenseDate: string; // ISO
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  isSettlement?: boolean;
}
```

**4.2 Split utilities (core logic — write first + unit test)**
- `utils/split.ts`
  - `computeEqualShares(total, participants): ParticipantShare[]`
  - `applySplitTypeToConverted(expense)` — returns per-user `owed` in group currency
  - `computeNetBalances(expense)` — `{ userId: net }` where `+ = owed money`, `- = owes`
  - `validateSplit(total, shares, type)` returns errors list
- TIP: write pure functions, test with `vitest` now to save headaches later

**4.3 API**
- `api/expenses.ts`
  - under `groups/{gid}/expenses/{eid}` subcollection
  - `createExpense(groupId, data)`
  - `updateExpense(groupId, id, patch)`
  - `deleteExpense(groupId, id)`
  - `listExpenses(groupId, filters?)`

**4.4 Zustand store**
- `stores/expenseStore.ts`
  - `expensesByGroup: Record<groupId, Expense[]>`
  - `loading, selectedExpenseId, filters (date range, currency, user)`
  - `loadExpenses(groupId)`, `addExpense(groupId, e)`, `updateExpense(groupId, e)`, `removeExpense(groupId, id)`

**4.5 UI**
- Group detail → Expenses tab:
  - Filter chips + search + add button
  - Expense list: show date, title, paidBy, amount in original and group currency
- `<AddExpenseDialog />` (or separate page):
  - Title, description, date, category if you want
  - Currency selector (default group base currency)
  - Amount input
  - Payer dropdown (single payer initially)
  - Participants checkbox list (multi-select from group members)
  - Split mode = Equal only
  - Preview line: “Alice pays $100, split equally 4 ways → Bob owes Alice $25 …”
- Edit / delete actions with confirmation dialogs

**4.6 Currency formatters**
- `utils/currency.ts`
  - `formatMoney(amount, currency, locale?)` using `Intl.NumberFormat`
  - currency list (ISO codes + labels) in `config/currencies.ts`

**4.7 Validation gate**
- Create expense → appears in list
- Edit/delete works and updates state
- Balances tab can show a raw `per-user net` from expenses
- Commit: `feat: expenses equal split + single payer`

---

## 5. Phase 5 — Flexible Splitting & Multiple Payers

**5.1 Extend split utilities**
- `computeExactShares(total, inputs)`
- `computePercentageShares(total, inputs)` — enforce sum == 100
- `computeSharesByRatio(total, inputs)` — e.g. 3:2:1 shares
- Uniform helper `resolveOwedPerUser(expense)` returning `Record<userId, number>`

**5.2 Multiple payers**
- Paid-by UI changes from single select to:
  - “Paid by” section with chips: each user + amount contribution
  - Quick presets: one person, evenly among X
  - Validation: `sum(paidBy.amount) === originalAmount`

**5.3 Split mode UI**
- Split-type segmented control (MUI ToggleButtonGroup): Equal / Exact / % / Shares
- Dynamic inputs per participant:
  - Equal → read-only equal amounts
  - Exact → amount per user, auto-fill remainder for last user if helpful
  - Percentage → per user %, 2 decimals
  - Shares → per user share count
- Live summary card always visible:
  - Totals, owed per user, diff errors if invalid

**5.4 Form validation (zod)**
- Zod schema `expenseSchema` that:
  - requires participants.length > 0
  - requires paidBy.length > 0
  - sum(paidBy) === originalAmount
  - sum exact = originalAmount if exact split
  - sum percentage = 100
  - no shares == 0 for any participant

**5.5 Validation gate**
- All four split modes submit correctly
- Multiple payers submit correctly
- Edit preserves split data
- Commit: `feat: flexible splits + multiple payers`

---

## 6. Phase 6 — Multi-Currency Conversion & FX Snapshots

**6.1 FX service**
- `api/rates.ts`
  - `getRate(fromCurrency, toCurrency, date?)` — use Frankfurter API
    - endpoint: `https://api.frankfurter.app/YYYY-MM-DD?from=USD&to=EUR`
  - fallback: if group currency == expense currency → rate = 1, no API call
  - error handling: if rate fetch fails, disallow save OR allow with manual rate override
- Frankfurter supports ECB currencies; for others, optionally let user input a manual rate.

**6.2 Expense creation flow**
- When user chooses different `originalCurrency` than group currency:
  - load rate for `expenseDate` (or latest if blank)
  - show rate + converted amount next to amount field
  - on submit, populate:
    - `convertedAmount = originalAmount * rate`
    - `groupCurrency = group.baseCurrency`
    - `rateSnapshot = { date, rate, source: 'frankfurter' }`
- All internal balances use `convertedAmount` and `groupCurrency`

**6.3 Display strategy**
- Expense list shows:
  - primary: `formatMoney(convertedAmount, groupCurrency)`
  - secondary faded: `originalAmount originalCurrency` if different
- Expense detail / edit:
  - allow changing date and recomputing rate
  - allow locking a manual rate if API fails

**6.4 Edges**
- Changing group base currency on an existing group:
  - do NOT retroactively convert existing expenses
  - keep their stored `convertedAmount` as historical snapshot
  - new expenses use new base currency
  - optionally warn user about mismatch (or disallow change if expenses exist)

**6.5 Validation gate**
- Expense in EUR saved in USD group → converted correctly
- Historical date uses past rate (if available from Frankfurter)
- Same-currency expense skips API
- Commit: `feat: multi-currency + fx snapshots`

---

## 7. Phase 7 — Balances, Settlements, Activity Log

**7.1 Balance computation**
- `utils/balances.ts`
  - `aggregateNetBalances(expenses[], settlements[])` → `Map<userId, net>`
  - `simplifyDebts(netMap)` → list of `{ from, to, amount }`
  - algorithm: greedy min/max settlement reduction

**7.2 Balances tab UI**
- Header cards:
  - “You are owed X” / “You owe Y” in group currency
- “Settle up” suggestions list: who pays whom
- Per-member summary table: name, paid total, owed total, net
- Filter by date range

**7.3 Settlements**
- Settlement is a special expense or separate document:
  - I recommend separate `settlements` subcollection for clarity:
  - `groups/{gid}/settlements/{sid}`
    - `{ id, fromUserId, toUserId, amount, currency, note, createdBy, createdAt }`
- UI:
  - “Record settlement” button next to suggestion
  - Pre-fill from/to/amount
  - Confirmation writes settlement doc
  - Balances instantly update
- Expense store/balance calculator includes settlements

**7.4 Activity log**
- Subcollection `groups/{gid}/activity/{aid}`
  - `{ id, type: 'EXPENSE_CREATED'|'EXPENSE_UPDATED'|'EXPENSE_DELETED'|'SETTLEMENT_CREATED'|'MEMBER_ADDED'|'MEMBER_REMOVED', entityId, message, createdBy, createdAt }`
- On every write (create/edit/delete expense, add/remove members, settlement):
  - client-side insert activity log entry
  - OR move to Cloud Functions once stable (but client-side is fine for MVP)
- Group detail → Activity tab: chronological timeline with avatars, colored pills, messages

**7.5 Validation gate**
- Balances match real-world scenarios you test manually
- Settlement reduces suggested debt
- Activity log shows the 5 main events
- Commit: `feat: balances + settlements + activity`

---

## 8. Phase 8 — Polish, Security, Validation, Deploy

**8.1 UX polish**
- Skeleton loaders for group/expense lists
- Empty states for no groups, no expenses
- Confirmation dialogs for destructive actions
- Mobile responsive: drawers, stack layouts, condensed tables → cards on mobile
- Search + filters: by user, by date, by min/max amount
- Currency defaulting: remember last-used per group in UI store

**8.2 Validation / edge cases**
- Zero-amount and negative amounts blocked by schema
- Split with single participant handled (paid by same person)
- Soft-delete or restore if desired (else hard delete + confirmation)
- Member removal when balances exist → prompt settle first or freeze historical

**8.3 Firestore security rules (finalize)**
- Lock `users` profile to owner only
- Lock groups + subcollections to members only
- Ensure `expense.groupId` matches path
- Validate `createdBy === request.auth.uid` on create
- Allow update/delete by any group member (or restrict to creator if you prefer)
- Validate currency and sum invariants where possible in rules (at least the critical ones)

**8.4 Hosting / deploy**
- Build: `npm run build`
- `npm i -g firebase-tools`
- `firebase login`
- `firebase init hosting` → point to `dist`
- Add `public` rewrite to `index.html` for SPA
- Add GitHub Actions deploy script or just `firebase deploy` manually

**8.5 Performance / monitoring**
- Add Firestore indexes for common queries: `expenses by groupId + expenseDate`
- Avoid reading entire group history on every visit: implement pagination or date window
- Optional: enable Firebase Performance Monitoring (free tier)

**8.6 Final manual smoke test script**
1. Sign up user A and user B
2. A creates group “Trip” with EUR base, adds B
3. B logs in, sees group, adds “Dinner €120” paid by B, split equal (A+B)
4. A adds “Hotel 800 PLN” on 2024-06-01, paid by A, equal split → verifies EUR conversion
5. Balances tab shows correct net for A and B
6. A records settlement for exact suggested amount to B
7. Balances go to zero
8. Activity log shows all 5 events
9. Edit an expense → values + activity update correctly
10. Delete an expense → balances revert

**Commit:** `chore: polish, security rules, deploy setup`

---

## Suggested Implementation Order of Work (by priority)

1. `Phase 1` + `Phase 2` — single push: you’ll have a runnable skeleton
2. `Phase 3` Groups/Members — foundational for everything else
3. `Phase 4` Expenses with equal split — suddenly app is “usable for real”
4. `Phase 7 (part 1)` basic balances from net effects — see it’s computing right
5. `Phase 5` flexible splits + multiple payers — biggest UX leap
6. `Phase 6` FX conversion — makes it multi-currency useful
7. `Phase 7 (rest)` settlements + activity log
8. `Phase 8` polish + rules + deploy
