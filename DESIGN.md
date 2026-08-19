---
name: Siprido EIS Design System
description: Institutional intelligence and decision-support design system for university leadership
colors:
  primary: "#1e40af"
  primary-deep: "#0f172a"
  accent: "#3b82f6"
  neutral-bg: "#f8fafc"
  neutral-bg-dark: "#090d16"
  neutral-card: "#ffffff"
  neutral-card-dark: "#0f172a"
  neutral-border: "#e2e8f0"
  neutral-border-dark: "#1e293b"
  risk-high: "#ef4444"
  risk-medium: "#f59e0b"
  risk-low: "#10b981"
  pillar-academic: "#1d4ed8"
  pillar-financial: "#d97706"
  pillar-discipline: "#0f766e"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.025em"
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary-deep}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-action:
    backgroundColor: "#ffffff"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
---

# Design System: Siprido EIS

## Overview

**Creative North Star: "The Academic Intelligence Control Tower"**

Siprido EIS is an executive command intelligence interface designed specifically for university leadership (Rector, Vice Rectors I, II, III, Deans, Program Directors, and Academic Advisors). It delivers institutional prestige, crystal-clear decision metrics, and native **Light / Dark Mode** theme adaptability with anti-FOUC state persistence.

The visual system prioritizes instant scanability: executives can assess the overall dropout risk distribution within seconds, drill down into systemic drivers across three core governance pillars (Academic, Financial, Discipline), and execute targeted prescriptive interventions.

**Key Characteristics:**
- **Authoritative & Dual-Theme:** High-contrast Oxford Navy/Canvas Slate in Light Mode and Midnight Obsidian (`#090d16` / `#0f172a`) in Dark Mode.
- **Explainable & Actionable:** Every predictive metric is paired with transparent SHAP feature attribution and structural authority mapping (WR I, WR II, WR III).
- **Executive Triage:** Rapid 1-click risk tabs (Semua, Tinggi, Sedang, Rendah), multi-field searching, and clean detail pop-ups enable swift administrative action.
- **Accessible & Clear Copy:** Straightforward, universally understood labels ("Detail Analisis Risiko & Rekomendasi Intervensi", "Tutup", "Salin Catatan DPA").

## Colors

The palette is restrained, purposeful, and semantically rigorous across both Light and Dark modes.

### Primary
- **Deep Oxford Navy** (`#0f172a` light / `#090d16` dark): Used for brand authority, key typography, and canvas grounding.
- **Academic Royal Blue** (`#1e40af` light / `#3b82f6` dark): Used for primary interactive cues, system status badges, and intelligence accents.

### Secondary (Governance Pillars)
- **Pilar Akademik Blue** (`#1d4ed8` / `#3b82f6`): Mapped to WR I and Deans for academic factors (IPS, Delta IPS, Cekal UAS).
- **Pillar Finansial Amber** (`#d97706` / `#f59e0b`): Mapped to WR II and BAAK for financial & regional factors (UKT, Origin).
- **Pillar Kedisiplinan Teal** (`#0f766e` / `#14b8a6`): Mapped to WR III and DPA for student engagement & attendance factors.

### Neutral
- **Canvas Slate**: `#f8fafc` in Light mode, `#090d16` in Dark mode.
- **Card Surface**: `#ffffff` in Light mode, `#0f172a` in Dark mode with crisp borders (`#e2e8f0` / `#1e293b`).
- **Text Hierarchy**: Light (`#0f172a` / `#334155` / `#64748b`), Dark (`#f8fafc` / `#cbd5e1` / `#94a3b8`).

### Named Rules
**The Tri-Pillar Attribution Rule.** Every risk driver and prescriptive intervention must strictly map to one of the 3 university governance pillars (Akademik, Finansial & Wilayah, Kedisiplinan & Keaktifan) to ensure structural clarity.  
**The Theme Continuity Rule.** Dark mode colors must never invert blindly; cards and backgrounds transition to obsidian slates while semantic risk hues (Emerald, Amber, Crimson) preserve their high-contrast luminance for effortless reading.

## Typography

**Font Family:** Geist Sans with fallback to system UI sans-serif.  
**Monospace / Tabular:** Geist Mono for NIMs, GPA/IPS scores, percentages, and timestamps.

### Hierarchy
- **Display** (800 font-weight, 1.875rem, line-height 1.2): Executive summary title.
- **Headline** (700 font-weight, 1.125rem - 1.25rem, line-height 1.3): Card and section headers.
- **Body** (400 - 500 font-weight, 0.8125rem - 0.875rem, line-height 1.5): Table data rows, description paragraphs, and intervention action copy.
- **Label** (600 - 700 font-weight, 0.6875rem - 0.75rem, tracking 0.025em): Status pills, priority tags, and metadata headers.

## Layout

- **Container:** Max width 1280px (`max-w-7xl`) centered with responsive gutter padding (`px-4 sm:px-6 lg:px-8`).
- **Spatial Rhythm:** Generous 24px-32px section gaps with unified 16px-24px internal card padding.
- **Responsive Stacking:** Desktop multi-column grid seamlessly collapses to single column on tablets and mobile screens.

## Elevation & Depth

Surfaces rely on tonal layering and crisp borders (`border-slate-200/80` / `dark:border-slate-800`) rather than heavy blurred drop shadows.

### Shadow Vocabulary
- **Card Ambient** (`shadow-xs`): Subtle ambient elevation for resting cards.
- **Modal Deep** (`shadow-2xl`): High-elevation layer with backdrop blur for the student detail pop-up.

## Shapes

- **Card Containers:** Rounded 16px - 24px (`rounded-2xl` to `rounded-3xl`) for contemporary institutional feel.
- **Buttons & Form Controls:** Rounded 10px - 12px (`rounded-xl`).
- **Status Pills & Chips:** Fully rounded (`rounded-full`).

## Components

### Buttons & Theme Switcher
- **Theme Toggle:** Sun / Moon animated toggle in header with instant transition and localStorage persistence.
- **Primary Executive:** Solid Slate 900 (light) / Slate 800 with border (dark) with white text.
- **Action / Detail:** Card button with blue text, fine border, and subtle hover tint.

### Executive Combobox & Filters
- **Faculty Intelligence Combobox:** Custom floating popover menu with building icons, faculty abbreviation badges, real-time student counts, embedded high-risk alerts (`X Berisiko`), search filtering, and 1-click reset trigger.
- **Accessibility & Dismissal:** Full support for `Escape` key, click-outside dismissal, and ARIA `listbox` attributes.

### Risk Gauge & Badges
- **Circular Risk Gauge:** Animated SVG circle with color-coded stroke arc, dark-aware track, and centered bold percentage.
- **Risk Badges:** Fully rounded pills with color-matched indicator dots.

### Data Table
- **Zebra & Hover:** Clean row separators with subtle blue-tinted hover elevation.
- **Multi-Triage Tabs:** 1-click risk filter pills (Semua, Tinggi, Sedang, Rendah) with real-time student count badges.

## Do's and Don'ts

### Do:
- **Do** support both Light and Dark modes with automatic OS detection and user override.
- **Do** map every recommendation directly to responsible university authorities (WR I, WR II, WR III, DPA).
- **Do** use simple, intuitive Indonesian terminology ("Detail", "Tutup", "Salin Catatan DPA").
- **Do** preserve 100% backend API compatibility and dynamic IP resolving.

### Don't:
- **Don't** use obscure jargon like "Dossier" when "Detail" is clearer for university administrators.
- **Don't** use generic vibrant AI gradients on institutional dashboards.
- **Don't** allow white flash on dark-mode reload (anti-FOUC script required in head).
