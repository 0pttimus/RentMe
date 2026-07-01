# Memory — opencode

> Generated: 2026-06-29 01:02:55  
> Total memories: **8**  
> Breakdown: instruction: 1, decision: 4, preference: 1, event: 2

---

## Instructions

*Standing rules, constraints, and guidelines to always follow.*

### Created security.md checklist in opencode config a...

Created security.md checklist in opencode config and added it to global instructions array. opencode will now apply the security checklist (secrets, auth, input validation, infra hardening, OWASP scanning) to every project.

*Confidence: 1 | Status: active | Created: 2026-06-26T19:46:33*

---

## Facts

*Verified information, project status, and established truths.*

*No memories of this type.*

---

## Decisions

*Architectural choices, approach selections, and their rationale.*

### Wallet-on-signup flow built: on user signup, 24-wo...

Wallet-on-signup flow built: on user signup, 24-word mnemonic generated via @ton/crypto mnemonicNew, encrypted with AES-NaCl secretbox using WALLET_ENCRYPTION_KEY (32-byte hex from env), stored in users.ton_encrypted_key. Wallet address stored in both users.ton_wallet_address and wallets.ton_wallet_address. Export endpoint POST /wallet/ton/export returns mnemonic words. Platform signs all transactions server-side; users never touch Gram.

*Confidence: 1 | Status: active | Created: 2026-06-28T20:21:02*

### RentMe TON architecture: Non-custodial wallets (mn...

RentMe TON architecture: Non-custodial wallets (mnemonic on signup, encrypted with server key in DB, exportable). Platform pays all gas. Escrow holds USDT Jettons (not TON). Escrow deployed directly from admin wallet (not via Factory). SetTrustedWallet opcode (0xabcd0909) breaks circular dependency between escrow address and Jetton wallet address. Testnet USDT master: kQCDV9KOSMCkniZAuGsddFbdKExF6aOfw5tNEnY9op81CwQa. Jetton wallet code fetched from master's get_jetton_data. All balances displayed in NGN — TON/USDT is invisible to users.

*Confidence: 0.95 | Status: active | Created: 2026-06-28T20:57:55*

### Fixed EscrowStorage data cell overflow by splittin...

Fixed EscrowStorage data cell overflow by splitting into root (3 addresses + ref) + extra cell (jettonWallet?, feeCollector, amount, feeAmount, dealType, bools, createdAt, deposited) via manual save()/load(). Root max: 801 bits, extra max: 951 bits — well under 1023. Previous layout with 5 addresses in one cell exceeded 1023 bits (1068+ for addresses alone).

*Confidence: 0.95 | Status: active | Created: 2026-06-28T22:54:21*

### TON/USDT Wallet Architecture documented in docs/to...

TON/USDT Wallet Architecture documented in docs/ton-architecture.md: non-custodial wallets on signup, private keys encrypted and stored in DB, server-side signing, platform pays all gas, users see Naira only. Escrow holds USDT Jettons not raw TON. Deposit = NGN->Paystack->USDT->wallet. Withdrawal = USDT->platform->NGN->bank.

*Confidence: 1 | Status: active | Created: 2026-06-28T20:14:34*

---

## Goals

*Objectives, targets, and milestones to track progress.*

*No memories of this type.*

---

## Commitments

*Promises, obligations, and TODOs that need follow-through.*

*No memories of this type.*

---

## Preferences

*User and entity preferences for personalization.*

### RentMe coding standards: (1) No hardcoded values —...

RentMe coding standards: (1) No hardcoded values — all operational config in env vars with defaults from code. (2) External service wrappers use class-based pattern (new TonClient(env)) with all state as instance members. (3) Contract bytecode in source constants file, not env. (4) Ponytail mode: stdlib first, YAGNI, minimal abstractions. (5) Auth middleware on every authenticated route. (6) Secrets and credentials only in .env, never in code. (7) TON-specific: deployer wallet from mnemonic (env), fee collector admin address configurable, USDT Jetton master and wallet code configurable, RPC URL configurable.

*Confidence: 1 | Status: active | Created: 2026-06-28T20:57:42*

---

## Relationships

*Entity connections, team context, and collaboration patterns.*

*No memories of this type.*

---

## Context

*Session summaries, status updates, and conversation state.*

*No memories of this type.*

---

## Events

*Important conversations, milestones, and temporal occurrences.*

### Successfully deployed test escrow to testnet. Key ...

Successfully deployed test escrow to testnet. Key discovery: @ton/ton createTransfer returns just the body cell, not a full message. Must wrap with storeMessage({info:{type:"external-in",dest,dest,src:null,importFee:0n},body}) before sendBoc. Escrow address: EQAmR_RCOMBsKfxSoIIj4Mqric6OKEfciR_NUyHIBOrDD5kV

*Confidence: 1 | Status: active | Created: 2026-06-28T23:06:46*

### Wired full escrow lifecycle loop: routes/escrow.ts...

Wired full escrow lifecycle loop: routes/escrow.ts with deposit/mark-done/confirm/refund/ping/state endpoints, ton.ts additions (sendFromWallet, buildUserOpBody, buildJettonTransferBody, getEscrowState, ensureGas, computeJettonWallet), each handler updates reservations.status. Fixed handleCreateReservation to pass real tenant/landlord wallets. Platform pays gas via ensureGas.

*Confidence: 1 | Status: active | Created: 2026-06-28T23:24:44*

---

## Learnings

*Knowledge acquired from experience, corrections, and insights.*

*No memories of this type.*

---

## Observations

*Patterns noticed, behavioral notes, and recurring themes.*

*No memories of this type.*

---

## Artifacts

*Tool outputs, files, reports, and external references.*

*No memories of this type.*

---

## Errors

*Failure records, bugs, and lessons learned from mistakes.*

*No memories of this type.*

---

*End of memory export.*
