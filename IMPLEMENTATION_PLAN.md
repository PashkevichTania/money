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
  - [x] Remove member UI and API
  - [ ] Guard removal when the member has an outstanding balance or appears in historical expenses
- [x] Settings tab: rename; read-only base currency chosen at creation

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

**6.1 FX service** ✅ (API is wired to the expense dialog; runtime verification remains)
- [x] `api/rates.ts`
  - [x] `getRate(fromCurrency, toCurrency, date?)` — use Frankfurter API
    - endpoint: `https://api.frankfurter.app/YYYY-MM-DD?from=USD&to=EUR`
  - [x] fallback: if group currency == expense currency → rate = 1, no API call
  - [x] error handling: if rate fetch fails, disallow save OR allow with manual rate override
- Frankfurter supports ECB currencies; for others, optionally let user input a manual rate.

**6.2 Expense creation flow** ⚠️ (implemented in code; verify with Firebase and fix exact-split conversion)
- [ ] When user chooses different `originalCurrency` than group currency:
  - [x] load rate for `expenseDate` (or latest if blank)
  - [x] show rate + converted amount next to amount field
  - [x] on submit, populate `convertedAmount`, `groupCurrency`, and `rateSnapshot`
  - [ ] verify create/edit flows against live Firestore, including a failed rate request
- All internal balances use `convertedAmount` and `groupCurrency`

**6.3 Display strategy** ⚠️
  - [x] Expense list shows converted amount first and original amount second when currencies differ
- [ ] Expense detail / edit:
  - [ ] allow changing date and recomputing rate
  - [ ] allow locking a manual rate if API fails

**6.4 Base currency policy**
- [x] Base currency cannot change after creation, regardless of expense count.
- [x] UI displays a read-only currency; API and Firestore rules reject changes.
- [ ] Audit legacy groups that already contain expenses in different group currencies before aggregation.

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
- [x] Lock group documents to members
- [ ] Add explicit rules for `groups/{gid}/expenses/{eid}`; Firestore subcollections do not inherit parent rules
- [ ] Verify expense create/read/update/delete as a member and denial as a non-member in the emulator
- [ ] Ensure `expense.groupId` matches path
- [ ] Validate `createdBy === request.auth.uid` on create
- [ ] Allow update/delete by any group member (or restrict to creator if you prefer)
- [ ] Validate currency and sum invariants where possible in rules (at least the critical ones)

**8.4 Hosting / deploy** ❌
- [ ] Restore a passing TypeScript build (`MembersTab.tsx` Avatar `src` currently accepts `null`)
- [ ] Restore a passing lint run (audit found 9 errors and 11 warnings)
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

1. Fix the Firestore expense rules, TypeScript/lint failures, and multi-currency exact-split math (audit below).
2. Connect the existing Tailwind/shadcn setup and migrate the app shell and auth pages.
3. Migrate groups and expenses screen by screen, keeping existing behavior working.
4. Implement aggregate balances and replace Dashboard placeholders.
5. Verify FX create/edit flows, then implement settlements and activity.
6. Finish member-removal guards, group deletion, filters, deployment, and smoke tests.

---

## Code Audit and shadcn/ui + Tailwind Migration (2026-09-19)

This section records what was verified in the repository. Earlier checkmarks describe implementation history, not a current passing release gate. No Firebase runtime test was performed during this audit.

### A. Functional fixes before relying on balances

- [x] Add member-scoped expense rules validating group path, authorship, positive totals and group currency. Preserve creator metadata on update; block writes during deletion. Emulator verification and deployment remain pending.
- [x] Fix exact FX splitting using the saved converted total and original-currency weights, with deterministic largest-remainder rounding.
- [x] Apply cent allocation to multiple payers, equal splits and automatic payer distribution. Tiny totals no longer produce negative shares.
- [x] Test all four split modes with/without FX, multiple payers, zero-sum balances, tiny amounts, invalid values, historical rates, unsupported currencies and network failure.
- [x] Base currency is immutable immediately after creation, even for empty groups. Enforced in UI, API and Firestore rules; obsolete store action removed.
- [x] Group deletion locks new expense writes, cleans expenses/settlements/activity in batches and deletes the parent last. Failed cleanup retains the parent and can be retried. API tests cover batching and failure/retry.
- [x] Conservatively retain membership after the first expense; adding members remains allowed. Expense writes atomically set permanent `hasExpenseHistory: true`. Legacy groups without the flag also block removal; new empty groups explicitly start with `false`.
- [x] Fix FX form state: preserve snapshots for unchanged date/currencies, block stale-rate saves, remove double conversion in preview and clear snapshots when editing back to group currency. API validates totals/membership and rejects edits of concurrently changed/deleted expenses.
- [ ] Verify create/edit/delete and denial cases against Firestore/emulator. Tests mock Firestore/HTTP; no deployed-rule or live round-trip verification was performed. Java/Firebase CLI are unavailable here.

These remain Phase 7 feature work:
- [ ] Replace Dashboard placeholders with actual data, keeping group currencies separate.
- [ ] Build aggregate Balances, settlements, Activity and filter UI.

Allocation retains the existing two-decimal monetary model. Currency-specific minor-unit precision and previously mixed-currency groups require separate work before aggregation. Firestore rules enforce basic invariants; arbitrary payer/split sums are validated in the application API.

### B. Current quality gate

- [x] Fix nullable Avatar source in MembersTab.
- [x] Fix lint errors/warnings, ref access, unstable dependencies and effect-driven local state.
- [x] Fix the unstable empty-array Zustand selector in ExpenseList.
- [x] Local verification: 27 tests, TypeScript, lint and production build pass. Build retains a bundle-size warning.
- [ ] Firebase/emulator smoke tests and rule deployment remain required; no live data was changed.

