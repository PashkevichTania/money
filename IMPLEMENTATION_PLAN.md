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

**1.1 Scaffold Vite + React + TS** ✅
- [x] `npm create vite@latest money -- --template react-ts`
- [x] `cd money`
- [x] `npm install`

**1.2 Install core dependencies** ✅
- [x] `@mui/material @emotion/react @emotion/styled @mui/icons-material`
- [x] `@fontsource/roboto`
- [x] `zustand`
- [x] `react-router-dom`
- [x] `react-hook-form @hookform/resolvers zod`
- [x] `dayjs`
- [x] `notistack`
- [x] `firebase`
- [x] `axios` (for FX API calls)

**1.3 Install dev dependencies** ✅
- [x] `eslint prettier eslint-config-prettier eslint-plugin-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin`
- [ ] `vitest` optional; otherwise just TSC for safety

**1.4 Base project structure** ✅
```
src/
├─ api/             # ✅ network services (FX rates, thin Firestore wrappers)
├─ assets/          # ✅
├─ components/      # ✅ shared UI: Layout, Navbar, Sidebar, Dialogs, Cards, Form fields
├─ config/          # ✅ firebase config, env constants, currencies list
├─ features/        # auth✅, groups✅, expenses✅, balances❌, settings✅
│  ├─ auth/
│  ├─ groups/
│  ├─ expenses/
│  ├─ balances/
│  └─ settings/
├─ hooks/           # useGroups✅, useSelectedGroup✅, useThemeModeListener✅, useApp✅
├─ routes/          # ✅ routing + protected route wrapper
├─ stores/          # ✅ zustand stores
├─ theme/           # ✅ MUI theme + design tokens
├─ types/           # ✅ shared TS types
├─ utils/           # currency✅, dates✅, split✅, balances❌
├─ App.tsx
├─ main.tsx
```

**1.5 Firebase project** ✅
- [x] Create a Firebase project in console
- [x] Enable `Email/Password auth` (and optionally Google sign-in)
- [x] Create Firestore DB in test-mode first, then lock down
- [x] Create `src/config/firebase.ts` with `initializeApp`, export `auth`, `db`, `app`
- [x] Add `.env.example`:
  - [x] `VITE_FIREBASE_API_KEY=...`
  - [x] `VITE_FIREBASE_AUTH_DOMAIN=...`
  - [x] `VITE_FIREBASE_PROJECT_ID=...`
  - [x] `VITE_FIREBASE_STORAGE_BUCKET=...`
  - [x] `VITE_FIREBASE_MESSAGING_SENDER_ID=...`
  - [x] `VITE_FIREBASE_APP_ID=...`
  - [x] `VITE_APP_BASE_CURRENCY=USD` (fallback default)

**1.6 Validation gate** ✅
- [x] Run `npm run dev`
- [x] Verify MUI theme loaded
- [x] Verify Firebase app initialized without errors
- Commit: `chore: bootstrap app + firebase`

---

## 2. Phase 2 — Auth Shell, Theme, Layout, Routing

**2.1 Theme** ✅
- [x] `theme/index.ts` with light/dark palettes, typography, spacing tokens
- [x] Wrap app in `ThemeProvider`, `CssBaseline`, `SnackbarProvider`

**2.2 Routing skeleton** ✅
- [x] Public: `/login`, `/signup`
- [x] Protected: `/`, `/groups`, `/groups/:id`, `/settings`
- [x] Create `<ProtectedRoute />` redirecting unauthenticated users

**2.3 Auth store (zustand)** ✅
- [x] `stores/authStore.ts`
  - [x] `user` | `loading` | `initialized`
  - [x] `login(email, pass)`
  - [x] `signup(email, pass, displayName)`
  - [x] `logout()`
  - [x] persist session via `onAuthStateChanged` in a hook

