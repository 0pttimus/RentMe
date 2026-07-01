/**
 * ─────────────────────────────────────────────
 *  RentMe iOS Framework — Apple-standard UI kit
 * ─────────────────────────────────────────────
 *
 * Drop these SCSS files + component patterns into any React app
 * (rental, ecommerce, social, SaaS) to get an Apple-native look.
 *
 * Files you need (from src/styles/):
 *   _tokens.scss    → semantic color/typography/shape variables
 *   _mixins.scss    → reusable UI mixins
 *   global.scss     → reset, theme, layout, safe areas, animations
 *
 * Files you need (from src/lib/theme/):
 *   ThemeProvider.tsx → dark/light toggle with localStorage persistence
 *
 * ─────────────────────────────────────────────
 *  HOW IT WORKS
 * ─────────────────────────────────────────────
 *
 *  1. THEME TOKENS
 *     All colors are CSS custom properties mapped through SCSS vars.
 *     Two themes: "dark" (near-black canvas) and "light" (iOS neutral).
 *     One source of truth — every component uses $tokens, never hardcoded colors.
 *
 *  2. SEMANTIC COLOR SYSTEM
 *     canvas       → page background (#0a0a0c dark / #F2F2F7 light)
 *     surface      → card backgrounds (#141416 dark / #FFF light)
 *     surface-alt  → secondary surfaces, input bg
 *     ink          → primary text
 *     ink-soft     → secondary text
 *     ink-faint    → tertiary text, placeholders
 *     line         → borders, dividers
 *     accent       → primary action (#3b82f6 / #007AFF)
 *     verified     → success/green
 *     danger       → destructive/red
 *     warn         → warning/amber
 *     trust        → info/sky
 *     Each semantic color has a -soft variant (12% opacity bg).
 *
 *  3. THEME ENGINE
 *     initializeTheme() is called BEFORE ReactDOM.createRoot() to
 *     prevent flash of unstyled content. Sets data-theme on <html>.
 *     Theme persisted in localStorage. ThemeProvider wraps app for
 *     runtime switching via useTheme().toggleMode().
 *
 *  4. LAYOUT
 *     .app-shell       → flex row (sidebar | main-area)
 *     .main-area       → flex column (scroll-area | mobile-nav)
 *     .scroll-area     → overflow-y scroll with safe-area padding
 *     .page-fade-in    → fade+slide animation on route change
 *     .page-content    → inner page padding
 *     All heights: 100% chain from html → #root → app-shell.
 *     No blank space — every ancestor fills viewport.
 *
 *  5. SAFE AREAS
 *     env(safe-area-inset-top)    → scroll-area mobile padding
 *     env(safe-area-inset-bottom) → bottom nav extra padding
 *
 *  6. CARDS
 *     No borders — only shadows and border-radius.
 *     Standard card:   $radius-md + $shadow-sm
 *     Elevated card:   $radius-xl + $shadow-md
 *     Mixins: @include card; / @include card-elevated;
 *
 *  7. SHADOWS (Apple-like)
 *     Dark:  black shadows with low opacity
 *     Light: very subtle gray shadows (iOS-style)
 *
 *  8. TYPOGRAPHY
 *     System font stack: SF Pro → Inter → system-ui
 *     Large titles: 34px, -0.5px letter-spacing
 *     Body: 14-15px
 *     Labels: 10-13px
 *     Monospace: SF Mono / JetBrains Mono
 *
 *  9. BOTTOM TAB NAV (mobile ≤768px)
 *     50px height, frosted glass (backdrop-filter blur),
 *     0.5px top border, safe-area-bottom padding.
 *     Icon + label per tab.
 *
 * 10. SIDEBAR NAV (desktop ≥769px)
 *     220px width, hidden on mobile.
 *     Logo, nav links with active state, profile footer.
 *
 * 11. INTERACTIONS
 *     tap-scale:  scale(0.97) spring animation on :active
 *     page-in:    opacity + translateY(10px) → 0
 *     stagger-in: children animate in sequence (page loads)
 *     button opacity transitions: 0.85 hover, 0.7 active
 *
 * 12. PILLS / BADGES
 *     Fully rounded (999px), small font, colored bg+fg pairs.
 *     Mixin: @include pill($bg, $fg);
 *
 * 13. INPUTS
 *     44px height, rounded, focus ring via box-shadow (not outline).
 *
 * 14. RADIUS SYSTEM
 *     xs: 6px   (small elements)
 *     sm: 8px   (buttons, inputs)
 *     md: 12px  (cards, modals)
 *     lg: 16px  (larger containers)
 *     xl: 20px  (elevated cards, sheets)
 *
 * 15. MISC
 *     -webkit-font-smoothing: antialiased
 *     -webkit-tap-highlight-color: transparent
 *     user-select: none (app-wide, enable on inputs)
 *     text-rendering: optimizeLegibility
 *     img: -webkit-user-drag: none
 */

