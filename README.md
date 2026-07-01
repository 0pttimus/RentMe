# RentMe

Verified rental marketplace. Vite + React + Redux + SCSS frontend, Cloudflare Worker API.

## Dev

```bash
npm install
npm run dev:all
```

Web: http://localhost:3000  
API: http://localhost:8787

## Deploy

```bash
npm run db:migrate:remote
npm run worker:deploy
npm run pages:deploy
```

Production URLs:

- App: https://rentme.pages.dev
- Production branch alias: https://production.rentme.pages.dev
- API: https://rentme-api.engineeriqbbal.workers.dev

Deploy the root Pages app with:

```bash
npm run pages:deploy
```

Deploy the production branch alias with:

```bash
npm run pages:deploy -- --branch production
```

After deploying, verify the root app serves the latest bundle:

```bash
curl -L https://rentme.pages.dev/
```

The asset hash in the root HTML must match the latest production build output. The root URL and `production.rentme.pages.dev` can point at different deployments if only one target was deployed.

## Auth Notes

The app runs on `rentme.pages.dev` and the API runs on `workers.dev`, so auth is cross-site in production.

- Worker session cookies must use `SameSite=None; Secure` in production.
- The frontend also stores a small client session marker after successful OTP verification.
- The marker is only for route guards. The Worker session remains the real auth credential.
- Sign out and failed `/auth/me` clear the marker.

See `PROGRESS.md` for feature status and `CODING_STANDARDS.md` before writing code.