**2.4 Auth pages** ✅
- [x] Login page: email + password form (react-hook-form + zod schema)
- [x] Signup page: email + password + display name
- [x] Basic error messages: invalid credentials, weak password, email in use
- [x] Logout button in topbar

**2.5 Layout / Shell** ✅
- [x] `<AppLayout>` with:
  - [x] `<Topbar>`: logo, user avatar menu, logout
  - [x] `<Sidebar>`: Dashboard, Groups, Settings
  - [x] `<Main content area>`
- [x] Make it responsive (drawer on mobile)

**2.6 User profile creation on signup** ✅
- [x] On signup create Firestore doc `users/{uid}`:
  - [x] `id`, `displayName`, `email`, `photoURL`, `defaultCurrency: 'USD'`, `createdAt`
- [x] Make login also ensure profile exists / update last seen if you want

**2.7 Validation gate** ✅
- [x] Signup → auto-login → redirect to `/groups`
- [x] Logout returns to `/login`
- [x] Direct visit to protected route redirects correctly
- Commit: `feat: auth shell + layout + routing`

---

## 3. Phase 3 — Groups & Members

**3.1 Types** ✅
- [x] `types/group.ts`
  - [x] `Group { id, name, baseCurrency, memberIds: string[], createdBy, createdAt, updatedAt }`
- [x] `types/user.ts`
  - [x] `User { id, displayName, email, photoURL, defaultCurrency }`

**3.2 Firestore wrappers** ✅
- [x] `api/groups.ts`
  - [x] `createGroup(data)`
  - [x] `getGroupsForUser(userId)`
  - [x] `getGroup(groupId)`
  - [x] `updateGroup(groupId, patch)`
  - [x] `deleteGroup(groupId)` — be careful with cascading
- [x] `api/users.ts`
  - [x] `getUser(id)`
  - [x] `getUsersByIds(ids)`
  - [x] `updateProfile(id, patch)`

**3.3 Zustand stores** ✅ (⚠️ duplicate in uiStore.ts to remove)
- [x] `stores/groupStore.ts`
  - [x] `groups`, `selectedGroupId`, `membersMap`, `loading`
  - [x] `loadGroups()`, `selectGroup(id)`, `createGroup()`, `updateGroup()`, `deleteGroup()`
  - [x] `loadMembers(groupId)` populates `membersMap`
- [x] `stores/uiStore.ts`
  - [x] snackbar queue, open dialog flags, selected currency/filters

**3.4 Custom hooks** ✅
- [x] `hooks/useGroups()` wraps store actions
- [x] `hooks/useSelectedGroup()` returns current group + members

**3.5 Pages & Components** ✅ (⚠️ delete dialog pending)
- [x] `/groups` — Group list (MUI `List` or `Card` grid with base currency, member count)
- [x] `/groups/new` or modal — create group: name + base currency picker
- [x] `/groups/:id` — group detail page with tabs: `Expenses | Balances | Members | Settings`
- [x] Group Members tab:
  - [x] Show current members list
  - [x] “Add member by email” UI (search existing users by email)
  - [ ] Remove member (with guardrails if they have balances)
- [x] Settings tab: rename, change base currency (warn existing expenses already converted)

**3.6 Firestore data & structure** ✅
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

**3.7 Minimal security rules v1** ✅
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

**3.8 Validation gate** ⚠️
- [x] Create group with 2+ members, list appears on dashboard
- [x] Group detail loads members
- [x] Add member by email works for existing users
- Commit: `feat: groups + members`

---

## 4. Phase 4 — Expenses: Equal Split + Single Payer

**4.1 Types** ✅
- [x] `types/expense.ts`
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
(Plus Settlement + ActivityLog types also defined ✅)

**4.2 Split utilities (core logic)** ✅
- [x] `utils/split.ts`
  - [x] `computeEqualShares(total, participants): ParticipantShare[]`
  - [x] `applySplitTypeToConverted(expense)` — returns per-user `owed` in group currency
  - [x] `computeNetBalances(expense)` — `{ userId: net }` where `+ = owed money`, `- = owes`
  - [x] `validateSplit(total, shares, type)` returns errors list
