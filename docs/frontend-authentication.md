# Frontend Authentication Integration

## Compatibility and scope

This client targets Backend `dada13c2a2c99cf1a2c79b3836d08db94f94791e`
(`eli0504167101/hotel-backend:backend-26`). It keeps the original garden image,
reservation buttons, hotel selector, booking and lookup dialogs, RTL layout and
legacy `#lookup` navigation. The account bar and responsive native auth dialog are
additions. Public hotel browsing does not require an account.

There are no Premium upgrades, reservation history, payments, ownership claiming,
Backend changes or Infrastructure changes in this PR.

## API contract

All URLs are relative to the page origin. Requests explicitly use
`credentials: 'same-origin'` and `cache: 'no-store'`. The browser supplies Origin;
the client does not fabricate it. NGINX's existing `/api/` proxy remains unchanged.

| Action | Endpoint | Request / response |
| --- | --- | --- |
| Restore session | `GET /api/auth/me` | `{ user }`; anonymous `401` is normal |
| Register | `POST /api/auth/register` | JSON `{ fullName, email, password }`; `201 { user }` |
| Login | `POST /api/auth/login` | JSON `{ email, password }`; `200 { user }` |
| Fetch CSRF proof | `GET /api/auth/csrf` | `{ csrfToken }` after session restoration or rotation, before a protected write |
| Logout | `POST /api/auth/logout` | JSON `{}`, `X-CSRF-Token`; `204` without a JSON body |
| Hotels | `GET /api/reservations/hotels` | Public array |
| Create reservation | `POST /api/reservations` | JSON contact/dates/hotel fields, `X-CSRF-Token`; `201 { id, reservationId }` |
| Lookup | `GET /api/reservations/lookup/:query` | URI-encoded ID/name/email; one owned reservation |
| Cancel | `DELETE /api/reservations/:id` | URI-encoded reservation ID, JSON `{}`, `X-CSRF-Token` |

Registration sends no tier or user ID. Reservation creation sends no user ID.
Contact fields are booking details, never authorization evidence. The Backend is
the authorization authority; UI account checks are only usability checks.

The opaque session ID is managed exclusively through the Backend's HttpOnly
cookie. No localStorage/sessionStorage is used. User state and CSRF proof exist
only in page memory; the password input is cleared after an attempt or dialog
close. Browser password-manager behavior remains under browser/user control.
Successful registration/login replaces old CSRF proof. Logout and protected `401`
responses clear local account/proof and displayed reservation results. In-flight
successful lookup/create responses are ignored after a local account change.

Protected `401` asks the user to log in again. `403` clears cached proof and asks
for a refresh/status check. `404` does not distinguish foreign, legacy and absent
reservations. Duplicate registration, rate limits and temporary unavailability
have explicit messages. Logout failure is not presented as confirmed logout.
Requests that fail are never automatically replayed: an ambiguous network/DB
failure may follow a committed write. Check the reservation/account state before
retrying. Login state in another tab can change independently; refresh to restore
that tab's current session state.

All API-controlled text, including names, hotel descriptions, IDs and error
messages, is rendered through `textContent`/DOM text nodes, not HTML interpolation.
Error text is selected from local messages rather than displaying arbitrary proxy
responses. Pending submit/cancel/logout buttons prevent accidental duplicate clicks.

## Validation

Requires Node 20 or later and Chromium's supported host dependencies:

```bash
npm ci
npx playwright install --with-deps chromium
npm test
```

The default suite has 36 browser tests (18 scenarios in each viewport profile)
and uses browser request fixtures to test success/failure contracts,
CSRF headers, safe rendering, no storage, session restoration, reservation creation,
lookup/cancellation/logout, keyboard dismissal, mobile and desktop geometry.
It runs on a loopback-only static server and does not access the cluster.

For an actual Backend and MongoDB integration run, check out the compatible Backend
revision separately and install its locked dependencies. With the repositories as
siblings:

```bash
npm run test:backend
```

For a different checkout location, set `BACKEND_REPOSITORY` to its absolute path.
The harness imports that checkout's `createApp` and auth configuration, initializes
real models/indexes and creates a private MongoDB 7.0.24 on loopback. It ignores
ambient `MONGO_URL`. No application startup or migration CLI is invoked. Each
browser uses a separate disposable account. The database is stopped after the run.
The two integration tests cover actual cookie flags/HttpOnly isolation, register, restore, create,
lookup, safe guest text, CSRF-protected cancellation/logout, revoked session and
login in both viewport profiles. Standalone MongoDB does not prove replica-set
failover or live TLS/proxy behavior.

The GitHub Actions validation job runs the fixture-based browser suite for PRs to
`dev` and `main`. Actual Backend integration is a separate local validation command;
it requires the external Backend checkout and its dependencies. Image publishing
remains restricted to a push to `dev`, and deployment preparation remains a separate
workflow that only opens an Infrastructure PR.

## Coordinated rollout: approval required

**Do not deploy this Frontend or the ownership Backend independently.**
Infrastructure PRs #50, #51 and #52 must remain unmerged until a separately approved
coordinated release. This PR changes no manifests or live resources.

1. Review the final Frontend PR head, tests and compatible Backend image digest.
   After explicit merge approval, verify the published Frontend image and the
   automatically generated Infrastructure PR; image publication is not deployment
   approval.
2. Follow Backend `docs/authentication-rollout.md` and
   `docs/reservation-ownership.md`. Review and stage required `AUTH_ENV`, exact
   browser `AUTH_ORIGIN`, `MONGO_URL`, and explicit `AUTH_TRUSTED_PROXIES` through
   separate approved Infrastructure PRs. Demo/production require HTTPS; local HTTP
   is limited to approved development hosts. Preserve HttpOnly/SameSite and secure
   `__Host-` cookies. Never weaken cookie policy to make an incompatible path work.
3. Verify both request paths: direct Ingress-to-Backend and any Frontend NGINX proxy.
   Trusted proxies must reflect the actual chain and preserve independent real-client
   rate-limit budgets without trusting spoofed forwarded headers. Verify original
   Origin reaches the Backend. HTTPS cookies derive security from configuration;
   NGINX's internal HTTP scheme is not permission to disable Secure cookies.
4. Before changing either image, block external reservation creation, lookup and
   cancellation at **every entry point**, including direct Frontend proxy access.
   Ordinary rolling updates can expose old public Backend replicas; readiness alone
   cannot prevent this. If all entry points cannot be blocked, do not release.
5. Through separately approved GitOps changes, update all five Backend replicas and
   the compatible Frontend, verify auth readiness, and refresh cached old client assets.
   Rehearse registration/login, reload, expiry, logout, public hotels, owner-scoped
   reservation operations, CSRF rejection and legacy denial on the real TLS/proxy path.
   Only then reopen reservation traffic.
6. On rollback, block reservation traffic first; use an approved compatible image pair.
   Never restore a public Backend while reservation traffic is open. Preserve account,
   session and reservation data. No ownership migration is needed for this client;
   any live migration requires separate target-specific approval.

Existing availability checking is a non-atomic find-then-save operation: concurrent
requests can overlap. This pre-existing Backend limitation is not fixed by client
button disabling. Name/email lookup can be ambiguous and scan collections; IDs are
preferred. Cancellation still physically deletes owned reservations. These are
separate Backend concerns, not claims of protection supplied by this Frontend.
