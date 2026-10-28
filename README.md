# Rubbi frontend

Next.js 16 app for [Rubbi](https://github.com/RubbiLabs) on Stellar: fund a USDC balance, pay subscriptions, run payroll and spend through a virtual card. It talks to the Rubbi API (`RL-api`) over REST with a SEP-10 JWT and to the Soroban contracts (`RL-smart-contracts`) through the user's own wallet.

```
browser ──(Stellar Wallets Kit: sign)──▶ Soroban contracts (vault, subscriptions, payroll, USDC SAC)
   │                                            ▲
   └──(REST + SEP-10 JWT)──▶ RL-api ────(indexer)┘
```

No private key ever reaches the browser. Every `NEXT_PUBLIC_*` value is public (ids and URLs).

## Setup

```bash
npm ci
cp .env.example .env.local      # set NEXT_PUBLIC_API_URL
npm run dev                      # http://localhost:3000 (use -p 3001 when the API uses 3000)
```

The API must list this app's origin in its `CORS_ORIGINS` (see `RL-api/.env.example`).

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | API base URL including `/api/v1` |
| `NEXT_PUBLIC_STELLAR_NETWORK`, `NEXT_PUBLIC_STELLAR_RPC_URL`, `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | no | override `GET /stellar/config` |
| `NEXT_PUBLIC_USDC_SAC_ID`, `NEXT_PUBLIC_VAULT_CONTRACT_ID`, `NEXT_PUBLIC_SUBSCRIPTIONS_CONTRACT_ID`, `NEXT_PUBLIC_PAYROLL_CONTRACT_ID` | no | override the ids from `GET /stellar/config` |
| `NEXT_PUBLIC_USDC_ISSUER` | no | classic USDC issuer for the trustline; resolved from the SAC's `name()` when unset |

Checks: `npm run lint`, `npm run type-check`, `npm run build`, `npm run check:errors` (compares `lib/stellar/errors.ts` with the contracts' `errors.rs`; skipped when `../RL-smart-contracts` is absent).

## Flows

| Flow | Where | How |
|---|---|---|
| Sign-in | `/onboarding` | connect (Stellar Wallets Kit) → `GET /auth/challenge` → wallet signs the SEP-10 challenge → `POST /auth/token` → JWT kept in memory and `sessionStorage` |
| Username and card | `/onboarding` | `POST /users/username` creates the card; cards from the mock issuer carry a visible **MOCK** badge |
| Trustline | `/dashboard/wallet` | account and USDC trustline read via RPC `getLedgerEntries`; one-click `changeTrust`; Friendbot and Circle faucet links on testnet |
| Rubbi wallet | `/dashboard/wallet` | `vault.deposit` / `vault.withdraw` signed by the wallet; API mirror shown next to the on-chain balance |
| Card | `/dashboard/card` | `POST /cards/load` / `POST /cards/unload`, movements polled every 5 s while `PENDING`, `SETTLED` or `PENDING_TREASURY` |
| Subscriptions | `/dashboard/subscriptions` | step 1 SAC `approve(amount × 3 periods, expiration ledger)`, step 2 `subscribe`; allowance status from `allowance()` and the SAC's allowance ledger entry; `pause_subscription` / `resume_subscription` / `cancel_subscription` |
| Payroll | `/dashboard/payroll` | `fund` / `withdraw_escrow`, `create_schedules` (≤ 25 per transaction, validated client-side and atomically on-chain), `pause_schedule` / `resume_schedule` / `cancel_schedule`, "Pay due now" = `disburse_batch` |
| Dashboard | `/dashboard` | `GET /dashboard/stats` only |

## Code map

| Path | Purpose |
|---|---|
| `lib/stellar/config.ts` | network config: `GET /stellar/config` merged with `NEXT_PUBLIC_*` overrides; explorer and faucet URLs |
| `lib/stellar/amount.ts` | 7-decimal USDC helpers on `bigint`/strings (no floating-point money math) |
| `lib/stellar/invoke.ts` | build → simulate → assemble → wallet sign → submit → poll; `StellarTxError` with user-facing messages |
| `lib/stellar/errors.ts` | error code tables for the vault, subscriptions, payroll and the USDC SAC |
| `lib/stellar/{vault,subscriptions,payroll,sac,account}.ts` | typed contract calls and ledger reads |
| `lib/stellar/walletKit.ts` | lazy, client-only Stellar Wallets Kit initialisation (Freighter first) |
| `context/StellarWalletContext.tsx` | connect / disconnect / network check / `signTransaction` / SEP-10 session |
| `lib/api.ts`, `types/api.ts` | typed API client and response types |
| `hooks/useApi.ts`, `hooks/useChain.ts`, `hooks/useStellarTx.ts` | React Query hooks for the API and the ledger; transaction runner with the status modal |

## Amounts

Contract amounts are `i128` stroops (USDC has 7 decimals). The UI parses user input with a strict decimal regex, converts with `bigint`, and formats back with string arithmetic. API amounts are decimal strings and are parsed the same way.