- Bonus: `resolveOwedPerUser()` already supports exact/percentage/shares for Phase 5 reuse

**4.3 API** ✅
- [x] `api/expenses.ts`
  - [x] under `groups/{gid}/expenses/{eid}` subcollection
  - [x] `createExpense(groupId, data)`
  - [x] `updateExpense(groupId, id, patch)`
  - [x] `deleteExpense(groupId, id)`
  - [x] `listExpenses(groupId, filters?)` + `getExpense()` bonus
  - [x] Firestore data converter with toFirestore/fromFirestore

**4.4 Zustand store** ✅
- [x] `stores/expenseStore.ts`
  - [x] `expensesByGroup: Record<groupId, Expense[]>`
  - [x] `loadingByGroup, selectedExpenseId, filters (date range, user, min/max)`
  - [x] `loadExpenses(groupId)`, `addExpense(groupId, e)`, `updateExpense(groupId, e)`, `removeExpense(groupId, id)`
  - [x] error boundary wrapper, cached loaded groups, optimistic updates

**4.5 UI** ✅ (⚠️ Edit deferred to Phase 5 with flexible splits)
- [x] Group detail → Expenses tab:
  - [x] Floating Add button (FAB on expense tab)
  - [x] Expense list: date, title, paidBy, amount in original AND group currency, per-user net chips
  - [ ] Filter chips + search (store fields exist, UI rendering deferred)
- [x] `<AddExpenseDialog />`
  - [x] Title, description, date picker
  - [x] Currency selector (defaults to group base currency) with 70+ ISO currencies
  - [x] Amount input with currency adornment
  - [x] Payer dropdown (single payer — multi-payer UI deferred to Phase 5)
  - [x] Participants checkbox list with select all / clear all + per-person owed preview
  - [x] Split mode = Equal only (Exact / % / Shares disabled with Phase 5 notice)
  - [x] Live Preview card: payer summary + per-user owed chips + FX conversion alert when currencies differ
  - [x] Full zod validation with custom split superRefine
- ⚠️ Edit action: menu item shows "Edit coming in Phase 5" toast (will ship with flexible-split edit form)
- [x] Delete action with confirmation dialog and optimistic state removal

**4.6 Currency formatters** ✅
- [x] `utils/currency.ts`
  - [x] `formatMoney(amount, currency, locale?)` using `Intl.NumberFormat`
  - [x] `roundMoney()`, `safeSum()` helpers used throughout split logic
  - [x] currency list (70+ ISO codes + labels + symbols) in `config/currencies.ts` with `getCurrencySymbol()`

**4.7 Validation gate** ✅ (per-user net shown inline; Balances tab shell deferred to Phase 7)
- [x] Create expense → appears in list, sorted by expenseDate desc
- [x] Delete works and reverts state instantly; Edit UI placeholder in place (Phase 5)
- [x] Per-expense net balance chips ("You get back X" / "You owe Y" / "Settled") rendered in list using `computeNetBalances`
- Commit: `feat: expenses equal split + single payer`

---

## 5. Phase 5 — Flexible Splitting & Multiple Payers

**5.1 Extend split utilities** ✅
- [x] `computeExactShares(participantUserIds, valuesByUserId?)` in `utils/split.ts`
- [x] `computePercentageShares(participantUserIds, valuesByUserId?)` — auto-even distribution with remainder on last user when values absent; 4-decimal precision
- [x] `computeSharesByRatio(participantUserIds, valuesByUserId?)` — defaults to 1 share per user (equal) for missing values
- [x] Uniform helpers `resolveOwedPerUser(convertedTotal, participants, splitType)` returning `Record<userId, number>` (was already there — reused) + `buildParticipants(splitType, ids, values)` dispatcher + `autoFillExactRemainder` UX helper + `autoDistributePaidBy(total, userIds)` preset helper

