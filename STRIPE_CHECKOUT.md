# Football200 Stripe Checkout — Preview

## Stripe account

- Account: `acct_1UCe5VGqzoOGCYe0`
- Name: Sports200 sandbox
- Mode: test only

## Flow

1. Sponsor opens `/sponsor/checkout.html`.
2. Sponsor selects an active club and one canonical tier: €99 / €297 / €495 / €990.
3. `POST /api/checkout/create-session` validates the club and remaining capacity server-side and creates a Stripe-hosted Checkout Session.
4. Stripe remains the payment source of truth.
5. `/api/stripe/webhook` verifies the Stripe signature and fulfils only paid sessions.
6. Firestore atomically updates club capacity and creates the sponsorship plus generated certificate record.
7. The digital certificate is available at `/zertifikat.html?id=<certificate-id>`.
8. If Resend is configured, the certificate link is emailed and the dashboard status advances to `sent`. If email is not configured, it remains `generated` / `pending_configuration` for operator attention.

## Required Preview environment variables

- `STRIPE_SECRET_KEY` — must be a test-mode `sk_test_...` key.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the Preview webhook endpoint.
- `RESEND_API_KEY` — optional until email delivery is activated.
- `FOOTBALL200_EMAIL_FROM` — verified sender address used by the email provider.

Firebase Preview credentials remain unchanged.

## Production boundary

This branch is Preview-only. Production checkout, production webhook routing, live Stripe keys, legal/tax/invoicing rules, production admin authentication and release QA require separate approval.
