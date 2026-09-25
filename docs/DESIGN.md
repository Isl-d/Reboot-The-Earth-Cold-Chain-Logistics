---
name: Cold-Chain Telemetry & Compliance
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006591'
  on-secondary: '#ffffff'
  secondary-container: '#39b8fd'
  on-secondary-container: '#004666'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#00201d'
  on-tertiary-container: '#0c9488'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
  telemetry-num-xl:
    fontFamily: JetBrains Mono
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.03em
  telemetry-num-md:
    fontFamily: JetBrains Mono
    fontSize: 1.125rem
    fontWeight: '500'
    lineHeight: 1.5rem
    letterSpacing: -0.02em
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
  label-ui:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

> **Superseded:** the canonical visual system for the merged app is
> [`../DESIGN.md`](../DESIGN.md) ("Strategic Ops": dark tactical slate, signal
> cyan, IBM Plex), implemented by `frontend/src/index.css`. This light-system
> document was Person 2's draft used while the intelligence screens were built
> standalone; keep it only as a record of that work.

This design system delivers an operational intelligence workspace tailored for food logistics, central cold-storage facilities, and hypermarkets across Qatar (such as Al Meera, Lulu Hypermarket, and Carrefour distribution hubs). Operating in an environment where ambient summer temperatures routinely surpass 45°C, cold-chain integrity is mission-critical. The design aesthetic balances authoritative industrial precision with calm, cognitive ease. It avoids alarmist noise while ensuring immediate legibility under high-stress incident triage.

The aesthetic blends **Modern Corporate Enterprise** with **Industrial Telemetry Utility**:
- **Clarity over ornament**: Information architecture prioritizes zero-latency state comprehension across thousands of telemetry nodes (chilled reefers, blast freezers, ambient docks, and display cases).
- **Thermal composure**: The palette leverages cool, deep slate structural surfaces paired with cryo-inspired teals and ice blues, evoking thermal control, sterile precision, and operational resilience.
- **Auditable rigor**: Distinct visual treatments separate live sensor feeds, thermodynamic physical calculations, prescriptive optimization recommendations, and QAR financial liability impacts.

## Colors

The system employs a high-contrast light mode optimized for operations centers, facility audit tablets, and bright dock environments.

### Core Brand & Structural Chrome
- **Primary Navy (`#0F172A`, `#0A192F`, `#1E293B`)**: Anchors structural headers, navigation frames, high-level metric summaries, and primary CTA buttons.
- **Cool Cold-Chain Accents (`#0EA5E9`, `#06B6D4`, `#38BDF8`, `#E0F2FE`)**: Represents active thermal control, sensor connectivity, and live telemetry signals. `#E0F2FE` provides a tint for active rows, chilled zones, and selected states.
- **Neutral Foundation (`#F8FAFC` canvas, `#FFFFFF` surface, `#E2E8F0` border, `#64748B` muted text)**: Provides a balanced backdrop that reduces eye strain during prolonged monitoring shifts.

### Telemetry Status Semantics
Each status tier is strictly paired with a container background and high-contrast text color for compliance reporting:
- **Safe / Nominal**: Base `#10B981`, Tint `#ECFDF5`, Border `#A7F3D0`, Foreground `#065F46`. Indicates safe core cargo temperature and stable compressor duty.
- **Warning / Degradation**: Base `#F59E0B`, Tint `#FFFBEB`, Border `#FDE68A`, Foreground `#92400E`. Indicates defrost cycling drift, slow door recovery, or pre-breach alerts.
- **Critical / Excursion Breach**: Base `#EF4444`, Tint `#FEF2F2`, Border `#FECACA`, Foreground `#991B1B`. Indicates cold-chain rupture, bacterial threshold risks, or compressor failure.
- **Offline / Disconnected**: Base `#64748B`, Tint `#F1F5F9`, Border `#CBD5E1`, Foreground `#334155`. Indicates missing telemetry, RF packet loss, or battery failure on sensor beacons.

### Data Provenance Badge Semantics
To maintain complete audit integrity for food safety authorities (e.g., Qatar Ministry of Public Health), every telemetry value features a provenance marker:
- **Measured (Live IoT Sensor)**: Solid `#4F46E5` badge with `#EEF2FF` fill.
- **Calculated (Algorithmic / Enthalpy)**: Solid `#7C3AED` badge with `#F5F3FF` fill.
- **Predicted (ML Model / Ambient Drift)**: Solid `#0284C7` badge with `#F0F9FF` fill.
- **Recommended (Prescriptive Control)**: Solid `#059669` badge with `#ECFDF5` fill.
- **Finance-Validated (QAR Spoilage Risk)**: Solid `#D97706` badge with `#FFFBEB` fill.

## Typography

The typographic hierarchy separates narrative administrative copy from real-time operational instrumentation.

- **Interface & Metadata (`Inter`)**: Delivers tall x-height, neutral letterforms, and high legibility across dense administrative screens, facility tree selectors, and incident escalation notes.
- **Telemetry & Numerical Metrics (`JetBrains Mono`)**: Mandated for all sensor measurements (°C, relative humidity %RH, Bar pressure), durations (time elapsed since breach, defrost timer remaining), currency exposure (`QAR 42,850.00`), asset identifiers (`REEFER-QA-084`), and facility zone IDs. Tabular spacing prevents layout jitter during streaming WebSocket updates.

## Layout & Spacing

The layout is built on a 12-column fluid grid system suited for high-density supervisory control and data acquisition (SCADA) views as well as handheld QA inspection tablets.

