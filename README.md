# SmartMoney

SmartMoney is a web app for tracking shared expenses and debts between friends, households, or travel groups. It records who paid, how an expense is split, and which repayments have been made, so everyone can see what they owe or should receive. Expenses in different currencies are converted into each group's fixed base currency.

You can run the frontend locally or host it yourself and connect it to your own Firebase project. Firebase remains the hosted backend; the app records repayments but does not transfer money.

## Libraries and tools

| Purpose                     | Libraries / tools                                                            |
| --------------------------- | ---------------------------------------------------------------------------- |
| Application                 | React 19, React DOM, TypeScript, Vite 8                                      |
| Routing                     | React Router                                                                 |
| UI and styling              | Tailwind CSS 4, shadcn/ui with Base UI, Lucide React, Sonner, tw-animate-css |
| CSS class helpers           | class-variance-authority, cn                                                 |
| Client state                | Zustand                                                                      |
| Requests and caching        | Axios, TanStack Query                                                        |
| Forms and validation        | React Hook Form, Zod, @hookform/resolvers                                    |
| Authentication and database | Firebase SDK (Firebase Auth and Cloud Firestore)                             |
| Debt visualization          | React Flow (@xyflow/react)                                                   |
| Translation and dates       | i18next, react-i18next, Day.js                                               |
| Error handling              | react-error-boundary                                                         |
| Development checks          | ESLint, Prettier, Node.js test runner                                        |

See [package.json](package.json) for dependency declarations and [package-lock.json](package-lock.json) for pinned versions.

## Data storage

**Cloud Firestore is the only implemented database provider.** The browser reads and writes through the Firebase SDK, with access controlled by [firestore.rules](firestore.rules). Firebase Authentication manages accounts and sign-in through email/password or Google.

| Location                                      | Stored data                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `users/{userId}`                              | User profiles and preferences; document IDs match Firebase Auth user IDs                  |
| `friendships/{friendshipId}`                  | Friend requests and accepted relationships                                                |
| `groups/{groupId}`                            | Group metadata, member IDs, author, and fixed base currency                               |
| `groups/{groupId}/expenses/{expenseId}`       | Original expenses, payer contributions, split definitions, and saved currency conversions |
| `groups/{groupId}/settlements/{settlementId}` | Recorded repayments between group members                                                 |

Balances, suggested transfers, and direct debt links are calculated from these records; they are not separate stored debt documents. Browser local storage holds UI preferences such as theme and language, while exchange-rate caching is in memory. Neither is the source of truth for the ledger.

The Firebase storage-bucket setting is part of the web app configuration, but the app currently does not use Firebase Storage for files. Switching to another database requires changing the data-access code; there is no database-provider selector.

## Exchange-rate providers

| Provider            | Role                                                                                                                  | Configuration                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| ExchangeRate-API v6 | Primary provider for current rates, accessed through the same-origin `/api/rates?base=USD` Vercel Function            | Server-side `EXCHANGE_RATE_API_KEY`                     |
| Frankfurter v2      | Historical rates and fallback for current conversions when the primary provider fails or lacks the requested currency | Called directly from the browser; no API key configured |

Dates are evaluated in UTC. Today uses the latest available rate; earlier dates use Frankfurter history. Future dates are rejected for currency conversion. Converting a currency to itself uses a rate of `1` without a request. Availability depends on the provider's supported currencies and dates; a failed lookup prevents saving an expense that needs conversion.

Each converted expense saves the rate, provider, and actual rate date together with its converted total. Later market changes do not change existing debts. Editing an expense retains its snapshot if the currencies and expense date stay the same; changing those inputs requests a new rate.

TanStack Query shares current rate tables by base currency until the provider's next update, capped at 24 hours. Historical conversion results stay fresh for 30 days; current fallback results and primary failures are cached for five minutes. This cache is local to the browser session and resets on reload.

## Run with your own data

### 1. Install dependencies

Use Node.js 24 LTS and npm. From the cloned repository:

```sh
npm ci
```

### 2. Create your Firebase backend

In the Firebase Console:

1. Create a project and register a web app. Copy its Firebase configuration for the next step.
2. Create a Cloud Firestore database using the default database ID.
3. Open the database's **Rules** tab, replace its contents with [firestore.rules](firestore.rules), and publish them before using the app.
4. Enable **Authentication > Sign-in method > Email/Password**. To use Google sign-in, also enable **Google** and select a support email.
5. Under **Authentication > Settings > Authorized domains**, add the hostname you will use, including `localhost` or `127.0.0.1` for local development as applicable.

### 3. Configure the app

Copy [.env.example](.env.example) to `.env.local` and fill in your web app's configuration:

```dotenv
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-web-app-id
VITE_APP_BASE_CURRENCY=USD

# Optional: used only by the server-side rates function.
EXCHANGE_RATE_API_KEY=your-exchangerate-api-key
```

`VITE_APP_BASE_CURRENCY` sets the initial default currency for new user profiles. Each group has its own base currency, fixed when the group is created.

Variables prefixed with `VITE_` are included in the frontend bundle. Keep the ExchangeRate-API key server-side and never give it that prefix. `.env.local` is ignored by Git.

### 4. Start locally

```sh
npm run dev
```

Open the URL printed by Vite. This serves the frontend only: current conversions fall back to Frankfurter because the Vercel Function is unavailable. Your Firebase backend is still required for authentication and ledger data.

