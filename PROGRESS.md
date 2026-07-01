# RentMe Progress

**Phase:** 1–2 (~76% product surface wired, needs API keys and live data wiring)  
**Stack:** Vite + React + Redux + SCSS  
**Hosting:** Cloudflare Pages + Worker + D1 + KV + Resend

## Current direction
- TON/USDT integration in progress — see `docs/ton-architecture.md` for the full design.
- Non-custodial wallets created on signup; platform signs transactions server-side.
- Platform pays all gas; users never touch Gram.
- All balances and transactions displayed in Naira. TON/USDT is the engine, Naira is the dashboard.
- Escrow contracts hold USDT Jettons, not raw TON.

## Built ✅
- Auth: Resend email OTP + Termii SMS OTP
- Paystack deposits (+ mock without key)
- KYC flow (YouVerify + dev mock complete)
- Placeholder escrow records on reservations
- OpenAI assistant (fallback without key)
- Admin panel (`/admin`, login as admin@rentme.dev)
- Wallet, reservations, services, rewards, listings, fraud reports
- Market search: Nigerian state/FCT/LGA/district picker with searchable modal UI
- Market filters: working price range, bedrooms, furnishing, condition, verified-only, and location filtering
- Settings appearance: functional iOS-style light/dark mode toggle persisted in local storage
- Portal tenant mode: landlord messaging and RentMe support messaging entry points
- Portal landlord mode: active tenants, rent, lease progress, and time-left tracking
- Messages: routeable landlord and RentMe support DM threads (`/messages?thread=landlord|support`)

## TON Integration Update — 2026-06-29

### Wired: Full Escrow Lifecycle Loop

**API routes (routes/escrow.ts):**
- `GET /escrow/{address}` — fetch escrow state from chain
- `POST /escrow/{address}/deposit` — tenant deposits USDT (JettonTransfer → their Jetton wallet → escrow)
- `POST /escrow/{address}/mark-done` — worker sends OP_MARK_DONE (0xabcd0202)
- `POST /escrow/{address}/confirm` — tenant sends OP_CONFIRM_COMPLETION (0xabcd0101)
- `POST /escrow/{address}/refund` — worker sends OP_REQUEST_REFUND (0xabcd0303)
- `POST /escrow/{address}/ping` — anyone sends OP_PING_TIMEOUT (0xabcd0606)

**DB lifecycle:** Each route updates `reservations.status` → `funded` / `worker_done` / `completed` / `refunded`. Refund also resets property to `verified`.

**ton.ts additions:**
- `getEscrowState` — parses contract data cell into JSON
- `sendFromWallet` — signs & sends from any user wallet (previously admin-only)
- `buildUserOpBody` / `buildJettonTransferBody` — helper cells
- `computeJettonWallet` — public Jetton wallet derivation
- `ensureGas` — auto-funds user wallets from admin wallet if < 0.1 TON (platform pays gas)
- `getSeqno(addr, useCache)` — no cache for user wallets

**Fixed:** `handleCreateReservation` now passes actual tenant/landlord wallet addresses to `createEscrowRecord` instead of placeholder/admin.

## TON Integration Update — 2026-06-28

### ✅ Escrow deployed to testnet
- **Address:** `EQAmR_RCOMBsKfxSoIIj4Mqric6OKEfciR_NUyHIBOrDD5kV`
- Storage split into root (3 addrs) + ref cell (everything else) to avoid 1023-bit cell overflow.
- Manual `save()`/`load()` builds 2-level cell hierarchy.
- Post-deploy `SetTrustedWallet` (op=0xabcd0909) sent successfully.
- Jetton wallet computed: `EQAZxvBqjTHI9dmiuheZsragJ3o1nBm-9tx4JT1vmQW1Ei3p`

### 🐛 Bug fixed: sendBoc "Failed to unpack Message"
- Root cause: `wallet.createTransfer()` returns only the **body** cell (signing message + signature), not a fully-formed external message. Need to wrap with `storeMessage({ info: { type: "external-in", ... }, body })` to add the `ext_in_msg_info$10` header before sending via `sendBoc`.
- Fixed in `ton.ts:sendMsg()`.

## Latest production update
- **Date:** 2026-06-22
- **Branch alias:** https://production.rentme.pages.dev
- **Latest deployment:** https://2c283332.rentme.pages.dev
- **Included:** location picker, appearance toggle, market filters, portal tenant/landlord improvements, and messages.

## API keys needed (workers/.dev.vars + wrangler secrets)
| Key | Provider |
|-----|----------|
| RESEND_API_KEY | Resend |
| TERMII_API_KEY | Termii SMS |
| PAYSTACK_SECRET_KEY | Paystack |
| KYC_API_KEY | YouVerify |
| OPENAI_API_KEY | OpenAI |
| TON_API_KEY | TON Center testnet (deferred TODO) |

## Deploy
```bash
npm run db:migrate:remote && npm run worker:deploy && npm run pages:deploy
```

Production URLs:
- App: https://rentme.pages.dev
- Production branch alias: https://production.rentme.pages.dev
- API: https://rentme-api.engineeriqbbal.workers.dev

Deployment note:
- `npm run pages:deploy` updates the root Pages app and is the default production deploy target.
- `npm run pages:deploy -- --branch production` updates only the `production.rentme.pages.dev` alias.
- Always verify `rentme.pages.dev` serves the latest built asset after deploy.

Auth note:
- Production auth crosses `pages.dev` to `workers.dev`.
- Worker cookies use `SameSite=None; Secure`.
- Frontend route guards also use a client session marker because the Worker cookie is HttpOnly and cross-site.

## Admin login
Register/login with `admin@rentme.dev` or use seeded admin after migration.