/* ─── IMPLEMENTATION: _tokens.scss ───────────────────────────────

  $canvas:          var(--color-canvas);
  $surface:         var(--color-surface);
  $surface-alt:     var(--color-surface-alt);
  $ink:             var(--color-ink);
  $ink-soft:        var(--color-ink-soft);
  $ink-faint:       var(--color-ink-faint);
  $line:            var(--color-line);
  $accent:          var(--color-accent);
  $accent-dark:     var(--color-accent-dark);
  $accent-soft:     var(--color-accent-soft);
  $verified:        var(--color-verified);
  $verified-soft:   var(--color-verified-soft);
  $trust:           var(--color-trust);
  $trust-soft:      var(--color-trust-soft);
  $warn:            var(--color-warn);
  $warn-soft:       var(--color-warn-soft);
  $danger:          var(--color-danger);
  $danger-soft:     var(--color-danger-soft);
  $on-accent:       var(--color-on-accent);
  $scrim:           var(--color-scrim);
  $shadow-sm:       var(--shadow-sm);
  $shadow-md:       var(--shadow-md);
  $shadow-lg:       var(--shadow-lg);
  $font-sans:       -apple-system, BlinkMacSystemFont, "SF Pro Text", ...;
  $font-mono:       "SF Mono", "JetBrains Mono", ...;
  $radius-xs:       6px;
  $radius-sm:       8px;
  $radius-md:       12px;
  $radius-lg:       16px;
  $radius-xl:       20px;
  $tap-scale:       0.97;
  $ease-spring:     cubic-bezier(0.34, 1.4, 0.64, 1);
  $ease-out:        cubic-bezier(0.22, 1, 0.36, 1);

*/

/* ─── USAGE EXAMPLE: app shell ────────────────────────────────────

  <div className="app-shell">
    <SidebarNav />
    <div className="main-area">
      <div className="scroll-area">
        <div key={pathname} className="page-fade-in">
          <div className="page-inner">
            <div className="page-content">
              ...your page...
            </div>
          </div>
        </div>
      </div>
      <div className="mobile-nav">
        <BottomNav />
      </div>
    </div>
  </div>

*/

/* ─── USAGE EXAMPLE: theme initialization ────────────────────────

  // main.tsx / main.jsx — BEFORE createRoot
  import { initializeTheme, ThemeProvider } from "@/lib/theme/ThemeProvider";

  initializeTheme();

  createRoot(document.getElementById("root")!).render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );

*/

/* ─── USAGE EXAMPLE: themed card ──────────────────────────────────

  @use "../styles/tokens" as *;
  @use "../styles/mixins" as *;

  .my-card {
    @include card-elevated;
    padding: 16px;
    color: $ink;
  }

  .my-button {
    @include btn-primary;
  }

  .my-pill {
    @include pill($verified-soft, $verified);
  }

*/

/* ─── USAGE EXAMPLE: page with stagger animation ─────────────────

  <div className="page-content stagger-in">
    <Card />  // animates in sequentially
    <Card />
    <Card />
  </div>

*/

/* ─── DARK THEME COLORS (data-theme="dark") ──────────────────────

  --color-canvas:       #0a0a0c
  --color-surface:      #141416
  --color-surface-alt:  #1a1a1e
  --color-ink:          #f0efed
  --color-ink-soft:     #9b9892
  --color-ink-faint:    #63615c
  --color-line:         #232326
  --color-accent:       #3b82f6
  --color-accent-dark:  #2563eb
  --color-accent-soft:  color-mix(in srgb, #3b82f6 15%, transparent)
  --color-verified:     #4ade80
  --color-danger:       #f87171
  --color-warn:         #facc15

*/

/* ─── LIGHT THEME COLORS (data-theme="light") ────────────────────

  --color-canvas:       #f2f2f7
  --color-surface:      #ffffff
  --color-surface-alt:  #f2f2f7
  --color-ink:          #1c1c1e
  --color-ink-soft:     #6d6d72
  --color-ink-faint:    #8e8e93
  --color-line:         #d1d1d6
  --color-accent:       #007aff
  --color-accent-dark:  #0062cc
  --color-accent-soft:  color-mix(in srgb, #007aff 12%, transparent)
  --color-verified:     #34c759
  --color-danger:       #ff3b30
  --color-warn:         #ff9f0a

*/

/* ─── KEY ANIMATIONS ─────────────────────────────────────────────

  @keyframes page-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes stagger-item {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  Spin (for loading spinners):
  @keyframes spin { to { transform: rotate(360deg); } }

*/

/* ─── RESPONSIVE BREAKPOINT ──────────────────────────────────────

  Mobile-first. Single breakpoint at 768px:
    ≤768px  → bottom tab nav, edge-to-edge cards, no sidebar
    ≥769px  → sidebar visible, padded content, max-width optional

*/