**5.2 Multiple payers** ✅
- [x] Paid-by UI changed from single Select → chips section:
  - [x] Per-payer editable Card: avatar + name + TextField with currency adornment + remove button (if >1 payer)
  - [x] Add-payer chips for group members not yet in payer set (up to 6 visible)
  - [x] Quick presets chips: `One person` (me) | `Evenly among participants`
  - [x] Running total line: `Sum: $X · Remaining: $Y` (✓ matches total vs error color)
  - [x] Validation (enforced live + on submit): `|sum(paidBy.amount) − originalAmount| < 0.005` via `validateSplit().paidBy.sum` + zod array `.min(1)` + submitValidation double-check

**5.3 Split mode UI** ✅
- [x] Split-type segmented control (MUI ToggleButtonGroup): Equal / Exact / % / Shares — all four enabled (removed Phase-4 `disabled` and "Phase 5 notice")
- [x] Dynamic inputs per participant (inline TextField next to checkbox + avatar):
  - [x] Equal → read-only owed amount caption
  - [x] Exact → amount per user with currency adornment, `autoFillExactRemainder` on last user applied internally in participants build
  - [x] Percentage → per user % TextField with `%` adornment; 4-decimal display
  - [x] Shares → integer share TextField, min 1
  - [x] Auto-seeds default values when switching split type (percentage → evenly spread 100% with remainder on last; shares → default 1 each; exact → 0 each)
- [x] Live running totals below list:
  - Exact total ($) ✓ green / red vs originalAmount
  - Percentage total (%) ✓ green / red vs 100.00%
  - Total shares counter
- [x] Live summary Preview card always visible:
  - Multi-payer "Paid:" list of success-colored chips
  - Owed-per-user grid with payer-highlighted chips
  - **Net effect** section with per-user "gets back / owes / settled" chips (driven by `computeNetBalances` on a synthetic expense)
  - Top Alert with actionable message if split.sum / paidBy.sum / amount violations exist

**5.4 Form validation (zod)** ✅
- [x] Rewrote zod schema `FormValues` shape (used by resolver) covering:
  - [x] `participantIds: z.array(z.string()).min(1, …)` — requires participants.length > 0
  - [x] `paidBy: z.array(z.object({userId, amount: gte 0})).min(1, …)` — requires paidBy.length > 0 and non-negative amounts
  - [x] `participantValues: z.record(z.string(), z.coerce.number())` — stores exact/%/shares inputs per userId
- [x] Layered validation:
  - Live computed `liveValidationErrors = validateSplit({originalAmount, participants, paidBy, splitType})` that disables submit and shows inline errors (split.sum, split.percentage, split.shares, paidBy.sum, paidBy, participants, originalAmount)
  - Submit-time `submitValidation()` repeats `validateSplit` with final values and pins zod `setError` onto the correct form fields for splitType / participantIds / paidBy / originalAmount
  - Together enforce: sum(paidBy) === originalAmount; sum exact = originalAmount; sum percentage = 100; no shares ≤ 0 for any participant

**5.5 Validation gate** ✅ (build passes, TS clean, diagnostics empty; runtime flows round-trip)
- [x] All four split modes submit correctly and store their typed `participants[].value` + `splitType` (verified via data layer)
- [x] Multiple payers submit correctly (multi-element `paidBy[]` preserved in Firestore, net balances match expectation in list chips)
- [x] Edit preserves split data: the dialog now accepts `editingExpense?: Expense`, hydrates all fields (including payer amounts, participantValues per userId, and splitType), calls `updateExpense()` on submit, and ExpenseList wires Edit menu item → parent `onEditExpense(expense)` → one shared dialog hoisted in `GroupDetailPage`
- Commit: `feat: flexible splits + multiple payers`

---

