# iOS App Theme & Light/Dark Mode — Setup Guide

## 1. Theme Architecture (CSS Custom Properties)

Create a token system so **every color** is a CSS var — zero hardcoded colors in components.

### `src/styles/_tokens.scss`
```scss
$canvas: var(--color-canvas);
$surface: var(--color-surface);
$surface-alt: var(--color-surface-alt);
$ink: var(--color-ink);
$ink-soft: var(--color-ink-soft);
$ink-faint: var(--color-ink-faint);
$line: var(--color-line);

$accent: var(--color-accent);
$accent-dark: var(--color-accent-dark);
$accent-soft: var(--color-accent-soft);

$verified: var(--color-verified);
$verified-soft: var(--color-verified-soft);

$trust: var(--color-trust);
$trust-soft: var(--color-trust-soft);

$warn: var(--color-warn);
$warn-soft: var(--color-warn-soft);

$danger: var(--color-danger);
$danger-soft: var(--color-danger-soft);

$on-accent: var(--color-on-accent);
$scrim: var(--color-scrim);

$shadow-sm: var(--shadow-sm);
$shadow-md: var(--shadow-md);
$shadow-lg: var(--shadow-lg);

$font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
  "Inter", "Segoe UI", system-ui, sans-serif;
$font-mono: "SF Mono", "JetBrains Mono", ui-monospace, Menlo, monospace;

$radius-xs: 6px;
$radius-sm: 8px;
$radius-md: 12px;
$radius-lg: 16px;
$radius-xl: 20px;
```

### `src/styles/global.scss`
```scss
// DARK MODE (default)
:root, [data-theme="dark"] {
  color-scheme: dark;
  --color-on-accent: #ffffff;
  --color-scrim: rgba(0, 0, 0, 0.5);
  --color-canvas: #0a0a0c;
  --color-surface: #141416;
  --color-surface-alt: #1a1a1e;
  --color-ink: #f0efed;
  --color-ink-soft: #9b9892;
  --color-ink-faint: #63615c;
  --color-line: #232326;
  --color-accent: #3b82f6;
  --color-accent-dark: #2563eb;
  --color-accent-soft: color-mix(in srgb, #3b82f6 15%, transparent);
  --color-verified: #4ade80;
  --color-verified-soft: color-mix(in srgb, #4ade80 12%, transparent);
  --color-trust: #38bdf8;
  --color-trust-soft: color-mix(in srgb, #38bdf8 12%, transparent);
  --color-warn: #facc15;
  --color-warn-soft: color-mix(in srgb, #facc15 12%, transparent);
  --color-danger: #f87171;
  --color-danger-soft: color-mix(in srgb, #f87171 12%, transparent);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.25);
  --shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.2);
}

// LIGHT MODE — Apple iOS palette
[data-theme="light"] {
  color-scheme: light;
  --color-on-accent: #ffffff;
  --color-scrim: rgba(0, 0, 0, 0.3);
  --color-canvas: #f2f2f7;
  --color-surface: #ffffff;
  --color-surface-alt: #f2f2f7;
  --color-ink: #1c1c1e;
  --color-ink-soft: #6d6d72;
  --color-ink-faint: #8e8e93;
  --color-line: #d1d1d6;
  --color-accent: #007aff;
  --color-accent-dark: #0062cc;
  --color-accent-soft: color-mix(in srgb, #007aff 12%, transparent);
  --color-verified: #34c759;
  --color-verified-soft: color-mix(in srgb, #34c759 12%, transparent);
  --color-trust: #007aff;
  --color-trust-soft: color-mix(in srgb, #007aff 12%, transparent);
  --color-warn: #ff9f0a;
  --color-warn-soft: color-mix(in srgb, #ff9f0a 12%, transparent);
  --color-danger: #ff3b30;
  --color-danger-soft: color-mix(in srgb, #ff3b30 12%, transparent);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.06);
}
```

---

## 2. Theme Provider

