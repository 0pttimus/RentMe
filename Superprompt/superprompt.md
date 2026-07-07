# RentMe — Complete Specification

## 1. Project Identity

RentMe is a Nigerian real-estate marketplace with escrowed token payments. Renters browse verified properties, pay rent via USDC on Solana (escrowed until move-in confirmed), and landlords receive payouts after inspection. The platform also lets users hire service professionals (cleaning, plumbing, repairs, moving, etc.) with the same escrow: tenant deposits USDC, worker marks done, tenant confirms, funds release.

**Target users**: Nigerian tenants, landlords, and service professionals.
**Monetization**: Fee on escrow confirmations (fee_bps per escrow). Platform pays all Solana gas.

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | React | 19.2.4 |
| Build tool | Vite | ~6.3.5 |
| Language | TypeScript | ~5.x |
| Routing | react-router-dom | ~7.6.3 |
| State | Redux Toolkit | ~2.8.2 |
| Styling | SCSS (Sass) | ~1.89.2 |
| Icons | lucide-react | ~1.20.0 |
| Backend runtime | Cloudflare Workers | wrangler ~4.102.0 |
| Database | Cloudflare D1 (SQLite) | via wrangler |
| KV Store | Cloudflare KV | via wrangler |
| Solana framework | Anchor | 1.1.2 |
| Solana on-chain | `@solana/web3.js` | ~1.98.4 |
| SPL tokens | `@solana/spl-token` | ~0.4.14 |
| Encryption | `node:crypto` (AES-256-GCM) | native |
| Mnemonic | `bip39` | ~3.1.0 |
| Email | Resend (via REST) | — |
| SMS | Termii (via REST) | — |
| Payments | Paystack (Naira deposits) | — |

### Node compatibility

Cloudflare Workers run with `nodejs_compat` flag enabled (for `node:crypto`). The worker code uses `import crypto from "node:crypto"` directly.

---

## 3. Architecture

```
┌──────────────────────────┐     ┌──────────────────────────────┐
│  React SPA (Vite build)  │────▶│  Cloudflare Worker (API)     │
│  pages.cloudflare.com    │     │  rentme-api.workers.dev      │
│                          │     │                              │
│  src/pages/*.tsx         │     │  workers/src/routes/*.ts     │
│  src/components/*.tsx    │     │  workers/src/lib/*.ts        │
│  src/lib/api/client.ts   │     │                              │
│  src/store/*.ts          │     │  DB: D1 (SQLite)             │
│  src/styles/*.scss       │     │  KV: Cloudflare KV           │
└──────────────────────────┘     └──────┬───────────────────────┘
                                         │
                                ┌────────▼───────────────────────┐
                                │  Solana devnet                 │
                                │  Escrow program: GCNQKEZyJV... │
                                │  USDC mint: Gh9ZwEmdLJ8Dsc...  │
                                │  Admin wallet: 4c7XzHZ1Pu2J... │
                                └────────────────────────────────┘
```

**Key architectural decisions**:
- Admin keypair (`SOLANA_ADMIN_SECRET`) is the fee payer for all Solana transactions. Platform pays gas.
- Users never touch SOL. Their authorization is a signed transaction that admin bundles as fee-payer.
- Non-custodial wallets: encrypted keypairs stored in DB (`encrypted_secret` column). Encryption is AES-256-GCM with per-user key = HMAC-SHA256(server_key, user_email).
- USDC deposit: user sends USDC to their own wallet address from external wallet, then clicks "I've sent it". Backend polls on-chain balance and credits NGN.
- USDC withdrawal: admin sends USDC from admin wallet to user's wallet, deducts NGN from user's balance.
- Mock data has been removed entirely. Frontend shows empty states until real data exists.

---

## 4. Directory Structure

```
RentMe/
├── AGENTS.md                    # opencode agent instructions
├── package.json                 # Root package (frontend + worker)
├── tsconfig.json
├── vite.config.ts
├── .gitignore
├── .env.example
├── src/                         # Frontend React SPA
│   ├── main.tsx                 # Entry point
│   ├── App.tsx                  # Root layout (Outlet)
│   ├── router/
│   │   ├── index.tsx            # All routes
│   │   └── ProtectedRoute.tsx   # Auth guard
│   ├── store/
│   │   ├── index.ts             # Redux store setup
│   │   ├── hooks.ts             # Typed hooks
│   │   └── slices/
│   │       └── authSlice.ts     # Auth state
│   ├── lib/
│   │   ├── api/
│   │   │   └── client.ts       # All API functions
│   │   ├── auth/
│   │   │   ├── guard.ts        # Route protection helpers
│   │   │   ├── profile.ts      # Profile helpers
│   │   │   └── session.ts      # Session helpers
│   │   ├── theme/
│   │   │   └── ThemeProvider.tsx
│   │   └── receipt.ts          # Canvas receipt image generator
│   ├── components/
│   │   ├── AppShell.tsx        # Tab bar + global layout
│   │   ├── SubPageHeader.tsx   # iOS-style back button header
│   │   ├── SubPageHeader.module.scss
│   │   └── ui/
│   │       ├── Toast.tsx       # iOS-style toast
│   │       ├── Toast.module.scss
│   │       ├── ActionSheet.tsx  # iOS-style action sheet with title+description
│   │       └── Card.tsx        # Generic card component
│   ├── hooks/
│   │   └── useUnreadCount.ts   # Polls GET /notifications/unread-count
│   ├── pages/                  # 40+ page components
│   │   ├── AuthEmailPage.tsx
│   │   ├── VerifyPage.tsx
│   │   ├── WelcomeScreen.tsx
│   │   ├── ProfileSetupPage.tsx
│   │   ├── MarketsPage.tsx
│   │   ├── PortalPage.tsx
│   │   ├── WalletPage.tsx
│   │   ├── WalletDepositPage.tsx
│   │   ├── WalletWithdrawPage.tsx
│   │   ├── WalletPayPage.tsx
│   │   ├── PayHirePage.tsx
│   │   ├── HirePage.tsx
│   │   ├── PropertyPage.tsx
│   │   ├── ReservePage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── NotificationsPage.tsx
│   │   ├── KycPage.tsx
│   │   ├── TrustPage.tsx
│   │   ├── RentalHistoryPage.tsx
│   │   ├── ListPropertyPage.tsx
│   │   ├── RewardsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── HelpPage.tsx
│   │   ├── AdminPage.tsx
│   │   ├── AssistantPage.tsx
│   │   ├── MessagesPage.tsx
│   │   ├── FreelanceHomePage.tsx
│   │   ├── FreelancePortalPage.tsx
│   │   ├── FreelanceWalletPage.tsx
│   │   ├── WorkerProfilePage.tsx
│   │   ├── WorkerEditPage.tsx
│   │   ├── RepairRequestPage.tsx
│   │   ├── OrderWorkerPage.tsx
│   │   ├── ReviewWorkerPage.tsx
│   │   ├── JobChatPage.tsx
│   │   ├── CategoryMarketPage.tsx
│   │   ├── RentalItemPage.tsx
│   │   ├── WalletCreatePage.tsx
│   │   ├── WalletExportPage.tsx
│   │   └── AppLockPage.tsx
│   └── styles/
│       ├── global.scss
│       ├── _tokens.scss
│       └── ...
├── workers/                    # Cloudflare Worker (backend)
│   ├── wrangler.jsonc          # Worker config
│   ├── .dev.vars               # Local dev secrets
│   ├── src/
│   │   ├── index.ts            # Router + CORS + error handler
│   │   ├── lib/
│   │   │   ├── env.ts          # Env interface (all bindings + secrets)
│   │   │   ├── auth.ts         # requireUser() middleware
│   │   │   ├── session.ts      # Cookies, session IDs
│   │   │   ├── db.ts           # DB helpers (getSessionUser, etc.)
│   │   │   ├── solana.ts       # SolanaClient (all on-chain operations)
│   │   │   ├── wallet-crypto.ts # AES-256-GCM encrypt/decrypt
│   │   │   ├── passport.ts     # Passport number generation, search, units
│   │   │   ├── push.ts         # sendPushNotification (Web Push via web-push)
│   │   │   └── state-codes.ts  # Nigerian state code mapping
│   │   └── routes/
│   │       ├── auth.ts         # OTP send/verify, profile complete, me, logout
│   │       ├── wallet.ts       # Wallet get, deposit verify, withdraw
│   │       ├── users.ts        # Public user profile (/users/:id)
│   │       ├── properties-create.ts # Property creation (passport + unit + listing)
│   │       ├── properties.ts   # List/get properties
│   │       ├── passport.ts     # Search/get/units/create-unit
│   │       ├── reservations.ts # CRUD reservations
│   │       ├── escrow.ts       # Escrow lifecycle endpoints
│   │       ├── admin.ts        # Admin stats, reports, escrow release
│   │       ├── payments.ts     # Paystack init, webhook, banks, resolve
│   │       ├── phone.ts        # Phone OTP send/verify
│   │       ├── notifications.ts # List notifications
│   │       ├── kyc.ts          # KYC start, webhook, mock
│   │       ├── reports.ts      # Fraud reports
│   │       ├── services.ts     # List/book services
│   │       ├── rewards.ts      # Get rewards
│   │       └── ai.ts           # AI chat
│   └── migrations/
│       ├── 0001_initial.sql           # Core tables
│       ├── 0002_seed_properties.sql   # Seed data
│       ├── 0003_features.sql          # wallet_transactions, notifications, rewards, services, reviews
│       ├── 0004_payments_admin.sql    # paystack_transactions, kyc_sessions, admin seed
│       ├── 0005_add_ton_key.sql       # ALTER TABLE users ADD ton_encrypted_key
│       ├── 0006_withdrawal_requests.sql # withdrawal_requests table
│       └── 0007_property_passport.sql # Extended property_passports, property_units, property_access, rebuild properties
├── solana/                     # Solana Anchor program
│   ├── Anchor.toml
│   ├── programs/
│   │   └── rentme-escrow/
│   │       ├── Cargo.toml
│   │       └── src/
│   │           └── lib.rs      # Escrow program (init, mark_done, confirm, refund)
│   └── tests/
│       └── ...                 # Jest tests
└── Superprompt/
    └── superprompt.md          # This file
```

