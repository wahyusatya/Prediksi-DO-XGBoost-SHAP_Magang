---
name: Siprido EIS Design System
description: Institutional intelligence and decision-support design system for university leadership
colors:
  primary: "#1e40af"
  primary-deep: "#0f172a"
  accent: "#3b82f6"
  neutral-bg: "#f8fafc"
  neutral-card: "#ffffff"
  neutral-border: "#e2e8f0"
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

Siprido EIS is an executive command intelligence interface designed specifically for university leadership (Rector, Vice Rectors I, II, III, Deans, Program Directors, and Academic Advisors). It eschews generic flat SaaS tropes in favor of authoritative academic rigor, high contrast clarity, and institutional prestige.

The visual system prioritizes instant scanability: executives can assess the overall dropout risk distribution within seconds, drill down into systemic drivers across three core governance pillars (Academic, Financial, Discipline), and execute targeted prescriptive interventions.

**Key Characteristics:**
- **Authoritative & Institutional:** Oxford Navy, Slate neutrals, and precise semantic indicators provide gravitas and clarity.
- **Explainable & Actionable:** Every predictive metric is paired with transparent SHAP feature attribution and structural authority mapping (WR I, WR II, WR III).
- **Executive Triage:** Rapid 1-click risk tabs (Semua, Tinggi, Sedang, Rendah), multi-field searching, and clean dossier pop-ups enable swift administrative action.

## Colors

The palette is restrained, purposeful, and semantically rigorous. Saturated tones are reserved strictly for risk classification, governance pillars, and active interactive controls.

### Primary
- **Deep Oxford Navy** (`#0f172a`): Used for brand authority, key typography, and primary executive actions.
- **Academic Royal Blue** (`#1e40af`): Used for primary interactive cues, system status badges, and academic intelligence accents.

### Secondary
- **Pillar Academic Blue** (`#1d4ed8`): Mapped to WR I and Deans for academic factors (IPS, Delta IPS, Cekal UAS).
- **Pillar Financial Amber** (`#d97706`): Mapped to WR II and BAAK for financial & regional factors (UKT, Origin).
- **Pillar Discipline Teal** (`#0f766e`): Mapped to WR III and DPA for student engagement & attendance factors.

### Neutral
- **Canvas Slate** (`#f8fafc`): Warm off-white background providing comfortable viewing during prolonged leadership meetings.
- **Card Surface** (`#ffffff`): Pure white containers with crisp borders (`#e2e8f0`) and subtle elevation.
- **Text Hierarchy**: Slate 900 (`#0f172a`) for titles, Slate 700 (`#334155`) for secondary labels, Slate 500 (`#64748b`) for auxiliary timestamps.

### Named Rules
**The Tri-Pillar Attribution Rule.** Every risk driver and prescriptive intervention must strictly map to one of the 3 university governance pillars (Akademik, Finansial & Wilayah, Kedisiplinan & Keaktifan) to ensure structural clarity.

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

Surfaces rely on tonal layering and crisp borders (`border-slate-200/80`) rather than heavy blurred drop shadows.

### Shadow Vocabulary
- **Card Ambient** (`shadow-xs` / `shadow-sm`): Subtle ambient elevation for resting cards.
- **Modal Deep** (`shadow-2xl`): High-elevation layer for the student analysis dossier pop-up.

## Shapes

- **Card Containers:** Rounded 16px - 24px (`rounded-2xl` to `rounded-3xl`) for contemporary institutional feel.
- **Buttons & Form Controls:** Rounded 10px - 12px (`rounded-xl`).
- **Status Pills & Chips:** Fully rounded (`rounded-full`).

## Components

### Buttons
- **Primary Executive:** Solid Slate 900 with white text, 8px 16px padding.
- **Action / Detail:** White card button with blue text, fine border (`border-slate-200`), and subtle hover background.

### Risk Gauge & Badges
- **Circular Risk Gauge:** Animated SVG circle with color-coded stroke arc and centered bold percentage.
- **Risk Badges:** Fully rounded pills with color-matched indicator dots.

### Data Table
- **Zebra & Hover:** Clean row separators with subtle blue-tinted hover elevation.
- **Multi-Triage Tabs:** 1-click risk filter pills (Semua, Tinggi, Sedang, Rendah) with active status indicators.

## Do's and Don'ts

### Do:
- **Do** map every recommendation directly to responsible university authorities (WR I, WR II, WR III, DPA).
- **Do** use tabular figures for numeric metrics, IPK/IPS scores, and percentages.
- **Do** preserve 100% backend API compatibility and dynamic IP resolving.

### Don't:
- **Don't** use generic vibrant AI gradients on institutional dashboards.
- **Don't** place washed-out gray text over colored pill backgrounds.
- **Don't** clutter executive screens with unnecessary decorative widgets.\n