### C. UI migration

- [x] Correct `components.json` CSS path to `src/globals.css`; expose the root TypeScript alias for future shadcn CLI additions.
- [x] Use `src/globals.css` as the single Tailwind entry, with semantic palette tokens and root `.dark` synchronization. Theme applies on auth pages and persists on reload.
- [x] Add the initial shadcn base-nova components under `src/components/ui`: Button, Input, Label, Card, Badge, Alert, DropdownMenu, Sheet, Skeleton and Separator. Add further components as screens migrate.
- [x] Migrate Topbar, Sidebar, AppLayout, login/signup and protected-route loading. Add accessible mobile navigation, account menu, password visibility controls, inline form errors and a skip link.
- [x] Migrate Dashboard, groups, members, expense list/form, settings and all dialogs. Live authenticated data-flow verification remains pending.
- [x] Replace MUI theme/CssBaseline with Tailwind tokens and notistack with Sonner. Remove MUI, Emotion, Roboto and unused theme dependencies.
- [x] Replace the starter README with setup, current UI migration status and verification limits.

### D. Visual direction and design tokens

The product should feel like a calm financial workspace: clear balances and actions first, with color used to explain state. Avoid making every card or button bright green. Use the palette as semantic tokens rather than hard-coded colors in components.

| Role | Color | Intended use |
| --- | --- | --- |
| Brand / strong text | `#0C4137` | Navigation, primary buttons, headings, active controls |
| Mint accent | `#06D6A0` | Focus, selected details, positive balance accents, small highlights |
| Soft mint | `#E6FBF6` | Selected rows, summary backgrounds, subtle success surfaces |
| Yellow | `#FED766` | Pending settlement, tips, attention without error |
| Raspberry | `#D1345B` | Destructive actions and negative balance accents |
| Blue | `#3454D1` | Informational states, links, exchange-rate details |

- [x] Define shadcn semantic tokens for background, foreground, card, border, primary, accent, destructive, ring, and sidebar in light and dark themes. Keep neutral white/off-white surfaces and dark readable text alongside this palette.
- [ ] Check contrast for text, icons, focus rings, and controls. `#06D6A0` and `#FED766` are too light for small text on white; use them as fills/accent marks with `#0C4137` text. `#D1345B` and `#3454D1` can carry text on white.
- [x] Add development-only `/ui-preview` with button variants, inputs/errors, badges, cards, alerts, sample rows, sheet dialog, skeletons and theme switching. Tabs will be added with the group screen migration.
- [ ] Use a compact 8px spacing scale, clear type hierarchy, restrained shadows, and consistent radii. Make monetary amounts easy to scan with tabular numerals and align them consistently in expense and balance lists.
- [ ] Dashboard: replace promotional feature cards with useful recent activity or groups once data exists. Make the balance summary the visual focus; show each currency separately until cross-currency totals are defined.
- [ ] Groups and expenses: keep content on light surfaces, use soft mint for selection, reserve full dark-green fill for the main action, and use mint sparingly for positive amounts. Give owed amounts a raspberry accent without relying on color alone; include labels and signs.
- [ ] Expense form: divide the long flow into clear sections (details, who paid, split, conversion, review), keep totals and validation visible, and ensure mobile users can reach the save action without losing context.
- [ ] Establish hover, focus, disabled, loading, empty, and error states for every migrated component; test keyboard navigation and narrow screens.

### UI migration verification (first slice)

- TypeScript and lint pass; production build checked after migration.
- Browser checks: login/signup required-field validation; light/dark rendering; 390px mobile layout; account dropdown; sheet confirmation and focus return. No real credentials or records were submitted.
- The shared shell and gallery were inspected at desktop size. Protected data pages still require a signed-in smoke test.
- Superseded by the full screen migration below; authenticated smoke testing remains outstanding.

### Dark theme and Google authentication (2026-09-20)

- [x] Use neutral near-black (`#101012`) and graphite (`#18181b`) backgrounds in dark mode, including both auth panels and the temporary MUI theme. Mint remains an accent.
- [x] Add Google sign-in to login and signup with Firebase `GoogleAuthProvider` and `signInWithPopup`, account selection, shared profile creation, pending state and translated errors. Popup cancellation is silent.
- [x] Add six mocked auth tests covering first sign-in, existing profile preservation, cancellation, blocked popup/provider/domain/network failures, duplicate requests and missing configuration. All 33 tests pass.
- [ ] Enable/verify Google provider and authorized domains in the Firebase project, then complete a real Google sign-in smoke test. Setup instructions are in README; remote Firebase configuration was not changed.

### Full UI migration and dotted surfaces (2026-09-20)

- [x] Apply 6px rounded-md surfaces and controls, retaining circular avatars and switch thumbs. Add a 20px radial dot grid to workspace/auth backgrounds.
- [x] Migrate remaining pages and dialogs to Tailwind/shadcn, including member search, destructive confirmations and all four expense split modes. Group detail uses Base UI tabs.
- [x] Divide the expense form into details, payers, split and review with a sticky action footer. Exact remainder filling explicitly updates the submitted values as well as the preview.
- [x] Replace Dashboard promotional/placeholder zero cards with actual groups and currencies. Save the default currency preference from Settings. Aggregate balances and activity remain separate unfinished features.
- [x] Remove MUI, Emotion, Roboto and notistack; use Sonner notifications.
- [x] TypeScript, ESLint, production build and all 33 tests pass. Build retains its large-chunk warning. Browser preview verified equal, exact remainder, percentage and weighted shares, safe validation submission without writes and a 390px expense dialog. Browser console has no errors.
- [ ] Complete authenticated Firebase smoke tests for group/member/expense CRUD and preference persistence. No live records were changed during UI verification.
