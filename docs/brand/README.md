# Thermal Trace — brand

One name, one mark, one palette, used the same way in the dashboard
(`frontend/`), the landing page (`landing/`), the pitch deck (`docs/deck/`) and
the docs. The colour and type rules come from [DESIGN.md](../../DESIGN.md);
this page covers the name, the logo and the voice.

## Name

| Use | Write |
|---|---|
| Product name | **Thermal Trace** (two words, title case) |
| Code identifiers, handles | `ThermalTrace` |
| Descriptor | AI cold-chain management · food-loss prevention |
| Lockup subline | COLD-CHAIN DECISION SYSTEM |
| Headline | Know what a failing fridge is costing before the gate does. |
| One sentence | A condition-aware cold-chain decision system: it watches food in transit, measures how much safe life a failure has cost, and chooses the action that loses the least of it. |

Never "TT", "Thermal-Trace" or "THERMALTRACE" in running text. Uppercase
"THERMAL TRACE" appears only in tracked UI labels (topbars, slide footers).

## Logo

The mark is a six-armed snowflake in Signal Cyan on a Tactical Slate tile. The
glyph is fixed: do not redraw, rotate, recolour or add effects to it.

| File | Use |
|---|---|
| [`mark-dark.svg`](mark-dark.svg) | Favicons and dark surfaces. Identical to `frontend/public/favicon.svg` and `landing/public/favicon.svg`. |
| [`mark-light.svg`](mark-light.svg) | Light surfaces (white tile, deep-cyan glyph). |
| [`mark-mono.svg`](mark-mono.svg) | One-colour contexts; the glyph takes `currentColor`. |
| [`lockup-dark.svg`](lockup-dark.svg) / [`.png`](lockup-dark.png) | Mark + wordmark on dark. |
| [`lockup-light.svg`](lockup-light.svg) / [`.png`](lockup-light.png) | Mark + wordmark on light. |

The SVG lockups set the wordmark in IBM Plex Sans and need that font loaded;
use the PNGs (rendered at 3×) where fonts are not available, such as GitHub
READMEs. Keep clear space of half the mark's height on every side. Smallest
size: 16 px for the mark, 120 px wide for the lockup.

In React, the dashboard draws the mark with `BrandMark`
(`frontend/src/components/layout/BrandMark.tsx`) and the landing page with its
own `Logo` component (`landing/src/components/Logo.tsx`). The two copies are
kept identical by hand, because the landing page imports nothing from `frontend/`.

## Colour

From DESIGN.md: Tactical Slate `#0c1825`, Operational Navy `#162338`, Command
Blue `#1e3048`, Signal Cyan `#00c8e0`, Arctic Haze `#c9d6e8`, Slate Blue
`#8fa8c8`. Risk colours (`#22d4b0`, `#fbbf24`, `#fb923c`, `#f87171`) mean risk
state and nothing else. Cyan marks interaction, live state and the brand mark.

## Type

IBM Plex Sans for words; IBM Plex Mono for every number, timestamp and code.
Load Plex Mono with its 600 weight so bold numbers are real bold, not
browser-synthesised.

## Provenance tags

Every displayed value carries one: **MEASURED**, **CALCULATED**, **PREDICTED**,
**OPTIMIZED**, **AI-EXPLAINED**, **SYNTHETIC**. Material outside the product
(deck, landing page) may also use **CITED**, **SIMULATED** and
**ILLUSTRATIVE**. Synthetic or illustrative figures are never shown as measured.

## Voice

Plain, specific and calm. Short declarative sentences; one number per claim,
with its source. The language model *explains*; it never "decides" or
"predicts" numbers. Say "prototype model", never "certified".
