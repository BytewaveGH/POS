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

- `GET /api/api/platform/tenants` — list all tenants
- `POST /api/api/platform/tenants` — create a tenant AND its first owner/admin account in one call:
  ```
  { name, slug, appType, ownerName, ownerEmail, password }
  ```
  Should validate `slug` is unique (409 if taken), hash the password, and make the resulting account immediately usable via the existing `/auth/admin-login` endpoint scoped to `X-Tenant-Domain: slug`.
- `PATCH /api/api/platform/tenants/:id` — update `name` / `slug` / `appType` / `status`. Setting `status: "suspended"` must cause that tenant's `/auth/admin-login` (and ideally all API calls scoped to it) to be rejected — suspension needs real teeth, not just a cosmetic flag.
- `DELETE /api/api/platform/tenants/:id` — remove a tenant. Confirm with product/legal whether this should cascade-delete tenant data or just deactivate; the frontend currently treats it as a hard delete.
- `GET /api/api/platform/tenants/lookup?slug=acme-diner` — lightweight, used by the public "find your business" picker page _before_ any login exists. Should return just enough to confirm existence (e.g. `{ exists: true }`), not full tenant details — this one is effectively public-facing (called from an unauthenticated page), so don't leak sensitive info through it.

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

- `GET /api/api/platform/tenants/:id/stats` — something like:
  ```
  { employeeCount, productCount, salesVolume, lastActivityAt }
  ```
- `GET /api/api/platform/tenants/:id/employees` — list of that tenant's employee accounts (name, email, role/permissions, active/suspended)
- `PATCH /api/api/platform/tenants/:id/employees/:employeeId` — at minimum, ability to suspend/reactivate one employee from the platform level (this was explicitly requested; scope was intentionally limited to _view + suspend_, not full employee CRUD, from the platform view)

These need to work **without** the caller having a normal per-tenant admin/employee bearer token — see below.

## Auth: how should "platform-level" calls authenticate?

This is the one open design question. Everything above needs to be callable by a platform operator who is not logged into any specific tenant and has no per-tenant `X-Tenant-Domain`-scoped bearer token. Options, roughly in order of how much backend work they imply:

1. **A platform/service API key** — a single secret the frontend's server-side code sends (e.g. `X-Platform-Key` header), checked against an env var on your side. Simplest, fine for an internal admin surface not exposed to end users.
2. **A real super-admin account type** in your existing auth system, whose bearer token is allowed to call the `/platform/*` routes and pass an explicit tenant id/slug per request instead of relying on `X-Tenant-Domain`.
3. Something else you already have conventions for — happy to adapt the frontend to whatever's least friction on your side.

Whichever you pick, let us know the exact header/token mechanism and we'll wire the frontend's existing super-admin login (currently a bootstrap-only env-var credential, `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD`) to call it.

## Priority

1. Tenant CRUD + owner-account creation (§1) — unblocks the whole "register a new business" flow for real, replaces the local JSON-file placeholder entirely.
2. `appType` on login responses (§2) — small addition, unblocks correct per-vertical routing for every real tenant (currently everyone defaults to "retail").
3. Platform-level stats/employees (§3) — lower priority, purely additive to the super admin dashboard; the mock data is clearly labeled as such and isn't blocking anything else.

Happy to hop on a call to go through response shapes/edge cases once you've had a look.
