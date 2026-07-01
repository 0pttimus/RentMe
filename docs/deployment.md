# Deployment Runbook

## Production Targets

- Root app: https://rentme.pages.dev
- Production branch alias: https://production.rentme.pages.dev
- Worker API: https://rentme-api.engineeriqbbal.workers.dev

## Standard Deploy

Default user-facing production deploys must target the root Pages app:

```bash
npm run pages:deploy
```

That updates https://rentme.pages.dev. Do not use `--branch production` as the only deploy unless the user explicitly asks for the production branch alias.

Run migrations first:

```bash
npm run db:migrate:remote
```

Deploy the Worker:

```bash
npm run worker:deploy
```

Deploy the root Pages app:

```bash
npm run pages:deploy
```

Deploy the production branch alias only when needed:

```bash
npm run pages:deploy -- --branch production
```

## Verify The Right App Is Live

Check the latest local build output for the JS asset hash, then compare it to the live HTML:

```bash
curl -L https://rentme.pages.dev/
curl -L https://production.rentme.pages.dev/
```

The root app and production alias can serve different deployments. If a user reports a bug on `rentme.pages.dev`, verify that URL specifically.

## Auth Check

Production auth crosses domains:

- app domain: `rentme.pages.dev`
- API domain: `rentme-api.engineeriqbbal.workers.dev`

The Worker session cookie must be:

```text
HttpOnly; SameSite=None; Secure
```

The frontend also stores a client session marker after successful OTP verification. That marker only helps route guards. The Worker cookie is still the source of truth for API auth.

If users are sent back to registration after OTP:

1. Verify `rentme.pages.dev` serves the newest bundle.
2. Verify the Worker was deployed after auth cookie changes.
3. Check `/auth/otp/verify` returns `Set-Cookie`.
4. Check `/auth/me` returns the authenticated user after verification.
5. Clear stale site data and retry.