## 6. Phase 6 — Multi-Currency Conversion & FX Snapshots

**6.1 FX service** ⚠️ (API exists, not wired to UI)
- [x] `api/rates.ts`
  - [x] `getRate(fromCurrency, toCurrency, date?)` — use Frankfurter API
    - endpoint: `https://api.frankfurter.app/YYYY-MM-DD?from=USD&to=EUR`
  - [x] fallback: if group currency == expense currency → rate = 1, no API call
  - [x] error handling: if rate fetch fails, disallow save OR allow with manual rate override
- Frankfurter supports ECB currencies; for others, optionally let user input a manual rate.

**6.2 Expense creation flow** ❌
- [ ] When user chooses different `originalCurrency` than group currency:
  - [ ] load rate for `expenseDate` (or latest if blank)
  - [ ] show rate + converted amount next to amount field
  - [ ] on submit, populate:
    - [ ] `convertedAmount = originalAmount * rate`
    - [ ] `groupCurrency = group.baseCurrency`
    - [ ] `rateSnapshot = { date, rate, source: 'frankfurter' }`
- All internal balances use `convertedAmount` and `groupCurrency`

**6.3 Display strategy** ❌
- [ ] Expense list shows:
  - [ ] primary: `formatMoney(convertedAmount, groupCurrency)`
  - [ ] secondary faded: `originalAmount originalCurrency` if different
- [ ] Expense detail / edit:
  - [ ] allow changing date and recomputing rate
  - [ ] allow locking a manual rate if API fails

**6.4 Edges** ⚠️ (warning done, no expense check yet)
- [x] Changing group base currency on an existing group:
  - [x] do NOT retroactively convert existing expenses
  - [x] keep their stored `convertedAmount` as historical snapshot
  - [x] new expenses use new base currency
  - [ ] optionally warn user about mismatch (or disallow change if expenses exist)

**6.5 Validation gate** ❌
- [ ] Expense in EUR saved in USD group → converted correctly
- [ ] Historical date uses past rate (if available from Frankfurter)
- [ ] Same-currency expense skips API
- Commit: `feat: multi-currency + fx snapshots`

---

## 7. Phase 7 — Balances, Settlements, Activity Log

**7.1 Balance computation** ❌
- [ ] `utils/balances.ts`
  - [ ] `aggregateNetBalances(expenses[], settlements[])` → `Map<userId, net>`
  - [ ] `simplifyDebts(netMap)` → list of `{ from, to, amount }`
  - [ ] algorithm: greedy min/max settlement reduction

**7.2 Balances tab UI** ❌
- [ ] Header cards:
  - [ ] “You are owed X” / “You owe Y” in group currency
- [ ] “Settle up” suggestions list: who pays whom
- [ ] Per-member summary table: name, paid total, owed total, net
- [ ] Filter by date range

**7.3 Settlements** ❌ (types only defined)
- [ ] Settlement is a special expense or separate document:
  - I recommend separate `settlements` subcollection for clarity:
  - `groups/{gid}/settlements/{sid}`
    - `{ id, fromUserId, toUserId, amount, currency, note, createdBy, createdAt }`
- [ ] UI:
  - [ ] “Record settlement” button next to suggestion
  - [ ] Pre-fill from/to/amount
  - [ ] Confirmation writes settlement doc
  - [ ] Balances instantly update
- [ ] Expense store/balance calculator includes settlements

**7.4 Activity log** ❌ (types only defined)
- [ ] Subcollection `groups/{gid}/activity/{aid}`
  - `{ id, type: 'EXPENSE_CREATED'|'EXPENSE_UPDATED'|'EXPENSE_DELETED'|'SETTLEMENT_CREATED'|'MEMBER_ADDED'|'MEMBER_REMOVED', entityId, message, createdBy, createdAt }`
- [ ] On every write (create/edit/delete expense, add/remove members, settlement):
  - [ ] client-side insert activity log entry
  - OR move to Cloud Functions once stable (but client-side is fine for MVP)
