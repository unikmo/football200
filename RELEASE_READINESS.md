# Football200 Release Readiness

This file describes the explicit production gates. Presence of code or a successful Vercel deployment does not mean production readiness.

## Public release flags

- `PUBLIC_RELEASE_ENABLED=true` — explicit public release approval.
- `PUBLIC_INDEXING_ENABLED=true` — explicit SEO indexing approval.
- `LEGAL_RELEASE_APPROVED=true` — operator/legal documents have been supplied and qualified review completed.
- `PAYMENTS_RELEASE_APPROVED=true` — live Stripe checkout/webhook activation approved.
- `PRODUCTION_OPERATIONS_ENABLED=true` — production admin mutations approved.
- `MINOR_DATA_RELEASE_APPROVED=true` — qualified legal/safeguarding approval for real minor data. This flag alone is insufficient while the application code remains synthetic-only.

## Stripe identity

Preview defaults to the Sports200 sandbox account `acct_1UCe5VGqzoOGCYe0` and rejects live Stripe sessions/events.

Production requires an explicit `STRIPE_EXPECTED_ACCOUNT_ID` and rejects test-mode Stripe sessions/events. Never reuse the preview account assumption for production.

## Analytics

The local `analytics.js` event layer does not send data to a third party. Network analytics remains disabled unless all of the following are true:

- production is indexable,
- `ANALYTICS_RELEASE_APPROVED=true`,
- `ANALYTICS_CONSENT_READY=true`,
- `PUBLIC_GTM_ID` contains a valid GTM container id.

## Diagnostic

`GET /api/health/readiness` exposes only non-secret booleans/status and lists current production blockers.

## Current hard blocker

Real child/minor data is still intentionally synthetic-only. Do not set `MINOR_DATA_RELEASE_APPROVED=true` as a substitute for implementing and legally reviewing the real workflow.