- **Desktop & Command Wall Displays (≥1280px)**: 12 columns with `1.5rem` gutters and fixed 64px collapsed icon rail / 260px expanded navigation drawer. Main dashboards maintain a three-tier information density: High-level site KPI summary banner, 8-column main visual spatial floor plan / real-time telemetry stream, and 4-column contextual triage & remediation panel.
- **Tablet / Ruggedized Field Terminals (768px - 1279px)**: 8 columns with `1rem` gutters and `1rem` page margins. Secondary contextual panels collapse into slide-over drawers to prioritize zone inspection tables.
- **Mobile Handheld Inspection Units (<768px)**: 4 columns with `0.75rem` gutters and `0.75rem` page margins. Multi-column telemetry grids reflow into single-column actionable incident cards with sticky primary action bars.
- **Component Density**: Standard inner padding uses `space-md` (`0.75rem`), with tight `space-xs` (`0.25rem`) padding applied inside telemetry chips and tabular cells to maintain maximum data visibility per viewport height.

## Elevation & Depth

Visual hierarchy relies on flat tonal separation and calibrated structural borders rather than heavy atmospheric shadows, ensuring crisp definition on anti-glare industrial screens.

- **Canvas Base Layer**: `#F8FAFC` acts as the structural void.
- **Surface Level 0 (Cards & Panels)**: `#FFFFFF` encased in a 1px solid border (`#E2E8F0`). No shadow in passive rest state; this maintains optical sharpness across dense tabular layouts.
- **Surface Level 1 (Elevated Interactive / Hover)**: `#FFFFFF` with a subtle slate-tinted shadow: `0 2px 4px -1px rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)` and border shift to `#CBD5E1`.
- **Surface Level 2 (Flyouts, Popovers, & Dropdown Menus)**: `#FFFFFF` with `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.03)` with border `#94A3B8`.
- **Surface Level 3 (Critical Modal Dialogues & Emergency Remediation Overlays)**: `#FFFFFF` surrounded by backdrop scrim `rgba(15, 23, 42, 0.65)` with heavy ambient diffusion: `0 20px 25px -5px rgba(15, 23, 42, 0.15)`.
- **Thermal Focus Indication**: Focused items or active monitored nodes receive an inner/outer dual halo: `0 0 0 2px #FFFFFF, 0 0 0 4px #0EA5E9`.

## Shapes

The design system enforces a soft, technical shape geometry (`roundedness: 1`). 

- Default interactive elements (inputs, select menus, standard action buttons) use `0.25rem` (4px) border radius, conveying precision, discipline, and architectural rigidity.
- Standard structural surfaces, metric cards, and chart containers use `rounded-lg` (`0.5rem` / 8px).
- Modals, large flyouts, and critical notification banners use `rounded-xl` (`0.75rem` / 12px).
- All status tags, telemetry chips, and data provenance badges strictly utilize the pill shape (`rounded-full` / 9999px) to distinguish classification metadata from rectangular interactive buttons and card containers.

## Components

### Buttons
- **Primary**: Solid Deep Navy (`#0F172A`) background with white text, `0.25rem` radius, semi-bold `Inter`. Hover state shifts to `#1E293B`; active state shifts to `#0A192F`.
- **Secondary (Telemetry Action)**: Chilled Teal/Sky tint (`#E0F2FE`) background with `#0284C7` text and `#BAE6FD` border. Used for setpoint triggers, cold-chain overrides, and sensor recalibrations.
- **Destructive / Emergency Stop**: Solid Coral Red (`#EF4444`) with white text. Triggers compressor emergency protocols or cold-room evacuation sequence warnings.

### Data Provenance Badges
- Compact pill-shaped chips with a `2px` leading indicator dot.
- Text rendered in `label-code` (`JetBrains Mono`, 11px uppercase).
- Variants include:
  * **Measured**: Leading `#4F46E5` dot, `#EEF2FF` fill, `#C7D2FE` border, `#3730A3` text.
  * **Calculated**: Leading `#7C3AED` dot, `#F5F3FF` fill, `#DDD6FE` border, `#5B21B6` text.
  * **Predicted**: Leading `#0284C7` dot, `#F0F9FF` fill, `#BAE6FD` border, `#075985` text.
  * **Recommended**: Leading `#059669` dot, `#ECFDF5` fill, `#A7F3D0` border, `#065F46` text.
  * **Finance-Validated**: Leading `#D97706` dot, `#FFFBEB` fill, `#FDE68A` border, `#92400E` text.

### Telemetry Value Display Cards
- Crisp white surface with `#E2E8F0` border.
- Header row with zone identifier (`body-sm`), provenance pill, and RF battery indicator.
- Metric center: Tabular large display (`telemetry-num-xl`), e.g., `-18.4°C`, paired with a micro trend sparkline indicating past 12-hour thermal drift against Qatar external ambient baselines (42°C+).
- Footer row: Safe threshold window indicator (`-22°C to -16°C`) and QAR financial liability at risk (`JetBrains Mono`, warning amber or neutral slate).

### Grid Data Tables
- Header: `#F8FAFC` background, uppercase tracking in `label-ui` with subtle bottom border (`#CBD5E1`).
- Rows: High-density padding (`0.5rem 0.75rem`), with alternate row zebra striping optional for large cold-room lists.
- Cells: Text aligned left; all metrics, temperatures, QAR currencies, and durations aligned strictly to the right using `JetBrains Mono`.
- Row status border: 3px solid left-edge border indicating current telemetry health (Emerald, Amber, Red, or Slate).

### Form Inputs & Controls
- Input fields use `#FFFFFF` background with 1px border (`#CBD5E1`), transitioning to `#0EA5E9` outline on focus.
- Monospaced inputs for temperature thresholds and setpoint parameters, complete with fixed trailing unit affordances (`°C`, `%RH`, `min`, `QAR`).