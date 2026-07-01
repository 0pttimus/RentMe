# RentMe Coding Standards

Every line in this repo must follow these rules. No exceptions.

## Production only

- Ship code that runs in production today.
- No placeholders, TODO stubs, or "coming soon" handlers unless the feature is intentionally out of scope and documented in PROGRESS.md.
- No mock paths left wired in production builds.
- Source code must be production-ready, not speculative.
- Do not write code we will not use.
- Everything committed to source should work.
- If the path is unclear, ask before coding instead of guessing.

## Deploy target

- Always deploy user-facing production updates to `https://rentme.pages.dev/`.
- The required command for live frontend updates is `npm run pages:deploy`.
- Do not use `--branch production` for the live app. That targets the `https://production.rentme.pages.dev` branch alias, not the root production URL.
- Deploy `https://production.rentme.pages.dev` only when the user explicitly asks for the branch alias.
- If both URLs matter, deploy root first, then deploy the branch alias separately.
- After deploy, verify `https://rentme.pages.dev/` serves the latest built asset.

## No dead weight

- No unused files, exports, imports, dependencies, or variables.
- No commented-out code. Delete it; git has history.
- No duplicate logic. Extract shared code once.
- Do not leave unused code in place "for later".
- Only write what the app uses now.

## Readability

- Write for the next tired dev at 2am, not for a linter or an LLM.
- Prefer clear names over clever abstractions.
- Keep functions small. One job per module where it makes sense.
- Match existing patterns in the folder you are editing.

## Comments

- Comments are rare and only when something is non-obvious.
- Sound like a tired dev talking to himself: short, blunt, useful.
- No em dashes in comments.
- No "This function does X" on obvious code.
- No tutorial comments.
- No AI-sounding filler.
- No comments for unused or disabled code.
- Comments should help the next dev remember why something exists when they reopen the file.
- Good: `// skip auth in dev so we can click around without resend`
- Bad: `// This utility function handles the authentication flow by checking...`

## TypeScript

- Strict types. No `any` unless unavoidable and noted in one line why.
- Prefer explicit return types on exported functions.
- Use `import type` for type-only imports.

## React

- Functional components only.
- Side effects in `useEffect` with correct deps, or Redux thunks for async.
- No inline styles except dynamic values that cannot live in SCSS.
- State that crosses routes lives in Redux. Local UI state stays local.

## SCSS

- One `.module.scss` per component or page.
- Use `@use` for shared tokens and mixins from `src/styles/`.
- No Tailwind. No utility-class soup in JSX.
- Animations use `transform` and `opacity` only. No layout thrash.

## Redux

- Slices by domain: auth, wallet, etc.
- Async work in thunks or RTK Query later. No fetch scattered in random components if it belongs in the store.
- Selectors colocated with slices.

## API

- All HTTP goes through `src/lib/api/client.ts`.
- Credentials always included for auth cookies.
- Env via `import.meta.env.VITE_*` only.

## Git hygiene

- A PR should do one thing.
- If you touch a file, leave it cleaner than you found it per these rules.
