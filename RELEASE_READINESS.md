# Football200 Release Readiness

This file describes the explicit production gates. Presence of code or a successful deployment does not mean production readiness.

## Public release flags

- `PUBLIC_RELEASE_ENABLED=true` — explicit public release approval.
- `PUBLIC_INDEXING_ENABLED=true` — explicit SEO indexing approval.
- `LEGAL_RELEASE_APPROVED=true` — operator/legal documents have been supplied and qualified review completed. A production public build now fails if `impressum.html` or `datenschutz.html` is missing or still contains a release/legal-review placeholder.
- `PAYMENTS_RELEASE_APPROVED=true` — live Stripe checkout/webhook activation approved.
- `PRODUCTION_OPERATIONS_ENABLED=true` — production admin mutations approved.
- `MINOR_DATA_RELEASE_APPROVED=true` — qualified legal/safeguarding approval for real minor data. This flag alone is insufficient while the application code remains synthetic-only.
- `DISTRIBUTED_ABUSE_CONTROLS_READY=true` — production-grade shared/platform rate limiting and abuse controls have been configured and verified. The in-process limiter remains defense-in-depth only and does not satisfy this gate.

## Stripe identity and payment exceptions

Preview defaults to the Sports200 sandbox account `acct_1UCe5VGqzoOGCYe0` and rejects live Stripe sessions/events.

Production requires an explicit `STRIPE_EXPECTED_ACCOUNT_ID` and rejects test-mode Stripe sessions/events. Never reuse the preview account assumption for production.

If an already-paid sponsorship can no longer be fulfilled because programme mapping, season, amount or club capacity changed between Checkout creation and atomic fulfilment, the webhook requests an idempotent Stripe refund and records a `payment_exceptions` operations item. A failed refund remains an explicit operations-attention item.

Family Plus is additionally protected by the minor-payment gate, a confirmed pass reference, and one-paid-order-per-pass checks.

## Admin security

Production admin reads require application authentication. Production admin mutations additionally require same-origin requests, `PRODUCTION_OPERATIONS_ENABLED=true`, and `DISTRIBUTED_ABUSE_CONTROLS_READY=true`.

## Analytics

The local `analytics.js` event layer does not send data to a third party before visitor consent. Network analytics remains disabled unless all of the following are true:

- production is indexable,
- `ANALYTICS_RELEASE_APPROVED=true`,
- `ANALYTICS_CONSENT_READY=true`,
- `PUBLIC_GTM_ID` contains a valid GTM container id,
- the visitor explicitly grants optional statistics consent.

The visitor can later reopen privacy settings and revoke optional analytics consent.

## Diagnostic

`GET /api/health/readiness` exposes only non-secret booleans/status and lists current production blockers. The protected `/admin/readiness.html` view renders the same release-gate state for operations.

## Current hard blockers

- `impressum.html` and `datenschutz.html` are currently release-gate placeholders. They must be replaced with supplied/reviewed legal content before a public production build can pass.
- Real child/minor data is still intentionally synthetic-only. Do not set `MINOR_DATA_RELEASE_APPROVED=true` as a substitute for implementing and legally reviewing the real workflow.
- Distributed production abuse controls must be configured outside the process-local limiter and verified before the corresponding release flag is enabled.
- Live Stripe, email, legal, analytics configuration and post-deployment browser verification remain release-time gates.
