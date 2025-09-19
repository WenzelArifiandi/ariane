Figma Starter — M3 Expressive + Liquid Glass
===========================================

Use this to bootstrap a Figma file and keep it in sync with code.

What’s here
- tokens.figmatokens.json — Tokens Studio format with light/dark, brand color, surface/ink, radius, spacing, elevation.
- Mirrors site/src/styles/tokens.css.

How to import to Figma (Tokens Studio)
1) Install the “Tokens Studio for Figma” plugin.
2) Open a new Figma file. Run the plugin.
3) In Tokens Studio: File → Import → JSON → pick tokens.figmatokens.json.
4) Create two Themes: Light and Dark (already embedded in the JSON). Enable both.
5) Sync variables: Click “Push to Figma” to create Figma Variables from tokens.

File structure to create in Figma
- Pages
  - 01 Foundations (Color, Type, Radius, Elevation, Motion)
  - 02 Components (Button, Text Field, Card, App Bar, Liquid Glass)
  - 03 Patterns (Access Request, Hero, Nav)
  - 04 Screens (Home, Access Flow)

Components to build
- Button (Filled/Tonal) — states: default, hover, pressed, disabled
- Text Field (Outlined) — states: default, focus, error
- Card (Expressive) — elevated with radius 28px
- Top App Bar — expressive sizing
- Liquid Glass container — backdrop blur + gradient tint + highlight overlay

Liquid Glass spec (quick)
- Backdrop blur: 22px; Saturation: 140%
- Border radius: 28px
- Border: 1px solid neutral ink @ 10% opacity
- Background: subtle vertical gradient mixing page surface with white/black
- Overlays: soft radial highlight (soft‑light), optional fine noise at 6% opacity

Sync back to code
- After updating tokens in Figma, export JSON from Tokens Studio and replace tokens.figmatokens.json.
- Mirror key values into site/src/styles/tokens.css (or automate via Style Dictionary later).