### `src/lib/theme/ThemeProvider.tsx`
```tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const THEME_KEY = "app_theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

export function initializeTheme(): void {
  applyTheme(readInitialMode());
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readInitialMode);

  useEffect(() => {
    applyTheme(mode);
    window.localStorage.setItem(THEME_KEY, mode);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      isDark: mode === "dark",
      setMode: setModeState,
      toggleMode: () => setModeState((current) => (current === "dark" ? "light" : "dark")),
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}
```

Call `initializeTheme()` in `main.tsx` **before** `ReactDOM.createRoot()` to prevent flash:
```tsx
import { initializeTheme } from "@/lib/theme/ThemeProvider";
initializeTheme();
```

Wrap your app:
```tsx
<ThemeProvider>
  <App />
</ThemeProvider>
```

---

## 3. Card Elevation Mixins

### `src/styles/_mixins.scss`
```scss
@use "tokens" as *;

@mixin card {
  background: $surface;
  border-radius: $radius-md;
  box-shadow: $shadow-sm;
}

@mixin card-elevated {
  background: $surface;
  border-radius: $radius-xl;
  box-shadow: $shadow-md;
}

@mixin btn-primary {
  display: block;
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: $radius-md;
  background: $accent;
  color: $on-accent;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

@mixin btn-ghost {
  display: block;
  width: 100%;
  padding: 14px 20px;
  border: 0;
  border-radius: $radius-md;
  background: transparent;
  color: $accent;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
}

@mixin input-field {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1px solid $line;
  border-radius: $radius-md;
  background: $surface;
  color: $ink;
  font-size: 15px;
  font-family: inherit;
  transition: border-color 0.15s;
}

@mixin pill($bg, $fg) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: $bg;
  color: $fg;
  font-size: 12px;
  font-weight: 500;
}
```

### Card Component
```scss
// Card.module.scss
@use "../../styles/tokens" as *;
@use "../../styles/mixins" as *;

.card {
  @include card-elevated;
}
```

**Never use borders on cards.** Use `box-shadow` instead — borders look cheap, shadows look elevated/iOS-native.

---

## 4. iOS Tab Bar

### Tab Bar Module SCSS
```scss
.nav {
  display: flex;
  align-items: center;
  width: 100%;
  height: 50px;
  padding-bottom: env(safe-area-inset-bottom, 0);
  background: color-mix(in srgb, $surface 78%, transparent);
  backdrop-filter: blur(30px) saturate(1.4);
  -webkit-backdrop-filter: blur(30px) saturate(1.4);
  border-top: 0.5px solid color-mix(in srgb, $line 50%, transparent);
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  flex: 1;
  height: 100%;
  color: $ink-faint;
  transition: color 0.2s ease-out;

  &.active {
    color: $accent;
  }
}

.label {
  font-size: 10px;
  font-weight: 500;
  line-height: 1;
}
```

### Tab Bar Container (global.scss)
```scss
.mobile-nav {
  display: none;
  flex-shrink: 0;
  width: 100%;

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column; // needed so child fills full width
  }
}
```

---

## 5. Safe Areas

### Scroll Container (global.scss)
```scss
.scroll-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;

  @media (max-width: 768px) {
    padding-top: env(safe-area-inset-top, 0);
  }

  @media (min-width: 769px) {
    padding: 24px 32px;
  }
}
```

### Page wrapper (fill full height so short pages don't leave blank space)
```scss
.page-fade-in {
  flex: 1;
}

.page-inner {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.page-content {
  flex: 1;
  padding: 0 16px 16px;

  @media (min-width: 769px) {
    padding: 0;
  }
}
```

---

## 6. iOS Large Title Header

### HTML pattern (in each page)
```tsx
<div className={["page-content", styles.page].join(" ")}>
  <div className="page-header">
    <h1>Page Title</h1>
    {subtitle && <p>Subtitle</p>}
  </div>
  {/* page content */}
</div>
```

