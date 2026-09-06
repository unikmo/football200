# Football200 Firebase Backend — Preview Implementation

## Canonical infrastructure target

- Product: **Sponsor a Young Fan / Football200**
- Repository: `unikmo/football200`
- Firebase project: `football200-82b00`
- Firestore database: `(default)`
- Hosting project: Vercel `football200`
- Implementation environment: **Preview only**
- Production mutation: **not authorized**

## Required Vercel Preview variables

- `FIREBASE_PROJECT_ID=football200-82b00`
- `FIREBASE_DATABASE_ID=(default)` — retained as deployment documentation; application code pins the canonical `(default)` database to prevent project-number/database-id drift.
- `FIREBASE_CLIENT_EMAIL=<Football200 service-account email>`
- `FIREBASE_PRIVATE_KEY_BASE64=<base64-encoded PEM private key or service-account JSON>`

Never expose the private key to browser code and never prefix any server credential with `NEXT_PUBLIC_`.

## Firestore collections

### Active in this preview branch

- `club_interest` — inbound club onboarding interest from the club form.
- `sponsor_interest` — inbound business sponsorship interest from the company form.
- `clubs` — public-safe participating club/season records. The public API returns only records with `status=active` and a restricted field set.
- `sponsorships` — admin-readable sponsorship/order records. Payment status is deliberately read-only in the admin because the payment processor must remain the source of truth once checkout is implemented.
- `certificates` — admin-readable certificate fulfilment records with controlled status transitions: `pending -> generated -> sent`, failures may move to `failed`, and `failed -> pending` is the retry path.
- `operations_events` — append-only preview audit events for important admin state changes such as certificate status transitions.
- `_health_probe` — read-only connection probe target; the collection may remain empty.

### Reserved for later controlled implementation

- `programme_seasons`
- `sponsor_profiles`
- `school_channels`
- `selection_runs`
- `guardian_confirmations`
- `attendance`

No child application data is persisted by this branch. The child application endpoint deliberately returns `PERSISTENCE_DISABLED_IN_DEMO` until the parent/guardian consent, privacy, safeguarding and German legal implementation has been approved.

## API surface

### Public/preview product APIs

- `GET /api/health/firebase` — verifies server credentials and Firestore read access.
- `GET /api/programme` — returns locked programme economics used by backend flows.
- `GET /api/clubs` — returns restricted public-safe participating club data.
- `POST /api/interest/club` — Preview-only Firestore write for club interest.
- `POST /api/interest/sponsor` — Preview-only Firestore write for sponsor interest.
- `POST /api/child-applications` — deliberately blocked; does not persist child data.

### Admin Preview APIs

- `GET /api/admin/overview` — Preview-only operational read model for orders, certificates, clubs and inbound leads.
- `PATCH /api/admin/certificate-status` — Preview-only controlled certificate status transition. Every successful change appends an `operations_events` record and mirrors `certificateStatus` to the linked sponsorship when present.

## Admin dashboard

- Route: `/admin/`
- Environment: Preview only.
- Access layer for this stage: Vercel Deployment Protection on the Preview deployment.
- The dashboard contains no fake orders or certificates. Empty collections render explicit empty states.
- Payment state is not manually editable.
- Certificate state changes follow the server-enforced transition rules and create an audit event.

**Production admin authentication is not implemented by this Preview branch.** Before production release, use an explicit authenticated/authorized admin identity layer and re-run the security gate. A share link or Preview protection bypass must never be treated as production admin authentication.

## Production safety

Club, sponsor and admin write endpoints reject requests outside Vercel Preview. A future production release requires separate authorization, QA, privacy/security review, explicit admin authentication/authorization, rate/abuse controls and explicit enablement. Real payment processing is not implemented in this branch.
