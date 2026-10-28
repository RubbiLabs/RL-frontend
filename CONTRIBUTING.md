# Contributing to RL-frontend

Thanks for helping build Rubbi. This file explains how to set up the
repository, how we branch and commit, what a pull request must contain, and
how outside contributors claim and complete a Drips Wave issue. The
[Code of Conduct](CODE_OF_CONDUCT.md) applies to every interaction, and
security problems go through [SECURITY.md](SECURITY.md), never a public issue.

Rubbi is three repositories; each has the same conventions:

| Repository | What it holds |
|---|---|
| [RL-smart-contracts](https://github.com/RubbiLabs/RL-smart-contracts) | Soroban contracts (vault, subscriptions, payroll), deploy and smoke scripts |
| [RL-api](https://github.com/RubbiLabs/RL-api) | Bun + Fastify backend: SEP-10 auth, event indexer, keeper, card issuer adapters |
| [RL-frontend](https://github.com/RubbiLabs/RL-frontend) | Next.js web app: wallet connection, dashboard, subscriptions, payroll, card |

## Setup and checks

Requirements: Node.js 22 and npm (the repository uses `package-lock.json`).

```sh
git clone https://github.com/RubbiLabs/RL-frontend.git
cd RL-frontend
npm ci
cp .env.example .env.local                # NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
npm run dev                               # http://localhost:3001
```

The app needs a running [RL-api](https://github.com/RubbiLabs/RL-api) (port
3000, with `CORS_ORIGINS=http://localhost:3001`) and a Stellar wallet such as
Freighter set to testnet.

Run every check before you push; CI runs the same list:

```sh
npm run lint
npm run type-check
npm run build
npm run check:errors                      # lib/stellar/errors.ts == contracts' errors.rs (skips without ../RL-smart-contracts; pass an explicit path to enforce)
```

In CI (`.github/workflows/ci.yml`), `RubbiLabs/RL-smart-contracts` is checked out into `contracts` at the ref pinned by `CONTRACTS_REF` (`vars.CONTRACTS_REF || 'main'`) and verified with `node scripts/check-contract-errors.mjs contracts`. When contract error enums change in `RL-smart-contracts`, update `lib/stellar/errors.ts` and bump `CONTRACTS_REF` in `.github/workflows/ci.yml` (or set the `CONTRACTS_REF` repository variable in GitHub settings).

This is a **Next.js 16** project with breaking changes from earlier majors.
Read `AGENTS.md` and the relevant guide in `node_modules/next/dist/docs/`
before writing Next.js-specific code (routing, caching, `next.config.ts`,
Turbopack). Other rules: no private key or secret ever reaches the browser
(every `NEXT_PUBLIC_*` value is public); money is handled as `bigint` stroops
through `lib/stellar/amount.ts`, never as floating point; card data comes only
from the API and mock cards keep their **MOCK** badge; every contract call
goes through `lib/stellar/invoke.ts` so errors are mapped to user-facing
messages.

## Branches and commits

- Work on a branch cut from the default branch. Name it after the change,
  e.g. `feat/payroll-end-date` or `fix/indexer-cursor-gap`.
- Never commit to the default branch directly and never force-push a branch
  that someone else has reviewed.
- Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):
  `type(scope): summary`, imperative mood, no trailing period. Types we use:
  `feat`, `fix`, `test`, `docs`, `chore`, `ci`, `refactor`, `perf`. Scopes are
  the area touched (`vault`, `subscriptions`, `payroll`, `indexer`, `keeper`,
  `auth`, `cards`, `wallet-page`, `readme`, ...).
- Keep commits small and self-contained; each one should pass the checks on
  its own. A reviewer should be able to read the history and understand the
  change step by step.
- Do not include attribution trailers, tool banners or generated boilerplate
  in commit messages.

## Pull requests

Open the pull request against the default branch and fill in the template.
Before you ask for review:

- [ ] The change does what the linked issue asks, and nothing more. Propose
      extra work in a separate issue instead of folding it in.
- [ ] Every check listed under "Setup and checks" above passes locally.
- [ ] New behaviour has tests; changed behaviour has updated tests. A bug fix
      includes a test that fails without the fix.
- [ ] Documentation that describes the changed behaviour is updated in the
      same pull request (README tables, error codes, env var tables, API docs).
- [ ] No secrets, private keys, `.env` files, build output or editor files
      are included. Only `.env.example` with placeholders may change.
- [ ] Money math uses integer stroops (`i128` / `bigint` / `Decimal`), never
      floating point. Stellar addresses are compared case-sensitively.
- [ ] You can explain every line of the diff, including code that an AI tool
      produced (see below).

Reviews are about the change, not the person. Expect questions; answer them in
the thread so the reasoning is preserved. A maintainer merges once CI is green
and at least one maintainer has approved.

## Tests

We treat the test suite as the specification. Every public contract function,
API route, worker and UI flow should have tests that cover the happy path, the
documented error paths and the authorization rules. For contract and backend
changes:

- Authorization tests must show both that the right signer succeeds **and**
  that a wrong signer fails.
- Time-gated behaviour is tested by moving the clock, not by sleeping.
- Idempotency (references, event ids) is tested by replaying the same input.
- Batches are tested at the limit and one over it.

Flaky tests are bugs; do not retry them away.

## Contributing via Drips Wave

Rubbi takes part in the Stellar Wave programme on [Drips](https://www.drips.network/).
Issues labelled **`Stellar Wave`** are scoped tasks that outside contributors
can complete and be paid for. To take one:

1. Read the issue in full: Context, Scope, Acceptance criteria, Out of scope.
   The acceptance criteria are the definition of done.
2. Comment on the issue to claim it. Say briefly how you plan to approach it
   and roughly when you expect to open a pull request. A maintainer assigns
   the issue to you; one claimed issue per contributor at a time.
3. If you go quiet for more than 7 days without an update, the issue may be
   released for someone else.
4. Open the pull request with `Closes #<issue>` in the description and the
   checklist above completed.
5. Address review feedback. The issue is considered complete when the pull
   request is merged.

What does **not** count as a Wave contribution: typo fixes, comment-only
changes, reformatting, dependency bumps without a reason, or pull requests
that implement something nobody asked for. The programme's terms prohibit
point farming, and so do we.

## AI-assisted contributions

You may use AI tools (code assistants, chat models, generators) while working
on Rubbi. The rules:

- **You are the author.** You must understand, have run, and be able to
  explain every line you submit. "The tool wrote it" is not an answer in
  review.
- **Test what you submit.** Generated code is held to exactly the same
  testing standard as hand-written code.
- **Verify, do not assume.** Check library versions against the registry,
  API shapes against the real documentation, and contract behaviour against
  the tests. Fabricated APIs, addresses or version numbers are grounds for
  closing the pull request.
- **Low-effort generated pull requests are closed without review**: large
  unrelated diffs, boilerplate rewrites, speculative refactors, or
  descriptions that do not match the code. Repeated submissions of that kind
  lead to a ban from Wave issues.

This mirrors the Drips Wave terms, which require contributors to take full
responsibility for AI-assisted work.

## Questions

Open a discussion or a plain issue (not a Wave issue) if something in this
guide is unclear. Improvements to this document are welcome.