### SCSS (global.scss)
```scss
.page-header {
  padding: 8px 16px 2px;

  @media (min-width: 769px) {
    padding: 0 0 16px;
  }
}

.page-header h1 {
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1.1;
  color: $ink;
}

.page-header p {
  font-size: 15px;
  color: $ink-soft;
  margin-top: 2px;
}
```

---

## 7. iOS Back Button (for sub-pages)

### SubPageHeader Component

```tsx
export function SubPageHeader({ title, subtitle, backHref = "/" }) {
  return (
    <div className={styles.header}>
      <Link to={backHref} className={styles.back} aria-label="Back">
        <ChevronLeft size={22} strokeWidth={2.5} />
      </Link>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}
```

### SCSS
```scss
.header {
  padding: 0 16px 4px;
}

.back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-left: -8px;
  color: $accent;
}
```

---

## 8. Appearance Toggle (Dark/Light Switch)

```tsx
function AppearanceToggle() {
  const { isDark, toggleMode } = useTheme();
  const Icon = isDark ? Moon : Sun;

  return (
    <button type="button" onClick={toggleMode} className={styles.appearanceItem}>
      <div className={styles.itemIcon}>
        <Icon size={16} strokeWidth={1.75} />
      </div>
      <span className={styles.itemLabel}>Appearance</span>
      <span className={styles.itemValue}>{isDark ? "Dark" : "Light"}</span>
      <span className={styles.themeSwitch} aria-hidden="true">
        <span className={styles.themeThumb}>
          {isDark ? <Moon size={12} /> : <Sun size={12} />}
        </span>
      </span>
    </button>
  );
}
```

### SCSS
```scss
.themeSwitch {
  position: relative;
  display: inline-flex;
  width: 52px;
  height: 32px;
  flex: 0 0 auto;
  align-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, $ink 13%, $canvas);
}

.themeThumb {
  display: inline-flex;
  width: 28px;
  height: 28px;
  margin-left: 2px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: $surface;
  color: $accent;
  box-shadow: $shadow-sm;
  transition: transform 0.24s cubic-bezier(0.34, 1.4, 0.64, 1);
}

// Dark mode — slide thumb right
:global(:root[data-theme="dark"]) .themeSwitch {
  background: linear-gradient(135deg, $accent, $trust);
}

:global(:root[data-theme="dark"]) .themeThumb {
  transform: translateX(20px);
}
```

---

## 9. Rules to Follow

- **Zero hardcoded colors** in TSX/component files. Always use SCSS tokens.
- **Zero `rgba(0,0,0,..)` opaque values** — use `color-mix(in srgb, $ink X%, transparent)` or `$scrim` for overlays.
- **Cards use shadows, not borders** — `box-shadow: $shadow-md` with `$radius-xl`.
- **Safe areas** — always use `env(safe-area-inset-top/bottom)`.
- **iOS tab bar** is 50px, translucent blur, edge-to-edge via `flex-direction: column` on parent.
- **No `position: fixed` on tab bar** — use flex layout so it flows naturally.
- **Body has `user-select: none`** and `-webkit-tap-highlight-color: transparent`.
- **Sidebar hidden on mobile** (`max-width: 768px`).
- **Page content fills full height** with flex: 1 chain to prevent blank spaces.

## 10. Color Palette Reference

| Role | Dark Hex | Light Hex |
|------|----------|-----------|
| Canvas (body bg) | #0a0a0c | #f2f2f7 |
| Surface (cards) | #141416 | #ffffff |
| Surface Alt | #1a1a1e | #f2f2f7 |
| Primary Text | #f0efed | #1c1c1e |
| Secondary Text | #9b9892 | #6d6d72 |
| Tertiary Text | #63615c | #8e8e93 |
| Dividers | #232326 | #d1d1d6 |
| Accent | #3b82f6 | #007aff |
| Success | #4ade80 | #34c759 |
| Warning | #facc15 | #ff9f0a |
| Error | #f87171 | #ff3b30 |
