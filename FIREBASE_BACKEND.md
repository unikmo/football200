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
- `FIREBASE_DATABASE_ID=(default)`
- `FIREBASE_CLIENT_EMAIL=<Football200 service-account email>`
- `FIREBASE_PRIVATE_KEY_BASE64=<base64-encoded PEM private key or service-account JSON>`

Never expose the private key to browser code and never prefix any server credential with `NEXT_PUBLIC_`.

## Firestore collections

### Active in this preview branch

- `club_interest` — inbound club onboarding interest from the club form.
- `sponsor_interest` — inbound business sponsorship interest from the company form.
- `clubs` — public-safe participating club/season records. The public API returns only records with `status=active` and a restricted field set.
- `_health_probe` — read-only connection probe target; the collection may remain empty.

### Reserved for later controlled implementation

- `programme_seasons`
- `sponsorships`
- `sponsor_profiles`
- `certificates`
- `school_channels`
- `selection_runs`
- `guardian_confirmations`
- `attendance`
- `operations_events`

No child application data is persisted by this branch. The child application endpoint deliberately returns `PERSISTENCE_DISABLED_IN_DEMO` until the parent/guardian consent, privacy, safeguarding and German legal implementation has been approved.

## API surface

- `GET /api/health/firebase` — verifies server credentials and Firestore read access.
- `GET /api/programme` — returns locked programme economics used by backend flows.
- `GET /api/clubs` — returns restricted public-safe participating club data.
- `POST /api/interest/club` — Preview-only Firestore write for club interest.
- `POST /api/interest/sponsor` — Preview-only Firestore write for sponsor interest.
- `POST /api/child-applications` — deliberately blocked; does not persist child data.

## Production safety

Club and sponsor write endpoints reject requests outside Vercel Preview. A future production release requires separate authorization, QA, privacy/security review and explicit enablement. Real payment processing is not implemented in this branch.