---

## 5. Database Schema (7 migrations)

### Migration 0001 — Core Tables

**users**
- `id` TEXT PRIMARY KEY (UUIDv4)
- `email` TEXT NOT NULL UNIQUE
- `phone` TEXT
- `full_name` TEXT NOT NULL DEFAULT ''
- `avatar_url` TEXT
- `role` TEXT NOT NULL DEFAULT 'tenant' CHECK(tenant, landlord, service_provider, admin)
- `kyc_status` TEXT NOT NULL DEFAULT 'pending' CHECK(pending, in_review, verified, rejected)
- `trust_score` INTEGER NOT NULL DEFAULT 500 (0-1000)
- `trust_level` TEXT NOT NULL DEFAULT 'average' CHECK(elite, trusted, average, risk, restricted, banned)
- `occupation` TEXT, `employment_status` TEXT, `income_range` TEXT, `household_size` INTEGER
- `ton_wallet_address` TEXT (stores Solana wallet address, not TON — name is legacy)
- `email_verified` INTEGER NOT NULL DEFAULT 0
- `phone_verified` INTEGER NOT NULL DEFAULT 0
- `created_at` TEXT, `updated_at` TEXT

**wallets**
- `id` TEXT PRIMARY KEY
- `user_id` TEXT NOT NULL UNIQUE (FK users)
- `balance_ngn` REAL NOT NULL DEFAULT 0 (>= 0)
- `balance_usdt` REAL NOT NULL DEFAULT 0 (>= 0) (unused — USDC is on-chain only)
- `ton_wallet_address` TEXT (duplicate of user's Solana address, legacy name)
- `is_active` INTEGER NOT NULL DEFAULT 1
- `created_at`, `updated_at`

**property_passports** (initial schema — extended in 0007)
- `id` TEXT PRIMARY KEY
- `verification_status` TEXT NOT NULL DEFAULT 'pending'
- `ownership_verified` INTEGER NOT NULL DEFAULT 0
- `rental_history_count` INTEGER NOT NULL DEFAULT 0
- `occupancy_status` TEXT NOT NULL DEFAULT 'vacant'
- `complaint_count`, `inspection_count` INTEGER DEFAULT 0
- `trust_score`, `health_score` INTEGER NOT NULL DEFAULT 500
- `created_at`, `updated_at`

**properties** (initial — rebuilt in 0007)
- `id` TEXT PRIMARY KEY
- `property_passport_id` TEXT NOT NULL UNIQUE REFERENCES property_passports
- `landlord_id` TEXT NOT NULL REFERENCES users
- `title`, `description`, `address`, `city`, `state`
- `latitude` REAL, `longitude` REAL
- `bedrooms`, `bathrooms` INTEGER (>= 0)
- `property_type` TEXT, `amenities` TEXT DEFAULT '[]'
- `rent_amount_ngn` REAL (> 0)
- `status` TEXT DEFAULT 'draft'
- `is_verified` INTEGER DEFAULT 0
- `trust_score`, `health_score` DEFAULT 500
- `photos` TEXT DEFAULT '[]', `video_walkthrough_url`, `compound_video_url`, `street_video_url`
- `ai_risk_score` REAL DEFAULT 0
- `created_at`, `updated_at`

**reservations**
- `id` TEXT PRIMARY KEY
- `property_id` TEXT NOT NULL REFERENCES properties
- `tenant_id` TEXT NOT NULL REFERENCES users
- `deposit_amount_ngn` REAL NOT NULL (default 50,000 — paid upfront)
- `status` TEXT NOT NULL DEFAULT 'pending_landlord'
  - `pending_landlord` — user paid 50k deposit, awaiting landlord response
  - `inspecting` — landlord accepted, 24h countdown for user to inspect
  - `expired_inspection` — 24h window expired, user can extend (5k) or cancel
  - `extend_pending` — user paid 5k extension fee, landlord decides
  - `occupied` — pay balance completed, active rental with countdown to end
  - `cancelled` — cancelled, deposit refunded
  - `rejected` — landlord rejected, deposit refunded
- `inspection_deadline` TEXT (ISO date, set when status → inspecting)
- `escrow_contract_address` TEXT, `escrow_tx_hash` TEXT
- `rental_start`, `rental_end` TEXT (set when status → occupied)
- `created_at`, `updated_at`

**fraud_reports**
- `id` TEXT PRIMARY KEY
- `reporter_id` TEXT NOT NULL REFERENCES users
- `target_type` TEXT, `target_id` TEXT
- `reason` TEXT, `details` TEXT
- `status` TEXT NOT NULL DEFAULT 'open'
- `created_at`, `resolved_at`

**sessions**
- `id` TEXT PRIMARY KEY
- `user_id` TEXT NOT NULL REFERENCES users (CASCADE)
- `expires_at` TEXT NOT NULL
- `created_at` TEXT
- Index: `idx_sessions_user` on `user_id`

### Migration 0002 — Seed Properties

Seeds 3 verified properties (Lekki, Yaba, Abuja) with landlords and passport records. Pure dev/test data.

### Migration 0003 — Features

**wallet_transactions**
- `id` TEXT PRIMARY KEY
- `wallet_id` TEXT NOT NULL REFERENCES wallets
- `type` TEXT NOT NULL (e.g. 'usdc_deposit', 'usdc_withdraw')
- `amount_ngn` REAL NOT NULL (positive for deposits, negative for withdrawals)
- `reference` TEXT (Solana tx sig or deposit reference)
- `status` TEXT DEFAULT 'completed'
- `created_at` TEXT

**notifications**
- `id` TEXT PRIMARY KEY
- `user_id` TEXT NOT NULL REFERENCES users
- `title` TEXT NOT NULL
- `body` TEXT NOT NULL
- `type` TEXT DEFAULT 'info'
- `read` INTEGER DEFAULT 0
- `created_at` TEXT

**reward_balances**
- `user_id` TEXT PRIMARY KEY
- `total_points` INTEGER DEFAULT 0
- `updated_at` TEXT

**reward_transactions**
- `id` TEXT PRIMARY KEY
- `user_id` TEXT REFERENCES users
- `points` INTEGER, `reason` TEXT
- `created_at` TEXT

**service_providers**
- `id` TEXT PRIMARY KEY
- `user_id` TEXT NOT NULL UNIQUE REFERENCES users
- `categories` TEXT DEFAULT '[]' (JSON array)
- `bio` TEXT, `rating` REAL DEFAULT 0
- `completed_jobs` INTEGER DEFAULT 0
- `is_verified` INTEGER DEFAULT 0
- `created_at` TEXT

**service_bookings**
- `id` TEXT PRIMARY KEY
- `customer_id` TEXT REFERENCES users
- `provider_id` TEXT REFERENCES service_providers
- `category` TEXT, `total_amount_ngn` REAL
- `upfront_amount_ngn` REAL
- `status` TEXT DEFAULT 'pending'
- `scheduled_at` TEXT, `created_at` TEXT

**reviews**
- `id` TEXT PRIMARY KEY
- `reviewer_id`, `reviewee_id` TEXT REFERENCES users
- `property_id` TEXT REFERENCES properties
- `rating` INTEGER (1-5), `comment` TEXT
- `created_at` TEXT

Also seeds 2 demo service providers (cleaner + plumber).

### Migration 0004 — Payments & Admin

**paystack_transactions**
- `id` TEXT PRIMARY KEY
- `user_id` TEXT NOT NULL REFERENCES users
- `reference` TEXT NOT NULL UNIQUE
- `amount_ngn` REAL NOT NULL
- `status` TEXT DEFAULT 'pending'
- `created_at` TEXT

**kyc_sessions**
- `id` TEXT PRIMARY KEY
- `user_id` TEXT NOT NULL REFERENCES users
- `provider` TEXT DEFAULT 'youverify'
- `session_id` TEXT, `status` TEXT DEFAULT 'pending'
- `created_at`, `completed_at` TEXT

Also seeds admin user (admin@rentme.dev) with wallet.

### Migration 0005 — Add Encrypted Key

`ALTER TABLE users ADD COLUMN ton_encrypted_key TEXT` — stores the AES-256-GCM encrypted Solana keypair. Name is legacy.

### Migration 0006 — Withdrawal Requests

**withdrawal_requests**
- `id` TEXT PRIMARY KEY
- `user_id` TEXT NOT NULL (FK users)
- `amount` INTEGER NOT NULL
- `bank_name` TEXT NOT NULL
- `account_number` TEXT NOT NULL
- `account_name` TEXT NOT NULL
- `status` TEXT NOT NULL DEFAULT 'pending'
- `created_at`, `updated_at` TEXT

### Migration 0007 — Property Passport System

Adds columns to `property_passports`:
- `passport_number` TEXT (e.g. `RM-LAG-000001`), UNIQUE index
- `country` TEXT NOT NULL DEFAULT 'Nigeria'
- `state_code` TEXT (e.g. 'LAG', 'ABJ')
- `area` TEXT, `street` TEXT, `house_number` TEXT, `building_name` TEXT
- `property_type` TEXT, `total_units` INTEGER DEFAULT 1
- `state` TEXT, `city` TEXT
- `latitude` REAL, `longitude` REAL

New tables:

**property_units**
- `id` TEXT PRIMARY KEY
- `property_passport_id` TEXT NOT NULL REFERENCES property_passports
- `unit_identifier` TEXT NOT NULL (e.g. "Flat 2A", "Main Unit")
- `unit_type` TEXT DEFAULT 'self_contain'
- `created_at` TEXT
- Index on `property_passport_id`

**property_access**
- `id` TEXT PRIMARY KEY
- `property_passport_id` TEXT REFERENCES property_passports
- `user_id` TEXT REFERENCES users
- `role` TEXT CHECK(owner, property_manager, caretaker)
- `status` TEXT DEFAULT 'active'
- `assigned_at`, `revoked_at` TEXT
- Indexes on passport_id and user_id

The `properties` table is rebuilt: drops UNIQUE on `property_passport_id`, adds `property_unit_id` column.

---

## 6. Backend API Routes (Worker)

### Authentication

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| POST | `/auth/otp/send` | handleSendOtp | No | Send email OTP (6-digit). Dev code `111111`. |
| POST | `/auth/otp/verify` | handleVerifyOtp | No | Verify OTP, create session cookie, create wallet record. |
| GET | `/auth/me` | handleMe | Cookie | Return current user or null. |
| POST | `/auth/logout` | handleLogout | Cookie | Clear session. |
| POST | `/auth/profile/complete` | handleCompleteProfile | Cookie | Set full_name + phone, create Solana wallet (setupUserWallet), fire welcome notification. |
| POST | `/auth/phone/send` | handleSendPhoneOtp | Cookie | Send SMS OTP via Termii. |
| POST | `/auth/phone/verify` | handleVerifyPhoneOtp | Cookie | Verify phone OTP. |

### Properties

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/properties` | handleListProperties | Cookie | List all properties (with optional filters). |
| POST | `/properties` | handleCreateProperty | Cookie | Create passport + unit + listing in one flow. |
| GET | `/properties/:id` | handleGetProperty | Cookie | Get single property detail. |

### Passports

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/passports/search?street=&city=&state=` | handleSearchPassports | Cookie | Search existing passports by address. |
| GET | `/passports/:id` | handleGetPassport | Cookie | Get passport by ID. |
| GET | `/passports/:id/units` | handleGetPassportUnits | Cookie | List units for a passport. |
| POST | `/passports/:id/units` | handleCreateUnit | Cookie | Create a new unit under passport. |

### Wallet & Payments

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/wallet` | handleWalletGet | Cookie | Get balance + last 50 transactions. |
| POST | `/wallet/create` | handleWalletCreate | Cookie | Store encrypted wallet shares in KV (recovery). |
| GET | `/wallet/recover` | handleWalletRecover | Cookie | Retrieve wallet shares from KV. |
| POST | `/wallet/deposit/usdc` | handleUsdcDeposit | Cookie | Initiate USDC deposit — returns user's wallet address + amount + token mint. |
| POST | `/wallet/deposit/usdc/verify` | handleUsdcDepositVerify | Cookie | Verify on-chain balance increase, credit NGN. KV-based idempotency. |
| POST | `/wallet/withdraw/usdc` | handleUsdcWithdraw | Cookie | Admin sends USDC to user, deduct NGN balance. |
| POST | `/wallet/withdraw/naira` | handleNairaWithdraw | Cookie | Create bank withdrawal request (pending). |
| POST | `/payments/paystack/init` | handlePaystackInit | Cookie | Initiate Paystack Naira deposit. |
| POST | `/payments/paystack/webhook` | handlePaystackWebhook | No | Paystack webhook handler. |
| GET | `/payments/banks` | handleListBanks | Cookie | List Nigerian banks. |
| POST | `/payments/banks/resolve` | handleResolveAccount | Cookie | Resolve account name from number + bank code. |

### Reservations

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| POST | `/reservations` | handleCreateReservation | Cookie | Create reservation (deposit_amount_ngn set to env RESERVATION_DEPOSIT). Returns reservationId. |
| GET | `/reservations` | handleListReservations | Cookie | List user's reservations (runs autoCancelExpired first). |
| GET | `/reservations/landlord` | handleListLandlordReservations | Cookie | List reservations on landlord's properties. |
| GET | `/reservations/by-property?propertyId=` | handleGetReservationByProperty | Cookie | Get user's active reservation for a property. |
| PUT | `/reservations/:id/pay` | handlePayReservation | Cookie | Create Solana escrow contract for deposit. Called immediately after createReservation. |
| PUT | `/reservations/:id/approve` | handleApproveReservation | Cookie | Landlord accepts → status → `inspecting`, 24h deadline, property → `inspecting`. |
| PUT | `/reservations/:id/reject` | handleRejectReservation | Cookie | Landlord rejects → refund escrow, status → `rejected`, property → `available`. |
| PUT | `/reservations/:id/cancel` | handleCancelReservation | Cookie | Tenant cancels (in pending_landlord or expired_inspection) → refund escrow, status → cancelled. |
| PUT | `/reservations/:id/back-out` | handleBackOut | Cookie | Tenant backs out during inspecting → refund escrow, status → cancelled. |
| PUT | `/reservations/:id/pay-balance` | handlePayBalance | Cookie | Tenant pays remaining rent + 5% fee, releases escrow deposit to landlord+fee collector, status → `occupied`, sets rental_end (+30d). |
| PUT | `/reservations/:id/extend` | handleExtendInspection | Cookie | In expired_inspection: tenant pays 5k extension fee (direct to landlord, non-refundable), status → `extend_pending`. |
| PUT | `/reservations/:id/extend/approve` | handleApproveExtension | Cookie | Landlord approves extension → status → `inspecting` with new 24h deadline. |
| PUT | `/reservations/:id/extend/reject` | handleRejectExtension | Cookie | Landlord rejects extension → refund escrow, status → cancelled, 5k stays with landlord. |
| PUT | `/reservations/landlord/unreserve/:propertyId` | handleLandlordUnreserve | Cookie | Landlord cancels a pending/inspecting reservation. |

### Escrow (Solana)

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| POST | `/escrow/:address/deposit` | handleDepositToEscrow | Cookie | Init escrow on-chain, transfer USDC in. |
| POST | `/escrow/:address/mark-done` | handleMarkDone | Cookie | Worker marks job complete (signs on-chain). |
| POST | `/escrow/:address/confirm` | handleConfirmCompletion | Cookie | Tenant confirms (signs on-chain), fee split, release funds. |
| POST | `/escrow/:address/refund` | handleRequestRefund | Cookie | Refund escrow to tenant (worker signs). |
| POST | `/escrow/:address/ping` | handlePingTimeout | Cookie | Check timeout, auto-refund if past deadline. |
| GET | `/escrow/:address` | handleGetEscrowState | Cookie | Read escrow account state from chain. |

### Admin

| Method | Path | Handler | Auth+Role | Description |
|--------|------|---------|-----------|-------------|
| GET | `/admin/stats` | handleAdminStats | Cookie+Admin | Dashboard stats. |
| GET | `/admin/reports` | handleAdminReports | Cookie+Admin | List fraud reports. |
| POST | `/admin/reports/resolve` | handleAdminResolveReport | Cookie+Admin | Resolve/dismiss report. |
| POST | `/admin/escrow/release` | handleAdminReleaseEscrow | Cookie+Admin | Admin force-release escrow funds. |

### Other

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/notifications` | handleListNotifications | Cookie | List user notifications. |
| PATCH | `/notifications/:id` | handleMarkNotificationRead | Cookie | Mark a notification as read. |
| GET | `/notifications/unread-count` | handleUnreadCount | Cookie | Return `{ count }` of unread notifications. |
| POST | `/push/subscribe` | handlePushSubscribe | Cookie | Save Web Push subscription for sending push notifications. |
| GET | `/users/:id` | handleGetUserProfile | No | Public read-only user profile (no auth required). |
| GET | `/services` | handleListServices | No | List service providers. |
| POST | `/services/book` | handleBookService | Cookie | Book a service. |
| GET | `/rewards` | handleGetRewards | Cookie | Get reward points and history. |
| POST | `/fraud-reports` | handleCreateReport | Cookie | Submit fraud report. |
| POST | `/kyc/start` | handleStartKyc | Cookie | Start KYC session. |
| POST | `/kyc/webhook` | handleKycWebhook | No | KYC provider webhook. |
| POST | `/kyc/complete-mock` | handleMockKycComplete | Cookie | Mock KYC (dev only). |
| POST | `/ai/chat` | handleAiChat | Cookie | AI assistant chat. |
| POST | `/phone/send` | handleSendPhoneOtp | Cookie | Send phone OTP. |
| POST | `/phone/verify` | handleVerifyPhoneOtp | Cookie | Verify phone OTP. |
| GET | `/health` | — | No | Health check. |

### Auth Flow (Detailed)

1. User enters email → `POST /auth/otp/send` → sends 6-digit code via Resend. Dev: code `111111`.
2. User enters code → `POST /auth/otp/verify`:
   - Looks up user by email, creates if not exists.
   - Creates session (30-day TTL), sets `rentme_session` HttpOnly cookie.
   - Returns user with `profileComplete` flag.
3. If not profile complete → user redirected to `/profile/setup` → `POST /auth/profile/complete`:
   - Updates `full_name` + `phone` on users table.
   - Calls `setupUserWallet()`: generates Solana keypair (via `Keypair.generate()`), encrypts with AES-256-GCM using per-user key, stores in `ton_encrypted_key` + `ton_wallet_address`.
   - Creates wallets record with `balance_ngn = 0`.
   - Fires welcome notification (natural prose, no dashes/emoji).
   - Returns `profileComplete: true`.
4. Session read via cookie on every request (`requireUser` middleware).

### Environment Variables (workers/src/lib/env.ts)

```typescript
interface Env {
  DB: D1Database;           // Cloudflare D1 binding
  KV: KVNamespace;          // Cloudflare KV binding
  ENVIRONMENT: string;      // 'production' | 'development'
  ALLOWED_ORIGIN?: string;  // CORS origin

  // Business config (parsed as needed)
  RESERVATION_DEPOSIT?: string;   // default "500000" (NGN)
  INSPECTION_HOURS?: string;     // default "48"
  FEE_BPS?: string;              // default "250" (2.5%)
  INITIAL_WALLET_BALANCE?: string; // default "0"
  DEFAULT_TRUST_SCORE?: string;  // default "500"

  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  TERMII_API_KEY?: string;
  TERMII_SENDER_ID?: string;
  PAYSTACK_SECRET_KEY?: string;
  KYC_API_KEY?: string;
  KYC_PARTNER_ID?: string;
  KYC_WEBHOOK_SECRET?: string;
  OPENAI_API_KEY?: string;
  WALLET_ENCRYPTION_KEY?: string;   // 64 hex chars (32 bytes)
  SOLANA_RPC_URL?: string;          // Alchemy devnet
  SOLANA_ESCROW_PROGRAM_ID?: string; // "GCNQKEZyJVa3qUMJSNv7o8C48GuHcvBbaYscer4ccEk"
  SOLANA_ADMIN_SECRET?: string;      // base64-encoded keypair
  TOKEN_MINT_ADDRESS?: string;      // USDC devnet mint
  FEE_COLLECTOR_ADDRESS?: string;   // Solana address for platform fees
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_EMAIL?: string;
  EXTENSION_FEE?: string;        // default "5000"
  PLATFORM_FEE_PCT?: string;      // default "5"
}
```

---

## 7. Solana Escrow Program

### Program ID (devnet): `GCNQKEZyJVa3qUMJSNv7o8C48GuHcvBbaYscer4ccEk`

### Account Structure

```rust
pub struct Escrow {
    pub tenant: Pubkey,
    pub worker: Pubkey,
    pub owner: Pubkey,         // admin (always admin_keypair.publicKey)
    pub nonce: u64,
    pub fee_bps: u16,          // fee rate in basis points (e.g. 250 = 2.5%)
    pub commitment_amount: u64, // full listing price
    pub fee_collector: Pubkey,
    pub escrow_token_account: Pubkey,
    pub amount: u64,           // initial deposit amount (reference only)
    pub is_active: bool,
    pub worker_done: bool,
    pub created_at: i64,
    pub bump: u8,
}
```

### PDA Seeds

`["escrow", owner_pubkey, nonce_le_bytes]` — owner is always admin's pubkey.

### Instructions

**init_escrow(tenant, worker, nonce, fee_bps, commitment_amount, fee_collector, escrow_token_account, amount)**
- Creates new Escrow account via PDA.
- Accounts: [escrow (init, payer=owner), owner (signer), system_program].
- Owner signs, admin pays gas via `sendAsAdmin`.

**mark_done()**
- Sets `worker_done = true`.
- Accounts: [escrow (mut), worker (signer)].
- Worker signs, admin pays gas via `sendAsFeePayer`.

**confirm()**
- Reads live `escrow_token_account.amount` (actual token balance).
- Calculates fee: `fee = commitment_amount * fee_bps / 10000`. Worker gets `total - fee`.
- Transfers worker portion → worker_token_account, fee → fee_token_account.
- Sets `is_active = false`.
- Accounts: [escrow (mut), tenant (signer), worker_token_account, fee_token_account, escrow_token_account, token_program].
- Tenant signs, admin pays gas via `sendAsFeePayer`.

**refund()**
- Transfers entire `escrow_token_account.amount` (live balance) → tenant_token_account.
- Sets `is_active = false`.
- Accounts: [escrow (mut), worker (signer), tenant_token_account, escrow_token_account, token_program].
- Worker signs (has to agree to refund), admin pays gas via `sendAsFeePayer`.

### Error Codes

- NotActive — escrow not active
- NotWorker — only worker can call
- NotTenant — only tenant can call
- AlreadyMarkedDone — mark_done already called
- WorkerNotDone — confirm before mark_done

### SolanaClient Class (workers/src/lib/solana.ts)

Key methods:
- `SolanaClient(env)` — constructor, reads env vars for RPC, program ID, admin keypair, token mint
- `escrowPda(owner, nonce)` — derive PDA
- `getEscrowState(escrowAddr)` — manual deserialization of Escrow account data
- `sendAsAdmin(tx)` — admin signs + pays gas
- `sendAsFeePayer(tx, userSigner)` — admin pays gas, user signs
- `initEscrow(tenant, worker, nonce, feeBps, commitmentAmount, feeCollector, escrowTokenAccount, amount)`
- `markDone(escrowAddr, workerKeypair)`
- `confirm(escrowAddr, tenantKeypair, workerTokenAccount, feeTokenAccount, escrowTokenAccount)`
- `refund(escrowAddr, workerKeypair, tenantTokenAccount, escrowTokenAccount)`
- `getOrCreateTokenAccount(owner)` — create/find ATA
- `getTokenBalance(owner)` — get USDC balance for user
- `tryGetTokenBalance(owner)` — safe version returning `{ balance, error? }`
- `createAta(owner)` — create ATA
- `transferUsdc(to, rawAmount)` — admin sends USDC to a user

### Key On-Chain Addresses (Devnet)

| Entity | Address |
|--------|---------|
| Escrow Program | `GCNQKEZyJVa3qUMJSNv7o8C48GuHcvBbaYscer4ccEk` |
| USDC Mint | `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` |
| Admin Wallet | `4c7XzHZ1Pu2JER8ffn8agVCsHfBrz5CR847ZMGGCzKXj` |
| Test User Wallet | `FAh1nj2cwr3ox7uit3zQxfkWvnkzgUuSx2LhWPBFkQ7R` |

---

## 8. Frontend Pages

### Routing Structure

```
/                               → WelcomeScreen (unauthenticated splash)
/auth                           → AuthEmailPage
/auth/verify                    → VerifyPage (OTP input)
/app-lock                       → AppLockPage
All below wrapped in AppShell (tab bar) + ProtectedRoute:
/markets                        → MarketsPage (home, rental listings grid)
/markets/category/:slug         → CategoryMarketPage
/rental/:id                     → RentalItemPage
/property/:id                   → PropertyPage
/portal                         → PortalPage (tenant portal)
/wallet                         → WalletPage (balance + transactions)
/wallet/deposit                 → WalletDepositPage (USDC + Paystack)
/wallet/withdraw                → WalletWithdrawPage (USDC + Naira bank)
/wallet/pay                     → WalletPayPage (pending payments for reservations)
/wallet/pay-hire                → PayHirePage (pending hire payments)
/hire                           → HirePage (hire professionals)
/reserve/:id                    → ReservePage (full reservation lifecycle)
/profile                        → ProfilePage (public read-only user profile at /users/:id)
/profile/setup                  → ProfileSetupPage (after signup)
/users/:id                      → UserProfilePage (public profile view — no auth gate)
/wallet/setup                   → WalletCreatePage
/wallet/export                  → WalletExportPage
/notifications                  → NotificationsPage
/kyc                            → KycPage
/trust                          → TrustPage
/rental-history                 → RentalHistoryPage
/list-property                  → ListPropertyPage (3-step form)
/rewards                        → RewardsPage
/settings                       → SettingsPage
/help                           → HelpPage
/admin                          → AdminPage
/assistant                      → AssistantPage (AI chat)
/messages                       → MessagesPage (client-side only)
/freelance/home                 → FreelanceHomePage
/freelance/portal               → FreelancePortalPage
/freelance/wallet               → FreelanceWalletPage
/freelance/edit-profile         → WorkerEditPage
/worker/:id                     → WorkerProfilePage
/worker/:id/order               → OrderWorkerPage
/worker/:id/review              → ReviewWorkerPage
/chat/:threadId                 → JobChatPage
/repair-request                 → RepairRequestPage
```

### Key Page Behaviors

**SubPageHeader** (reusable component, `src/components/SubPageHeader.tsx`):
- iOS-style back button: `< ChevronLeft + prevTitle` in `#007aff` blue, 17px 500 weight
- Uses `navigate(-1)` with fallback to `backHref` prop when no history
- Props: `title` (heading), `subtitle?`, `prevTitle?` (default "Back"), `backHref?`

**WalletPage**:
- Fetches real data from `GET /wallet`
- Supports pagination: Load More button fetches next 20 items via `?offset=` param. Fetches wallet_transactions, reservations, and booking payments with same offset.
- Shows balance_ngn, list of transactions
- Expandable transaction cards (tap to expand/collapse with details: reference, date, time, amount, status)
- Receipt download button in expanded section — calls `downloadReceiptImage()` from `src/lib/receipt.ts`

**ReservePage** (full reservation lifecycle):
- **No reservation**: Shows property info + "Reserve with ₦50,000" button. Clicking chains: `createReservation` → `payReservation` (creates Solana escrow) → `depositToEscrow` (deposits 50k USDC). Shows tx hash link to Solscan.
- **pending_landlord**: "Awaiting Landlord" — 50k is in escrow, landlord will review. Cancel & refund button (refunds escrow).
- **inspecting**: Property card with photo + map deep link (`geo://` on Android, `maps://` on iOS, Google Maps fallback) + 24h countdown timer (red when < 1h). Two actions: **Pay Balance** (remaining rent + 5% platform fee) or **Back Out** (refund deposit, cancel).
- **expired_inspection**: "Inspection Expired" — two choices: **Extend 24h for ₦5,000** (non-refundable, sent directly to landlord, landlord notified to accept/reject) or **Cancel & refund**.
- **extend_pending**: "Extension Pending" — waiting for landlord to approve/reject the extension.
- **occupied**: "Active Rental" — shows countdown to rental_end (30 days from pay balance). "Go to Portal" button.
- **cancelled / rejected**: Show appropriate status message with navigation back to markets.

**CategoryMarketPage** (dynamic `/markets/category/:slug`):
- Fetches properties filtered by `CATEGORY_PROPERTY_TYPES[slug]`
- Rejection badge: also fetches user's `getMyReservations()`, builds a set of landlord IDs that rejected the user. Properties by those landlords show a "Previously rejected" badge (informational/aesthetic only — user can still request).
- Location picker, price filters, category-specific filter UI
- Renders `RentalCard` for each item

**PortalPage** (tenant/provider dashboard):
- Tabs: Renter | Provider
- RenterTab: fetches via `getReservations()`. Splits into Active Rentals (`pending_landlord`, `inspecting`, `expired_inspection`, `extend_pending`, `occupied`) and Rental History (`cancelled`, `rejected`). Active cards link to ReservePage for inspection/reservation states, or PropertyPage for occupied. Bell icon with unread notification count via `useUnreadCount` hook.
- ProviderTab: fetches properties + landlord reservations. Shows incoming requests with tenant name (clickable → navigates to `/users/:id`), accept/reject with iOS ActionSheet confirmation, property management (delete, unreserve). Bell icon for notifications (unread count badge).
- Quick actions: Rent something new, Request repair, Messages

**WalletDepositPage**:
- Two tabs: Naira (Paystack) | USDC (Solana)
- Naira: calls `POST /payments/paystack/init`, opens Paystack popup
- USDC: shows user's wallet address + amount + token mint. User sends USDC externally, clicks "I've sent it", frontend polls `POST /wallet/deposit/usdc/verify` (30 retries × 3s).
- On verified: success modal — centered dialog with green checkmark, blur backdrop, spring animation
- Uses sessionStorage for persistence

**WalletWithdrawPage**:
- Two tabs: Naira (bank withdrawal) | USDC (admin sends USDC)
- Naira: form with bank name, account number, account name. Resolves via `/payments/banks/resolve`. Creates withdrawal request.
- USDC: enter NGN amount, backend converts at 1500 rate, admin sends USDC, deducts NGN.

**ListPropertyPage**:
- 3-step flow:
  1. Address form (street, house number, city, state, area, building name)
  2. Passport search — calls `GET /passports/search` with address fields. Shows existing passports or "Create New Passport" option. If passport exists, shows unit picker (existing units + "Add New Unit").
  3. Listing details (title, description, rent amount, bedrooms, bathrooms, property type, amenities)
- State picker: custom iOS-style picker (replaced native `<select>`) — scrollable list with checkmark on selected

**HirePage**:
- Step 1: Category selection (cleaning, plumbing, repairs, moving)
- Step 2: Gender selection — Male/Female pills with 👨/👩 icons
- Step 3: Workers view
- Empty state: "Nothing to see here for now. We're onboarding X professionals. Check back later." (no em-dash)
- Back button: iOS-style chevron + "Back" label

**MessagesPage**:
- Client-side only (localStorage). No backend.
- Two tabs: Landlord | Support
- Landlord tab: empty state "No messages yet. Send a message to a landlord from a property listing."
- Support tab: welcome message from RentMe Support

**NotificationsPage**:
- Lists notifications from `GET /notifications`
- iOS-style: preview truncates 2 lines, tap expands/collapses
- Tap a notification → marks it read via `PATCH /notifications/:id` → refetches unread count via `useUnreadCount().refetch()`
- Unread badge on PortalPage bell updates immediately

**UserProfilePage** (public, no auth):
- Route: `/users/:id`
- Public read-only profile: avatar, full name, trust score/level, rental history (occupied/completed reservations only)
- No authentication required — landlords/anyone can view a user's profile
- No incoming requests section, no edit capability

**ActionSheet** (`src/components/ui/ActionSheet.tsx`):
- iOS-style bottom action sheet with title, description, and selectable options
- Supports `destructive` variant (red text, e.g. for reject/delete)
- Dark backdrop overlay, tap outside to dismiss
- Used in ProviderTab for Accept/Reject confirmation

**useUnreadCount** (`src/hooks/useUnreadCount.ts`):
- Returns `{ count, refetch }` 
- Polls `GET /notifications/unread-count` every 10 seconds
- `refetch()` called immediately when a notification is marked read — badge drops without waiting for next poll
- Used by PortalPage bell badge

**PropertyPage** (detail):
- Uses SubPageHeader with `< Markets` back button
- `navigate(-1)` fallback to `/markets`

**PayHirePage**:
- Reads job threads from `localStorage.rentme_job_threads`
- Shows working + history sections
- Expandable cards with image receipt download (via `downloadReceiptImage`)
- Uses SubPageHeader with `< Wallet` back button

**ProfilePage**:
- Avatar reads from `localStorage.rentme_profile_extras` (avatar URL)

### API Client (src/lib/api/client.ts)

All API functions use `apiFetch<T>(path, options)` which:
- Prepends `VITE_API_URL` (default `/api`)
- 8-second timeout via AbortController
- Sends credentials via `credentials: "include"`
- Returns `{ data?: T, error?: string, status: number, retryAfter?: number }`
- Key functions: `sendOtp`, `verifyOtp`, `completeProfile`, `getMe`, `logout`, `getWallet` (supports `?offset=`), `getReservations`, `searchPassports`, `getPassportUnits`, `createPassportUnit`, `createProperty`, `getProperty`, `createReservation`, `payReservation`, `depositToEscrow`, `cancelReservation`, `backOutReservation`, `payBalance`, `extendInspection`, `approveExtension`, `rejectExtension`, `initiateUsdcDeposit`, `verifyUsdcDeposit`, `withdrawUsdc`, `withdrawNaira`, `getNotifications`, `markNotificationRead`, `getUnreadCount`, `getServices`, `bookService`, `getRewards`, `listBanks`, `resolveAccount`, `initPaystack`, `getUsers`, `getUserProfile`, `adminStats`, `adminReports`, `adminResolveReport`, `aiChat`, `sendPhoneOtp`, `verifyPhoneOtp`, `startKyc`, `completeKycMock`, `submitReport`
- `getMe()`, `getNotifications()`, `getRewards()`, `adminStats()`, `adminReports()` check `hasClientSession()` first — return empty data if no cookie

---

## 9. Authentication & Session Flow

### Cookie-based auth
- Session is stored server-side in D1 `sessions` table
- Cookie `rentme_session` (HttpOnly, SameSite, 30-day TTL)
- Production: `SameSite=None; Secure` (cross-origin to Cloudflare Pages)
- Local dev: `SameSite=Lax`
- `requireUser(request, db)` middleware: parses cookie, looks up session in DB, returns `SessionUser` object or 401 Response

### SessionUser shape
```typescript
interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  kycStatus: string;
  trustScore: number;
  trustLevel: string;
  profileComplete: boolean;
}
```

### Frontend guard
- `ProtectedRoute.tsx`: checks `hasClientSession()` (reads cookie via `document.cookie`), redirects to `/auth` if missing
- If profile not complete, redirects to `/profile/setup`
- Setup pages (`/profile/setup`, `/wallet/setup`, `/wallet/export`) redirect to `/markets` if profile already complete

---

## 10. Wallet & Payment System

### Wallet Creation
- Occurs at `POST /auth/profile/complete` via `setupUserWallet()`:
  1. Generates Solana `Keypair.generate()`
  2. Encrypts secret key with AES-256-GCM using `WALLET_ENCRYPTION_KEY`
  3. Per-user key: `HMAC-SHA256(WALLET_ENCRYPTION_KEY, user_email)`
  4. Stores `ton_encrypted_key` (base64 encoded: version(1) + iv(12) + tag(16) + ciphertext) and `ton_wallet_address` on users table
  5. Creates wallets record with `balance_ngn = 0`

### USDC Deposit Flow
1. Frontend: `POST /wallet/deposit/usdc` with `{ amount }`
2. Backend: returns `{ walletAddress, amount, tokenMint }`
3. User sends USDC to their wallet address from external wallet (MetaMask, Phantom, etc.)
4. User clicks "I've sent it" button
5. Frontend loops: `POST /wallet/deposit/usdc/verify` — 30 retries × 3s
6. Backend verify: checks on-chain USDC balance via `solana.tryGetTokenBalance()`
7. Tracks credited state via KV key `usdc_credited:{userId}` (stores raw token balance)
8. KV key `usdc_deposit:{userId}` stores `{ amount, preBalance }` for pending deposits
9. Credits NGN at rate 1500 NGN/USDC. Writes wallet_transactions record.
10. Fallback: if no pending KV found, credits increase since last credited balance

### USDC Withdrawal Flow
1. Frontend: `POST /wallet/withdraw/usdc` with `{ amount }` (in NGN)
2. Backend: converts NGN → USDC at 1500 rate, calls `solana.transferUsdc(userPubkey, rawAmount)`
3. Deducts NGN from wallet, creates wallet_transactions record with tx sig as reference
4. Returns tx signature + updated NGN balance

### Naira Withdrawal Flow
1. Frontend: enters bank name, account number, account name. Resolves via `/payments/banks/resolve`.
2. Submits via `POST /wallet/withdraw/naira`
3. Backend: deducts NGN from wallet, inserts withdrawal_requests record with status 'pending'
4. Admin processes pending requests manually

### Paystack Deposit (Naira)
1. Frontend: calls `POST /payments/paystack/init` with amount
2. Backend: creates Paystack transaction, returns authorization URL
3. Frontend opens Paystack popup
4. Paystack sends webhook to `POST /payments/paystack/webhook`
5. Backend: credits NGN balance on successful payment

---

## 11. Push Notifications

### Infrastructure
- Web Push API with VAPID keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` env vars)
- `POST /push/subscribe` — saves Web Push subscription (endpoint + keys) to DB `push_subscriptions` table
- `workers/src/lib/push.ts` — `sendPushNotification(userId, title, body, env, deepLink?)`:
  - Queries all push subscriptions for user
  - Sends push via `web-push` library with `{ title, body, icon, data: { url } }`
  - Handles expired subscriptions (deletes from DB on 410)
- Deep links in push payload: e.g. `/reserve/{propertyId}`, `/portal?tab=provider`

### Notification Sites in Reservations
| Event | Recipient | Title | Deep Link |
|-------|-----------|-------|-----------|
| Reservation created | Landlord | "New reservation request" | `/portal?tab=provider` |
| Reservation accepted | Tenant | "Reservation accepted!" | `/reserve/{propertyId}` |
| Reservation declined | Tenant | "Reservation declined" | none |
| Reservation cancelled | Landlord | "Reservation cancelled" | none |
| Payment received | Landlord | "Payment received" | none |
| Inspection expiry reminders | Tenant | "1 hour remaining" / "30 minutes remaining" / "10 minutes remaining" | none |
| Inspection expired | Tenant | "Inspection time expired" | none |
| Extension request | Landlord | "Extension request" | none |
| Extension approved | Tenant | "Extension approved" | none |
| Extension rejected | Tenant | "Extension rejected" | none |

### Frontend
- `useUnreadCount` hook in `src/hooks/useUnreadCount.ts`:
  - Polls `GET /notifications/unread-count` every 10 seconds
  - Returns `{ count, refetch }` 
  - `refetch()` called immediately on notification read — badge drops without waiting for next poll
- Bell badge on PortalPage (both Renter and Provider tabs)
- `PATCH /notifications/:id` marks a notification as read

---

## 12. Property Passport System

### Concept
- Property Passport separates the **physical property** (building) from **listings** (rental ads).
- A passport represents a building/address. It has a unique `passport_number` like `RM-LAG-000001`.
- Format: `RM-<STATE_CODE>-<6_DIGIT_SERIAL>`. State codes in `workers/src/lib/state-codes.ts`.
- Each state has its own serial sequence (count of passports in that state + 1).
- Passports have address fields + `total_units` (apartments/flats in the building).
- `property_units` represent individual units within a building (e.g. "Flat 2A", "Main Unit").
- `property_access` links users to passports with roles (owner, property_manager, caretaker).
- Listings (`properties` table) now reference both a passport and a unit.

### Passport Search
- `GET /passports/search?street=&houseNumber=&city=&state=`
- Search by matching fields (case-insensitive). Returns up to 10 matches.

### Creation Flow (POST /properties)
1. If no `existingPassportId`: create passport with generated passport number + create first unit ("Main Unit") + create listing
2. If `existingPassportId`: validate it exists, create unit under it + create listing
3. Listing status set to `'pending_verification'`

### State Codes
```typescript
// workers/src/lib/state-codes.ts
const STATE_CODES = {
  "Federal Capital Territory": "ABJ", "Abia": "ABI", "Adamawa": "ADA",
  "Akwa Ibom": "AKW", "Anambra": "ANA", "Bauchi": "BAU", "Bayelsa": "BAY",
  "Benue": "BEN", "Borno": "BOR", "Cross River": "CRS", "Delta": "DEL",
  "Ebonyi": "EBO", "Edo": "EDO", "Ekiti": "EKT", "Enugu": "ENU",
  "Gombe": "GOM", "Imo": "IMO", "Jigawa": "JIG", "Kaduna": "KAD",
  "Kano": "KAN", "Katsina": "KAT", "Kebbi": "KEB", "Kogi": "KOG",
  "Kwara": "KWA", "Lagos": "LAG", "Nasarawa": "NAS", "Niger": "NIG",
  "Ogun": "OGN", "Ondo": "OND", "Osun": "OSU", "Oyo": "OYO",
  "Plateau": "PLA", "Rivers": "RIV", "Sokoto": "SOK", "Taraba": "TAR",
  "Yobe": "YOB", "Zamfara": "ZAM"
};
```

---

## 13. Design System / iOS Theme

### ThemeProvider
- Default mode: `light` (changed from `dark` in `readInitialMode()`)
- Toggle: user switches in Settings page
- Applied via `document.documentElement.dataset.theme = mode` and `colorScheme`
- Stored in `localStorage.rentme_theme`

### Visual Style (iOS-native)
- Font: system-ui, sans-serif throughout
- Back button: `#007aff` blue, 17px 500 weight, chevron icon
- Headings: 28px 700 weight, -0.3px letter-spacing
- Subtitle: 15px, ink-soft color
- Cards: rounded corners, subtle shadows
- Toast: slide-up from bottom, blur backdrop, auto-dismiss 4s
- Notifications: expandable previews (2-line truncate)
- Tab bar: fixed bottom navigation

### Receipt Images (`src/lib/receipt.ts`)
- Canvas API renders 600×420 PNG receipt
- No external dependencies
- Green header "RentMe", title, divider, key-value rows, "Completed" badge, "Powered by RentMe" footer
- Used by WalletPage and PayHirePage

---

## 14. Solana Escrow Program (Detailed)

### Discriminators
Program uses Anchor's standard 8-byte discriminators (SHA256 of `global:<instruction_name>`):
```
init_escrow: [70, 46, 40, 23, 6, 11, 81, 139]
mark_done:   [112, 146, 215, 90, 40, 16, 44, 149]
confirm:     [174, 1, 15, 213, 3, 190, 131, 0]
refund:      [2, 96, 183, 251, 63, 208, 46, 46]
```

### Serialization (Client-Side Deserialization)
`SolanaClient.getEscrowState()` manually deserializes account data after the 8-byte discriminator:
- 3 × Pubkey (32 bytes each) = tenant, worker, owner
- 1 × u64 (8 bytes) = nonce
- 1 × u16 (2 bytes) = fee_bps
- 1 × u64 = commitment_amount
- 2 × Pubkey = fee_collector, escrow_token_account
- 1 × u64 = amount
- 1 × bool (1 byte) = is_active
- 1 × bool = worker_done
- 1 × i64 (8 bytes) = created_at
- 1 × u8 = bump

### Fee Calculation at Confirm
```
fee = escrow.commitment_amount * escrow.fee_bps / 10000
worker_gets = total_balance_in_escrow - fee
```
Fee goes to `fee_collector` ATA. Rate is configurable per escrow via `fee_bps` set at `init_escrow`. Default 250 (2.5%).

---

## 15. Encryption (workers/src/lib/wallet-crypto.ts)

### Algorithm
AES-256-GCM with 12-byte IV, 16-byte auth tag.

### Format
`version(1 byte) + iv(12 bytes) + tag(16 bytes) + ciphertext` → base64 encoded.

### Key Derivation
```typescript
deriveKey(envKey: string, userEmail: string): Buffer {
  const serverKey = Buffer.from(envKey, "hex");
  return crypto.createHmac("sha256", serverKey).update(userEmail.toLowerCase().trim()).digest();
}
```

Server key is `WALLET_ENCRYPTION_KEY` (64 hex chars = 32 bytes from env).
Per-user key = HMAC-SHA256(server_key, normalized email).

This means: server key leak alone cannot decrypt any wallet. Attacker needs both server key + specific user email.

---

## 16. Cloudflare Worker Config

```jsonc
// workers/wrangler.jsonc
{
  "name": "rentme-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-03-01",
  "compatibility_flags": ["nodejs_compat"],
  "vars": { "ENVIRONMENT": "production" },
  "d1_databases": [{
    "binding": "DB",
    "database_name": "rentme-db",
    "database_id": "84a556a8-63eb-40c8-bdf2-8b522a75e4f5",
    "migrations_dir": "migrations"
  }],
  "kv_namespaces": [{
    "binding": "KV",
    "id": "35f6a063cab54e10998256117fea477f"
  }]
}
```

All other config (API keys, Solana secrets) stored as Cloudflare Worker secrets.

### Deployment
```bash
npm run worker:deploy        # Deploy worker
npm run db:migrate:remote    # Migrate remote D1
npm run pages:deploy         # Build + deploy frontend to Cloudflare Pages
```

---

## 17. Config Values & Constants

| Constant | Default | Env Variable |
|----------|---------|-------------|
| USDC to NGN rate | 1500 | — |
| USDC decimals | 6 | — |
| Devnet USDC mint | `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` | `TOKEN_MINT_ADDRESS` |
| Solana RPC | Alchemy devnet | `SOLANA_RPC_URL` |
| Escrow program ID | `GCNQKEZyJVa3qUMJSNv7o8C48GuHcvBbaYscer4ccEk` | `SOLANA_ESCROW_PROGRAM_ID` |
| Admin keypair | base64 in env | `SOLANA_ADMIN_SECRET` |
| Fee rate (default) | 250 bps (2.5%) | `FEE_BPS` |
| Reservation deposit | 50,000 NGN | `RESERVATION_DEPOSIT` |
| Inspection window | 24 hours (changed from 48h) | `INSPECTION_HOURS` |
| Extension fee | 5,000 NGN (non-refundable, immediate to landlord) | `EXTENSION_FEE` |
| Platform fee | 5% of remaining balance (after deposit) | `PLATFORM_FEE_PCT` |
| Initial wallet balance | 0 NGN | `INITIAL_WALLET_BALANCE` |
| Default trust score | 500 | `DEFAULT_TRUST_SCORE` |
| Session TTL | 30 days | — (hardcoded) |
| API fetch timeout | 8 seconds | — (hardcoded in client.ts) |
| Deposit verify retries | 30 × 3s | — (hardcoded in frontend) |
| Encryption version | 0x01 | — (hardcoded in wallet-crypto.ts) |

---

## 18. Notes & Caveats

- **TON references are legacy**: `ton_wallet_address`, `ton_encrypted_key` column names are from an earlier TON version. They now store Solana data. Do not rename yet — many places reference them.
- **Chat/messaging is client-side only**: Messages stored in `localStorage.rentme_chat_messages`. No backend routes. Not wired end-to-end.
- **Avatar in localStorage**: Profile avatar URL stored in `localStorage.rentme_profile_extras`. Not yet server-side upload.
- **Admin keypair was in git**: Initial commit contained `solana-admin-keypair.json`. Removed from tracking via `.gitignore`. Devnet keys only — no real value at risk.
- **History still contains keys**: Git history was NOT fully rewritten to purge the initial commit's keypair files. If cloning fresh, those files won't be checked out (gitignore), but they exist in commit history. Devnet keys only.
- **Build excludes Solana artifacts**: `solana/target` is gitignored (400MB+ of Rust build artifacts).
- **No rate limiting or session expiry hardening** yet. TODO before public launch.
- **Reservation deposit paid upfront**: The 50k NGN deposit is paid via USDC into a Solana escrow contract when the user creates the reservation, not after landlord approval. This means users need a funded Solana wallet before they can reserve.
- **Escrow refund on reject/expiry**: When landlord rejects, user cancels, or inspection expires (and user chooses cancel), the escrow is refunded via `refundEscrow()` which decrypts the tenant's keypair and calls the Solana refund instruction.
- **Extension fee is non-refundable**: The 5k extension fee is a direct USDC transfer from tenant to landlord (not escrowed). Once sent, it cannot be reversed even if the landlord rejects the extension (the 50k deposit is still refunded in that case).
- **autoCancelExpired runs on every list fetch**: Called at the start of `handleListReservations` and `handleListLandlordReservations`. Handles: expired `inspecting` → `expired_inspection`, `pending_landlord` older than 3h → `rejected` (with escrow refund). Reminder notifications fire at 60/30/10 min before inspection deadline on each fetch — duplicate risk accepted for simplicity.
