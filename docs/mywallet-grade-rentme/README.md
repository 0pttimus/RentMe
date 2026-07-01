# MyWallet-Grade RentMe

## Goal

Make RentMe feel as smooth, fast, responsive, and premium as MyWallet while staying clearly RentMe: a trusted housing operating system for rentals, payments, verification, tenancy, services, rewards, and support.

This does not mean copying MyWallet's brand, screens, icons, wording, or crypto product patterns. It means adopting the same level of product discipline:

- mobile-first app experience
- instant-feeling interactions
- quiet premium visual design
- minimal dependency footprint
- native-quality motion
- strong performance budgets
- focused user journeys
- no dashboard clutter

## What MyWallet Is Doing Well

MyWallet feels premium because it behaves like an app, not a website.

Key qualities to match:

- Single-purpose screens with clear hierarchy
- Fast route transitions
- Bottom-sheet and modal patterns that feel native
- Compact, polished controls
- Minimal visual noise
- Good empty, loading, and pending states
- Strong mobile safe-area and keyboard handling
- High responsiveness even during network work
- App-shell consistency across web, mobile, desktop, and extensions

## RentMe Target Experience

RentMe should open like a Nigerian housing wallet:

- Find a verified home
- Check its property passport
- Reserve it
- Inspect it
- Pay or get refunded
- Manage rent
- Book home services
- Build trust

The user should never feel like they are using a property website or admin dashboard.

## Architecture Direction

Current stack:

- Vite
- React
- TypeScript
- SCSS modules
- Redux Toolkit
- Cloudflare Worker
- D1

Near-term recommendation:

- Keep Vite for speed.
- Keep SCSS modules for precise visual control.
- Keep React unless performance profiling proves it is the bottleneck.
- Avoid introducing heavy UI libraries.
- Add focused motion and gesture utilities instead of broad component frameworks.
- Defer TON integration until core product flows are excellent.

Future mobile direction:

- Add Capacitor when the PWA flows are stable.
- Use native haptics, safe-area controls, keyboard handling, splash screen, biometric auth, and push notifications through Capacitor.
- Keep one codebase for web and mobile wrappers.

## Product Rules

Every RentMe screen must pass these checks:

- Can a user understand the screen in 3 seconds?
- Is there one obvious primary action?
- Does the page feel useful without explanation text?
- Are all touch targets comfortable?
- Does loading feel intentional?
- Does navigation feel spatial and native?
- Is fraud reporting reachable where risk exists?
- Does the screen avoid dashboard clutter?

## Motion Rules

Motion is a product feature.

Required patterns:

- Spring page transitions
- Native-feeling bottom sheets
- Skeleton loaders
- Press feedback on every tappable control
- Pull-to-refresh where lists are central
- Swipe gestures for dismissing sheets and returning from detail screens
- Optimistic UI for reservations, reports, wallet actions, and service bookings

Performance constraints:

- Animate only `transform` and `opacity` where possible.
- Avoid layout-shifting animations.
- Keep route transitions under 300ms.
- Keep loading states immediate.
- Prefer CSS transitions for simple feedback.
- Use JS animation only where interaction requires it.

## Visual System Direction

RentMe should look like a premium financial/housing app:

- restrained colors
- soft but crisp surfaces
- strong typography
- clear status badges
- large readable numbers
- high-quality property media
- calm verification and trust language
- no promotional clutter

Core surfaces:

- home/search feed
- property passport
- wallet
- reservation timeline
- tenancy portal
- service booking
- trust profile
- AI assistant
- admin moderation

## Engineering Plan

### Phase 1: App Feel Foundation

- Tighten the app shell.
- Standardize page transitions.
- Add reusable press feedback.
- Add skeleton components.
- Add bottom sheet component.
- Add native safe-area spacing.
- Reduce visual noise in core screens.

### Phase 2: Live Product Spine

- Replace mock property feed with Worker API data.
- Wire search and filters.
- Wire property detail to API data.
- Wire reservation creation to API.
- Add reservation status timeline.
- Add report issue flow from property and reservation screens.

### Phase 3: Trust And Verification Layer

- Expand property passport data model.
- Build verification review states.
- Add user trust profile detail.
- Add report moderation lifecycle.
- Add trust score event ledger.

### Phase 4: Wallet And Rent Operations

- Keep wallet Naira-first.
- Wire deposits, withdrawals, rent payments, and refunds to real ledger entries.
- Add payment pending states.
- Add rent reminders and renewal flows.
- Keep TON as TODO until product flows are stable.

### Phase 5: Mobile Wrapper

- Add Capacitor.
- Add iOS and Android shell configuration.
- Add haptics.
- Add native keyboard handling.
- Add push notifications.
- Add biometric unlock.
- Test on real devices.

## Performance Budget

Targets:

- Initial app JS under 300KB gzip before major feature expansion.
- Route chunks lazy-loaded.
- No unbounded list rendering.
- No blocking network requests during route transitions.
- 60fps scrolling on mid-range Android devices.
- All core actions respond visually within 100ms.

## Non-Goals

- Do not copy MyWallet's branding.
- Do not make RentMe a crypto wallet UI.
- Do not introduce TON before the rental product works.
- Do not rebuild everything with a custom UI runtime unless profiling proves React cannot meet the target.
- Do not add dashboard-style desktop layouts as the primary experience.

## Immediate Next Step

Start with Phase 1 and Phase 2:

1. Build the shared app motion primitives.
2. Create a bottom sheet system.
3. Replace mock property feed/detail/reservation flows with live Worker data.
4. Polish the tenant path until it feels like a native housing app.

