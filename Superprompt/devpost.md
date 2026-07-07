# RentMe

### One property. One identity. Every listing tells the truth.

---

## Inspiration

*[Claude's section — emotional storytelling about the Nigerian rental market, bait-and-switch listings, wasted inspection fees, and why trust infrastructure matters.]*

---

## What it does

RentMe is a real-estate marketplace where every property has a permanent digital identity — a **Property Passport** — and every rent payment flows through a **Solana escrow smart contract**. Tenants discover verified listings, reserve properties, pay rent in USDC (held in escrypt until move-in), and get refunds if the deal falls through. Landlords receive payouts plus platform fees automatically on-chain. The platform also supports hiring service professionals (cleaning, plumbing, repairs) under the same escrow lifecycle.

Key features:
- **Property Passport** (`RM-<STATE>-<SERIAL>`) — permanent on-chain identity per physical building, regardless of how many times it's listed or who manages it
- **Duplicate detection** — before a new listing is created, the system checks existing passports by address, preventing the same apartment from being listed five different ways
- **USDC escrow** — rent and service payments held in a Solana escrow program. Tenant deposits USDC, worker/landlord marks completion, tenant confirms, funds release automatically with platform fee split
- **Platform-paid gas** — users never touch SOL. Admin keypair signs as fee payer for every Solana transaction
- **Non-custodial wallets** — keypairs encrypted with AES-256-GCM (per-user key derived via HMAC-SHA256), stored server-side. Users don't manage seed phrases
- **Fiat wallet** — NGN balance for Paystack deposits, USDC on-ramp/off-ramp at 1500 NGN/USDC, bank withdrawal requests
- **iOS-native UX** — light mode default, spring animations, blur backdrops, bottom-sheet toasts, slide-in success modals, expandable notification cards, Canvas-generated receipt images (zero dependencies)

---

## How we built it

### Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | **React 19 + Vite + TypeScript** | Fast builds, type safety, modern React patterns |
| State | **Redux Toolkit** | Predictable auth state across 40+ pages |
| Styling | **SCSS Modules** | Component-scoped styles, shared design tokens |
| Icons | **lucide-react** | Clean, consistent, lightweight |
| Backend | **Cloudflare Workers** | Edge compute, zero cold-start (Node.js compat), D1 + KV integrations |
| Database | **Cloudflare D1 (SQLite)** | Serverless SQL, per-request connection, cheap at scale |
| Cache/Persist | **Cloudflare KV** | Idempotency keys, deposit tracking, wallet recovery |
| Smart Contracts | **Anchor 1.1.2 (Rust)** | Production Solana framework with PDA accounts and CPI |
| Solana Client | `@solana/web3.js` v1.x + `@solana/spl-token` | On-chain reads, token accounts, ATA management |
| Encryption | `node:crypto` AES-256-GCM | Native, no dependencies, FIPS-compliant |
| Mnemonic | `bip39` | Wallet generation from 12-word phrases |
| Email | **Resend** | Transactional OTP delivery |
| SMS | **Termii** | Phone verification for Nigerian numbers |
| Payments | **Paystack** | Naira on-ramp (bank transfers, cards, USSD) |
| AI | **OpenAI** | In-app assistant for tenant questions |

### Architecture

```
React SPA (Cloudflare Pages)
       │
       ▼
Cloudflare Worker (rentme-api.workers.dev)
       ├── D1 Database (SQLite) — users, properties, reservations, wallets
       ├── KV Namespace — deposit verify idempotency, wallet recovery
       └── Solana devnet — escrow program + USDC transfers
             ├── Escrow Program (GCNQKEZyJVa3qUMJSNv7o8C48GuHcvBbaYscer4ccEk)
             ├── USDC Mint (Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr)
             └── Admin Wallet (4c7XzHZ1Pu2JER8ffn8agVCsHfBrz5CR847ZMGGCzKXj)
```

### Database (7 migrations, ~20 tables)

- **0001**: Core — users, wallets, property_passports, properties, reservations, fraud_reports, sessions
- **0002**: Seed data — 3 verified properties in Lagos + Abuja
- **0003**: Features — wallet_transactions, notifications, rewards, service_providers, reviews
- **0004**: Payments + admin — paystack_transactions, kyc_sessions, admin seed
- **0005**: Encrypted key column — `ALTER TABLE users ADD ton_encrypted_key`
- **0006**: Withdrawal requests — bank withdrawal tracking table
- **0007**: Property Passport system — extended passports with address fields + passport_number + state_code, new property_units + property_access tables, rebuilt properties table

### Solana Escrow Program

Written in Rust with Anchor 1.1.2. Four instructions:

1. **init_escrow(tenant, worker, nonce, fee_bps, commitment_amount, fee_collector, escrow_token_account, amount)** — creates PDA `Escrow[escrow, owner, nonce]`. Owner is always the admin keypair. Nonce ensures unique addresses.

2. **mark_done()** — worker signs to declare job complete. Sets `worker_done = true`.

3. **confirm()** — tenant signs. Reads live `escrow_token_account.amount` (actual SPL token balance), not the stored amount. Calculates fee = `commitment_amount * fee_bps / 10000`, splits remaining between worker and fee_collector. Deactivates escrow.

4. **refund()** — worker signs (must agree to refund). Transfers entire escrow token balance back to tenant. Deactivates escrow.

Discriminators: SHA256 of `global:<instruction_name>` — first 8 bytes.

### Wallet & Payment System

**Wallet creation**: On profile completion, generates Solana `Keypair.generate()`, encrypts private key with AES-256-GCM. Per-user encryption key = HMAC-SHA256(server_key, user_email). Stored in DB as `ton_encrypted_key` (legacy column name). User gets NGN 0 balance — no free money.

**USDC deposit flow**:
1. Frontend initiates deposit → backend returns user's Solana wallet address + USDC mint
2. User sends USDC from their external wallet (MetaMask, Phantom, etc.)
3. User clicks "I've sent it" → frontend polls `POST /wallet/deposit/usdc/verify` (30 retries × 3s)
4. Backend checks on-chain balance via `solana.tryGetTokenBalance()` — reads actual token account
5. KV key `usdc_credited:{userId}` tracks last credited raw balance; credits only the increase since last check
6. Fallback: if no pending KV record, credits delta from last credited balance — survives page refresh
7. NGN credited at 1500 rate, wallet_transaction recorded

**USDC withdrawal**: Backend converts NGN to USDC, admin transfers from admin wallet to user's wallet, deducts NGN from user balance. Single transaction.

**Naira withdrawal**: User enters bank details (verified via Paystack bank resolution), backend deducts NGN and creates pending `withdrawal_request`. Admin processes manually.

### Property Passport System

Each physical building gets one passport with number format `RM-<STATE_CODE>-<6_DIGIT_SERIAL>`. State codes defined in a lookup table. The system supports:
- **Search** — match existing passports by street + house number + city + state
- **Unit management** — buildings can have multiple units (apartments, self-contains, etc.)
- **Access control** — roles (owner, property_manager, caretaker) per passport
- **Listing creation** — creates passport + unit + listing in one atomic transaction, or links to existing passport

### Frontend Details

- **40+ pages** organized under a tab-bar shell (`AppShell.tsx`) with protected routing
- **`SubPageHeader.tsx`** — reusable iOS-style back button (`< ChevronLeft + label` in `#007aff`). Uses `navigate(-1)` with `backHref` fallback. Applied across all sub-pages.
- **`Toast.tsx`** — slide-up from bottom, blur backdrop, auto-dismiss 4s, wrapped in `AppShell`
- **`ThemeProvider.tsx`** — default light mode (changed from dark). Toggle persisted in `localStorage.rentme_theme`
- **`downloadReceiptImage()`** — Canvas API renders 600×420 PNG receipt. No `html2canvas` dependency. Used by WalletPage + PayHirePage.
- **ListPropertyPage** — 3-step form (address → passport search/unit picker → listing details). Custom iOS-style state picker replaces native `<select>`.
- **HirePage** — category → gender selection (Male/Female pills with icons) → workers view. Humanized empty states.
- **WalletDepositPage** — dual-tab (Naira Paystack / USDC Solana). iOS success modal with green checkmark + blur backdrop.
- **WalletPage** — expandable transaction cards with receipt PNG download.
- **MessagesPage** — client-side only (localStorage). Empty state for landlord tab. Support tab has welcome message.
- **NotificationsPage** — 2-line preview truncation, tap to expand/collapse.

### API Layer (Cloudflare Worker)

~40 route handlers covering auth, properties, passports, wallet (deposit/withdraw/verify), reservations, escrow lifecycle, admin, payments, phone, notifications, KYC, services, rewards, AI chat, and fraud reports.

CORS configured for development (allows all origins in dev mode). Session-based auth via HttpOnly cookie with 30-day TTL.

---

## Challenges we ran into

### 1. Cloudflare Workers blocked by public Solana RPC

`api.devnet.solana.com` blocks Cloudflare Workers IP ranges outright. The `getAccount` and `getTokenAccountBalance` calls would hang or return 403. We switched to **Alchemy devnet** (`https://solana-devnet.g.alchemy.com/v2/<key>`) which works reliably from Workers. This cost us several hours of debugging — the error messages from the public RPC were opaque timeouts rather than clear IP blocks.

### 2. Fee calculation design — where does the fee come from?

We debated whether the platform fee should be:
- **Deducted from landlord's payout** (subtracted from escrow balance)
- **Added on top** (tenant pays full price + fee in separate transaction)

We chose **fee on full price** because it's simpler and fairer: the program stores the full listing price in `commitment_amount`, calculates fee as `price * fee_bps / 10000` at confirm time, and the fee comes off the top before the worker/landlord is paid. The fee is configurable per escrow via the `fee_bps` field set at `init_escrow`.

One subtle issue: if a tenant deposits the commitment amount in multiple transactions (split deposits), the `amount` field in the Escrow account becomes wrong — it only reflects the first deposit. We fixed this by **reading the live SPL token balance** (`escrow_token_account.amount`) at confirm/refund time instead of the stored `amount` field. This prevents stuck tokens from partial deposits.

### 3. Per-user encryption key derivation

Initial approach: encrypt all wallets with a single server key (AES-256-GCM). Problem: server key leak = all wallets compromised.

Solution: derive per-user keys via `HMAC-SHA256(server_key, user_email)`. Server key leak alone can't decrypt anything — attacker also needs the specific user email. Added a version prefix byte (`0x01`) to the encrypted output so we can rotate the key derivation scheme in the future without breaking existing wallets.

### 4. USDC deposit verification idempotency

The deposit flow is: user sends USDC → clicks "I've sent it" → backend checks balance → credits NGN. Problem: what if the user refreshes the page before the poll completes? Or what if the RPC is slow and the check times out? The user shouldn't lose their deposited amount.

Solution: two-tier KV tracking:
1. `usdc_deposit:{userId}` — pending deposit metadata (`{ amount, preBalance }`), deleted on successful verify
2. `usdc_credited:{userId}` — last credited raw balance, persists for 365 days

Fallback logic: if no pending KV exists but the current on-chain balance exceeds the last credited balance, the backend credits the increase. This means even if the frontend crashes mid-flow, the user can try again and the system won't double-credit.

### 5. Mock data removal — empty states everywhere

Early builds had seed properties, mock rentals, mock workers, mock messages ("Oluwaseun A."), and mock wallet transactions. When we removed them, half the pages crashed or showed nonsensical data. We systematically:
- Deleted all mock data files (`mock-data.ts`, `mock-rentals.ts`, `mock-workers.ts`, `worker-types.ts`, `location-index.ts`)
- Added empty/default states to every page
- Changed frontend API client to return empty arrays/objects when no session exists (`hasClientSession()` check)
- Verified `npm run build` passed clean

### 6. Light mode vs dark mode default

The app was built in dark mode initially. User testing showed most people expected light mode on first visit. Fix was a one-line change in `ThemeProvider.tsx`: `return "light"` instead of `return "dark"`. Existing stored preference takes priority.

### 7. Native iOS back button behavior

React Router's default back behavior doesn't match iOS. We built `SubPageHeader.tsx` which uses `navigate(-1)` with a `backHref` fallback when there's no history. The visual: `< ChevronLeft icon + "PrevTitle"` in `#007aff`, 17px 500 weight. This had to be manually wired into every sub-page (16+ callers) with correct `prevTitle` text.

### 8. Solana build artifacts in git

Anchor creates a `target/` directory with ~400MB of Rust build artifacts. We had to add `solana/target` to `.gitignore` and remove `solana-admin-keypair.json` from tracking. Git history still contains the keypair files in the initial commit (devnet keys only — no real value at risk).

---

## Accomplishments that we're proud of

- **Live escrow lifecycle on Solana devnet** — the full flow works: init → deposit → mark-done → confirm, with fee split and platform-paid gas
- **Per-user encrypted wallets** — server-side keypairs encrypted with AES-256-GCM + HMAC-derived keys. Users never manage a seed phrase
- **Deposit verify with KV fallback** — survives page refresh, RPC failures, and timeout. No stuck deposits
- **Property Passport system** — separates physical property from listings with duplicate detection, unit management, and permanent passport numbers
- **Clean migration 0007** — rebuilt the `properties` table in production without data loss (SQLite `CREATE TABLE new + INSERT INTO new + DROP old + RENAME`)
- **Zero-dependency receipt images** — Canvas API renders PNG receipts for wallet and hire payments
- **iOS-native frontend** — spring animations, blur backdrops, slide-in modals, expandable cards, custom state picker

---

## What we learned

**Solana RPCs are not all equal for serverless.** Public devnet RPC blocks Workers IPs. Always test your RPC choice against your serverless provider before building on top of it.

**Fee payer architecture simplifies UX enormously.** Users never see SOL or gas fees. They just sign once (via the admin-bundled transaction) and the platform handles the rest. This is critical for non-crypto-native users in emerging markets.

**Encryption is not storage.** Storing encrypted keypairs means you have to think about key rotation, versioning (`VERSION` prefix byte), and what happens if the encryption key changes. Plan for rotation from day one.

**Mock data hides bugs.** Every page that showed mock data had a crash path when the real API returned nothing. Removing all mocks early forced us to handle loading, empty, and error states everywhere — the app is stronger for it.

**Live balance reads prevent stuck tokens.** The naive approach stores `amount` at init time. The correct approach reads `escrow_token_account.amount` at confirm/refund time. This handles split deposits, partial sends, and edge cases gracefully.

---

## What's next

- Wire "pay remaining balance" from frontend → deposits remaining + fee into escrow
- Move avatar storage from localStorage to server-side file upload
- Rename legacy column `ton_wallet_address` → `solana_wallet_address` across the schema
- Add rate limiting and session expiry hardening before public testing
- Write listing detail pages to consume Property Passport + Unit data
- Build real backend for chat/messaging (tenant ↔ landlord ↔ support)

---

*Built with React 19, TypeScript, Solana (Anchor), Cloudflare Workers, and a lot of patience debugging Solana RPCs from serverless.*