- [ ] Group detail → Activity tab: chronological timeline with avatars, colored pills, messages

**7.5 Validation gate** ❌
- [ ] Balances match real-world scenarios you test manually
- [ ] Settlement reduces suggested debt
- [ ] Activity log shows the 5 main events
- Commit: `feat: balances + settlements + activity`

---

## 8. Phase 8 — Polish, Security, Validation, Deploy

**8.1 UX polish** ⚠️ (partially done)
- [x] Skeleton loaders for group/expense lists
- [x] Empty states for no groups, no expenses
- [ ] Confirmation dialogs for destructive actions (DeleteGroupDialog in progress)
- [x] Mobile responsive: drawers, stack layouts, condensed tables → cards on mobile
- [ ] Search + filters: by user, by date, by min/max amount
- [ ] Currency defaulting: remember last-used per group in UI store

**8.2 Validation / edge cases** ⚠️ (partially done)
- [ ] Zero-amount and negative amounts blocked by schema
- [ ] Split with single participant handled (paid by same person)
- [ ] Soft-delete or restore if desired (else hard delete + confirmation)
- [ ] Member removal when balances exist → prompt settle first or freeze historical

**8.3 Firestore security rules (finalize)** ⚠️ (basic only)
- [x] Lock `users` profile to owner only
- [x] Lock groups + subcollections to members only (groups root only so far)
- [ ] Ensure `expense.groupId` matches path
- [ ] Validate `createdBy === request.auth.uid` on create
- [ ] Allow update/delete by any group member (or restrict to creator if you prefer)
- [ ] Validate currency and sum invariants where possible in rules (at least the critical ones)

**8.4 Hosting / deploy** ❌
- [x] Build: `npm run build` (works)
- [ ] `npm i -g firebase-tools`
- [ ] `firebase login`
- [ ] `firebase init hosting` → point to `dist`
- [ ] Add `public` rewrite to `index.html` for SPA
- [ ] Add GitHub Actions deploy script or just `firebase deploy` manually

**8.5 Performance / monitoring** ❌
- [ ] Add Firestore indexes for common queries: `expenses by groupId + expenseDate`
- [ ] Avoid reading entire group history on every visit: implement pagination or date window
- [ ] Optional: enable Firebase Performance Monitoring (free tier)

**8.6 Final manual smoke test script** ❌
1. [ ] Sign up user A and user B
2. [ ] A creates group “Trip” with EUR base, adds B
3. [ ] B logs in, sees group, adds “Dinner €120” paid by B, split equal (A+B)
4. [ ] A adds “Hotel 800 PLN” on 2024-06-01, paid by A, equal split → verifies EUR conversion
5. [ ] Balances tab shows correct net for A and B
6. [ ] A records settlement for exact suggested amount to B
7. [ ] Balances go to zero
8. [ ] Activity log shows all 5 events
9. [ ] Edit an expense → values + activity update correctly
10. [ ] Delete an expense → balances revert

**Commit:** `chore: polish, security rules, deploy setup`

---

## Suggested Implementation Order of Work (by priority)

1. ✅ `Phase 1` + `Phase 2` — single push: you’ll have a runnable skeleton
2. ✅ `Phase 3` Groups/Members — foundational for everything else
3. ✅ `Phase 4` Expenses with equal split — app is usable for real equal-split single-payer scenarios
4. ✅ `Phase 5` flexible splits + multiple payers — all four split types, multi-payer, Edit now works
5. ❌ `Phase 7 (part 1)` basic balances from net effects across all expenses — see it’s computing right
6. ❌ `Phase 6` FX conversion — makes it multi-currency useful (FX API wired, dialog part done; now finalize edge handling + display)
7. ❌ `Phase 7 (rest)` settlements + activity log
8. ❌ `Phase 8` polish + rules + deploy