To run the frontend and the primary rates endpoint together, configure `EXCHANGE_RATE_API_KEY` in the local server environment and run:

```sh
npx vercel dev
```

Follow the CLI prompts to link your Vercel project. Restart the development server after changing environment variables.

### 5. Add your records

Create an account in your app, create a group, and choose its base currency. Other participants must sign up against the same Firebase project; establish accepted friendships before adding them to a group. Then enter expenses and record repayments as they happen. The app creates its Firestore documents as you use it; no manual seed data is required.

Using a new Firebase project gives you a separate dataset. Local development writes to whichever project is configured in `.env.local`, so use a separate project when experimenting with data you do not want to keep.

### Build and host

```sh
npm run build
npm run preview
```

The production frontend is written to `dist`; `preview` serves that build locally without the rates function. For Vercel deployment, configure the same environment variables in the project settings and redeploy after changes. [vercel.json](vercel.json) routes frontend URLs to the SPA while preserving `/api/` routes. Add the deployed hostname to Firebase Auth's authorized domains.

On another static host, configure an SPA fallback to `index.html`. The primary rates provider also needs a compatible server endpoint at `/api/rates`; without it, current conversions use Frankfurter.

## How debts work

### Expense records and rounding

An expense stores:

- `originalAmount` and `originalCurrency`: the purchase total as entered.
- `convertedAmount` and `groupCurrency`: the rounded total in the group's base currency.
- `rateSnapshot`: the conversion rate, its date, and its source when currencies differ.
- `paidBy`: each payer's contribution in the original currency.
- `participants` and `splitType`: how the cost is divided, using equal shares, exact original-currency amounts, percentages, or whole-number share weights.
- The expense date, author, editor, and creation/update timestamps.

The converted total is `round(originalAmount * rate, 2)`. Payer contributions and participant shares are allocated from that saved total, so both sides add up to the same amount. Calculations use integer hundredths (cents), distributing rounding remainders deterministically. The current implementation uses two decimal places for every currency.

### Member balances and suggested repayments

For each group, a member's balance is:

```text
net = expenses paid - expense shares owed + repayments sent - repayments received
```

A positive balance means the member should receive money; a negative balance means they owe money. Separate currencies are calculated separately. Current-rate conversions used in summaries are for display and do not rewrite ledger amounts.

For example, Alice pays USD 90 for an expense shared equally by Alice, Bob, and Carol. Each owes USD 30, so Alice's net balance is +60, and Bob's and Carol's are -30 each. Recording Bob's USD 30 repayment to Alice changes their balances to 0 and +30 respectively; Carol still owes USD 30.

Suggested repayments match debtors and creditors using a deterministic greedy algorithm. They preserve each person's net balance but may route a payment to someone other than the original expense payer. They do not guarantee the smallest possible number of transfers, and merely displaying them writes nothing.

### Recording repayments

A repayment is saved as a separate settlement document containing the group, sender, recipient, amount, currency, optional note, author, and creation timestamp. It stores both decimal `amount` and integer `amountMinor` (hundredths). It must use the group's base currency, and only its sender or recipient can record it.

Writes use a Firestore transaction and a stable settlement ID, allowing retries of the same submission without creating duplicate payments. Suggested-payment saves refresh the group's ledger first to detect changed balances. Multiple payments are saved individually, so a partially completed operation can be retried; it is not one atomic transaction across all payments.

Repayments do not modify the original expense. Settlement records cannot be edited in place; their author can delete an incorrect record and create a corrected one. Older expenses marked `isSettlement` are still treated as repayments when calculating balances.

### Direct debts and payment allocation

Direct debts are reconstructed expense by expense. A payer first covers their own share; remaining debtor shares are distributed proportionally among payer credits, with deterministic rounding and user-ID ordering. For expenses with multiple payers, this is a calculation convention: the stored expense does not specify individual debtor-to-creditor obligations.

Opposite-direction debts and cycles remain visible even when they cancel out in net balances. For example, a chain of Alice owing Bob and Bob owing Carol can produce a simplified suggestion for Alice to pay Carol directly.

Recorded payments reduce the oldest expense contributions in the same group, ordered by expense date and ID. Payments are processed by creation time and ID. Allocation consumes a direct debt first, then the shortest available directed path for a simplified payment. These assignments are recalculated from the ledger and are not saved as links between payments and expenses.

If a payment cannot be fully matched, such as an advance or overpayment, the direct-debt view omits that group and marks its totals incomplete. Missing display exchange rates also produce incomplete totals while preserving the original group-currency amounts. Neither case changes the saved records.

### Access and integrity

Group ledgers are readable by group members. Only an expense's author can edit or delete it, and only a settlement's author can delete that payment record during normal use. A group owner can delete the entire group and its ledger. Group currency cannot change, and member removal is blocked after ledger history exists.

Client-side validation checks splits and amounts; Firestore rules enforce access and additional record constraints. Publish and verify those rules in your own project: local tests do not establish that your deployed Firebase configuration is correct. The rates endpoint hides the provider key but is public and does not authenticate callers or enforce an application-level quota.

## Development checks

```sh
npm test
npm run lint
npm run build
```

Tests cover ledger arithmetic, rounding, settlement planning, direct debt allocation, exchange-rate handling, and API behavior with mocked dependencies. A working sign-in and read/write flow should also be checked against your own Firebase project.

## License

[MIT](LICENSE).
