# Backend work needed: multi-tenant SaaS support for Bytewave POS

## Context

Bytewave POS is being turned into a multi-tenant SaaS platform: one Next.js frontend serves many businesses ("tenants"), each on its own subdomain (e.g. `acme-diner.bytewave.app`), each running one of several verticals (retail/POS, eatery, amusement park, more later). A visitor picks a business by name on a marketing page, gets sent to that business's subdomain, and logs in there.

Every API call already carries an `X-Tenant-Domain` header identifying which tenant it's for — this part already works, since every existing endpoint is scoped by it. What's missing is backend support for the platform-level pieces: creating/managing tenants themselves, and giving a "super admin" (platform operator, not a tenant user) visibility and control across all of them.

Until these exist, the frontend has a **self-contained, local-only placeholder** for all of this (a JSON file, hashed passwords via Node's `crypto`, a bootstrap env-var super-admin login) so the feature is fully clickable today. That placeholder needs to be replaced by real backend endpoints — this doc specs exactly what's needed, matching the contracts the frontend already assumes.

## 1. Tenant management (new)

A tenant record needs at least:

```
{
  id: string
  name: string            // business display name, e.g. "Acme Diner"
  slug: string            // subdomain label, unique, e.g. "acme-diner" — this is the X-Tenant-Domain value
  appType: string          // "retail" | "eatery" | "amusement" | ... (which vertical/feature set)
  status: "active" | "suspended"
  ownerName: string
  ownerEmail: string
  createdAt: string
}
```

Needed endpoints (platform-scoped — see auth section below for how these should be protected):

- `GET /api/platform/tenants` — list all tenants
- `POST /api/platform/tenants` — create a tenant AND its first owner/admin account in one call:
  ```
  { name, slug, appType, ownerName, ownerEmail, password }
  ```
  Should validate `slug` is unique (409 if taken), hash the password, and make the resulting account immediately usable via the existing `/auth/admin-login` endpoint scoped to `X-Tenant-Domain: slug`.
- `PATCH /api/platform/tenants/:id` — update `name` / `slug` / `appType` / `status`. Setting `status: "suspended"` must cause that tenant's `/auth/admin-login` (and ideally all API calls scoped to it) to be rejected — suspension needs real teeth, not just a cosmetic flag.
- `DELETE /api/platform/tenants/:id` — remove a tenant. Confirm with product/legal whether this should cascade-delete tenant data or just deactivate; the frontend currently treats it as a hard delete.
- `GET /api/platform/tenants/lookup?slug=acme-diner` — lightweight, used by the public "find your business" picker page _before_ any login exists. Should return just enough to confirm existence (e.g. `{ exists: true }`), not full tenant details — this one is effectively public-facing (called from an unauthenticated page), so don't leak sensitive info through it.

## 2. `appType` on existing login/refresh responses

`POST /auth/admin-login`, `POST /employees/login`, and `POST /auth/refresh` currently return a user object without an `appType` field. Please add it (sourced from the tenant record's `appType`) so the frontend can route a logged-in user to the correct vertical's UI (`/stores/...` for retail, `/eatery`, `/amusement`, etc.) instead of defaulting everyone to retail. Everything else about these response shapes can stay as-is:

```
{
  data: {
    accessToken: string
    refreshToken: string
    accessTokenExpiry: number
    refreshTokenExpiry: number
    user: {
      id: number
      username: string
      accountType: string
      avatar: string
      phone: string
      email: string
      createdAt: string
      updatedAt: string
      appType: string   // <-- new
    }
  }
  status: boolean
}
```

## 3. Platform-level visibility into a tenant (for the super admin dashboard)

Right now the super admin's per-tenant "View" panel shows fabricated numbers (employee count, product count, sales volume, last activity) and a fake staff list, clearly labeled as mock data pending this work. To make it real:

- `GET /api/platform/tenants/:id/stats` — something like:
  ```
  { employeeCount, productCount, salesVolume, lastActivityAt }
  ```
- `GET /api/platform/tenants/:id/employees` — list of that tenant's employee accounts (name, email, role/permissions, active/suspended)
- `PATCH /api/platform/tenants/:id/employees/:employeeId` — at minimum, ability to suspend/reactivate one employee from the platform level (this was explicitly requested; scope was intentionally limited to _view + suspend_, not full employee CRUD, from the platform view)

These need to work **without** the caller having a normal per-tenant admin/employee bearer token — see below.

## Auth: how should "platform-level" calls authenticate?

This is the one open design question. Everything above needs to be callable by a platform operator who is not logged into any specific tenant and has no per-tenant `X-Tenant-Domain`-scoped bearer token. Options, roughly in order of how much backend work they imply:

1. **A platform/service API key** — a single secret the frontend's server-side code sends (e.g. `X-Platform-Key` header), checked against an env var on your side. Simplest, fine for an internal admin surface not exposed to end users.
2. **A real super-admin account type** in your existing auth system, whose bearer token is allowed to call the `/platform/*` routes and pass an explicit tenant id/slug per request instead of relying on `X-Tenant-Domain`.
3. Something else you already have conventions for — happy to adapt the frontend to whatever's least friction on your side.

Whichever you pick, let us know the exact header/token mechanism and we'll wire the frontend's existing super-admin login (currently a bootstrap-only env-var credential, `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD`) to call it.

## 4. Amusement park vertical (new) — ✅ DONE, live on the backend

All four endpoint groups below (Attractions, Tickets, Bookings, Leaderboard, including the public `GET /leaderboard/public`) are implemented and deployed. The frontend (`/amusement/attractions`, `/amusement/tickets`, `/amusement/bookings`, `/amusement/board`) has been checked against the real contract field-by-field and matches exactly — no frontend changes were needed. Kept below for reference. Same request-shape conventions as the rest of the API (trailing-slash collection routes, `X-Tenant-Domain`-scoped, `{ data: ... }` envelope).

**Attractions** — rides/attractions with capacity and ticket pricing. This park's attractions are arena-style venues (skating rink, go-karting track, arcade room, trampoline arena) plus activities matching Bambo's Adventure Park's (Accra) lineup (paintball, bubble soccer, foot dart, sumo wrestling, human foosball), so `type` is a fixed category rather than free text:

```
{
  id, name,
  type: "skating" | "go-karting" | "arcade" | "trampoline"
      | "paintball" | "bubble-soccer" | "foot-dart" | "sumo-wrestling" | "human-foosball" | "other",
  capacity, ticketPrice,
  status: "active" | "maintenance" | "closed"
}
```

- `GET /attractions/` — list
- `POST /attractions/` — create, body `{ name, type, capacity, ticketPrice, status }`
- `PUT /attractions/:id` — update, same body
- `DELETE /attractions/:id`

**Tickets** — entry/ride ticket sales, optionally tied to an attraction (`attractionId: null` = general admission):

```
{ id, attractionId: number | null, buyerName: string | null, quantity, status: "valid" | "redeemed", createdAt }
```

- `GET /tickets/` — list
- `POST /tickets/` — create, body `{ attractionId, buyerName, quantity }`
- `PATCH /tickets/:id/redeem` — mark a ticket redeemed
- `DELETE /tickets/:id` — void a ticket

**Bookings** — group bookings/reservations, optionally tied to an attraction:

```
{ id, customerName, phone, date, partySize, attractionId: number | null, status: "pending" | "confirmed" | "cancelled", notes }
```

- `GET /bookings/` — list
- `POST /bookings/` — create
- `PUT /bookings/:id` — update (also used for status changes — confirm/cancel)
- `DELETE /bookings/:id`

**Leaderboard** — recorded scores/times per attraction, so parks can run a "top scores" board. What counts as a good score is direction-dependent per attraction type on the frontend (e.g. go-karting is fastest-lap/lower-is-better, arcade is high-score/higher-is-better) — the backend doesn't need to know this, it just stores and returns raw entries:

```
{ id, attractionId, participantName, teamName: string | null, score: number, achievedAt: string }
```

- `GET /leaderboard/` — list, normal tenant-scoped auth (bearer token + `X-Tenant-Domain`) — used by the staff management page where entries get recorded
- `POST /leaderboard/` — create
- `PUT /leaderboard/:id` — update
- `DELETE /leaderboard/:id`
- `GET /leaderboard/public` — **genuinely public, no bearer token at all** — scoped **only** by `X-Tenant-Domain` (same precedent as the existing public `GET /platform/tenants/lookup`). This powers a no-login display board (`/amusement/board`, meant for a lobby screen or a shared link) — the frontend resolves the tenant from the subdomain itself since there's no session to read it from. Response should include the attraction's name and type **denormalized onto each entry** so the frontend doesn't need a second public endpoint just to label rows:
  ```
  { data: [ { id, attractionId, attractionName, attractionType, participantName, teamName, score, achievedAt }, ... ] }
  ```
  Please double-check this route is excluded from whatever auth middleware normally requires a bearer token — it's the one endpoint in this doc that's intentionally callable by a completely anonymous visitor.

## Priority

1. Tenant CRUD + owner-account creation (§1) — unblocks the whole "register a new business" flow for real, replaces the local JSON-file placeholder entirely.
2. `appType` on login responses (§2) — small addition, unblocks correct per-vertical routing for every real tenant (currently everyone defaults to "retail").
3. Platform-level stats/employees (§3) — lower priority, purely additive to the super admin dashboard; the mock data is clearly labeled as such and isn't blocking anything else.
4. ~~Attractions/tickets/bookings/leaderboard (§4)~~ — ✅ done, confirmed live and matching the frontend's contract exactly (2026-08-29).

Happy to hop on a call to go through response shapes/edge cases once you've had a look.
