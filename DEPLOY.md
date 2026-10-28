# Deploying the Rubbi frontend to Vercel (testnet)

`RL-frontend` is a Next.js 16 app with only static, client-rendered pages; it
needs no server-side secrets. The only thing a deployment must know is where
the Rubbi API is. The API is deployed to Render from `RL-api` on branch
`develop` (see `RL-api/DEPLOY.md`); deploy it first so its host is known.

Checked against Vercel's environment-variables docs on 2026-10-28
(https://vercel.com/docs/environment-variables): variables are applied to
*new* deployments only, and `NEXT_PUBLIC_*` values are inlined into the
JavaScript bundle at build time, so every change needs a redeploy.

## 1. Create the project

1. Vercel dashboard → **Add New… → Project** → import `RubbiLabs/RL-frontend`.
2. Framework preset: **Next.js** (auto-detected). Build command `npm run build`,
   install command `npm ci` (there is a `package-lock.json`), output `.next`.
   Node.js 22.x (the version the CI workflow uses).
3. Production branch: `main` (**Settings → Git → Production Branch**).
4. The production domain must be exactly `https://rubbilabs.vercel.app`, the
   origin the API's `CORS_ORIGINS` allows. If Vercel assigns a different
   project domain, either rename the project so that domain is available or
   add the real origin to `CORS_ORIGINS` on Render (comma-separated, exact
   origin, no trailing slash) and redeploy the API.

## 2. Environment variables

**Settings → Environment Variables**, environment **Production** (also tick
**Preview** if you want preview deployments to talk to the same API; see the
CORS note below).

Required:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<render-service>.onrender.com/api/v1`, e.g. `https://rubbi-api.onrender.com/api/v1` (the `/api/v1` prefix is part of the value; no trailing slash) |

Optional public overrides. When unset, the app reads network, RPC URL, USDC SAC
and contract ids from the API's `GET /stellar/config`, which is the source of
truth. Set them only to point the UI at a different RPC or at freshly deployed
contracts without redeploying the API. Values from
`RL-smart-contracts/deployments/testnet.json` (deployed 2026-10-27):

| Variable | Testnet value |
|---|---|
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | `https://soroban-testnet.stellar.org` |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` |
| `NEXT_PUBLIC_USDC_SAC_ID` | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |
| `NEXT_PUBLIC_VAULT_CONTRACT_ID` | `CBGARSQ7BY4345DNX76LWT4VXEHRRFJMNW46SCX7DRHBILL5V6RJN6KR` |
| `NEXT_PUBLIC_SUBSCRIPTIONS_CONTRACT_ID` | `CDWMLKAUMXHLSBOKKCK5A4ECUP2VIIHXAL7MVQ5TEFLE3QUXZRMDC3PC` |
| `NEXT_PUBLIC_PAYROLL_CONTRACT_ID` | `CB76PQ2MTILAQJAHLMTRHYDODX7H73YUCTVVKYO46ME3MK6WUTELDGYU` |
| `NEXT_PUBLIC_USDC_ISSUER` | `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` (Circle's testnet issuer, used for the trustline) |

Everything prefixed `NEXT_PUBLIC_` is shipped to the browser. Never put a
secret, a private key or anything from `RL-api`'s environment here.

Equivalent CLI: `vercel env add NEXT_PUBLIC_API_URL production` (prompts for
the value).

## 3. Deploy and redeploy

- First deploy: triggered by the project import, or **Deployments → Deploy**.
- After changing any variable: **Deployments → ⋯ on the latest deployment →
  Redeploy** (untick "Use existing Build Cache" so the new value is inlined).
  A new commit on the production branch also picks the values up.
- Pushing to `main` redeploys production; other branches create preview
  deployments.

## 4. Verify

1. Open `https://rubbilabs.vercel.app`. The landing page renders; the browser
   console shows no failed request to the API.
2. `https://rubbilabs.vercel.app/dashboard` (or `/onboarding`): the network
   tab shows `GET https://<render-service>.onrender.com/api/v1/stellar/config`
   answering `200` with `"network": "testnet"`. A CORS error here means the
   Vercel origin is not in the API's `CORS_ORIGINS`.
3. Connect Freighter (testnet) → **Sign in** → the SEP-10 challenge is signed
   and `POST /api/v1/auth/token` returns `200`. A `400` mentioning the home
   domain means the API's `HOME_DOMAIN` / `WEB_AUTH_DOMAIN` do not match its
   own host.
4. Wallet page shows the USDC balance and the vault ("Rubbi wallet") balance;
   card page shows the **MOCK** badge.
5. The first request after the API has been idle for 15 minutes can take up to
   a minute (Render free plan spin-up), so a slow first load is expected.

From here the testnet walkthrough in the workspace `E2E_CHECKLIST.md` applies,
with one exception below.

## The mock-card-spend step runs locally only

`POST /api/v1/dev/mock-card-spend` is registered by the API only when
`NODE_ENV !== "production"` and `CARD_ISSUER=mock`. The Render service runs
with `NODE_ENV=production`, so the route answers `404` there, by design (it
lets anyone with a user id debit that user's mock card). Step 7 of
`E2E_CHECKLIST.md` ("Mock card spend") is therefore run against a local API
(`bun run dev`, `localhost:3000`) with the local frontend, not against the
Vercel/Render deployment. Every other step works on the deployed stack.

## Preview deployments and CORS

Preview URLs (`rl-frontend-<hash>-<team>.vercel.app`) are different origins,
and the API allows exact origins only. To use previews against the deployed
API, add each preview origin to `CORS_ORIGINS` on Render (or use a fixed
preview alias and add that one). Otherwise previews work against a local API
by setting `NEXT_PUBLIC_API_URL` for the **Preview** environment to a URL you
control.
