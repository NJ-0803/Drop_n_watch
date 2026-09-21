# Taste refinement brief

Reference: https://github.com/Leonxlnx/taste-skill/tree/main/skills/taste-skill
The vendored SKILL.md and MIT license were retrieved on 2026-09-21.

Reading this as a preservation pass for a consumer comparison site with an existing editorial, tactile design language. Keep its custom CSS tokens and Motion interactions.

Dials: DESIGN_VARIANCE 3 (existing), MOTION_INTENSITY 5 (a restrained increase for scroll entrances), VISUAL_DENSITY 4 (existing).

The user's explicit preservation requirements override generic Taste defaults: keep every colour, font, layout, copy string, route, and 3D interaction. Do not apply the skill's palette, font, imagery, or composition replacements.

## Audit and change

The Everyday steps and result cards used mount-time entrances, so their animation often finished before scrolling brought them into view. Use a one-time IntersectionObserver entrance for below-the-fold content. Retain natural scrolling and existing tilt surfaces; add no dependencies. Apply the same reveal to the sneaker controls and footer for continuity.

- Existing identity: burgundy accent, Evening and Daylight palettes, Instrument Serif / Inter / Inter Tight / IBM Plex Mono, 22px cards, pill controls.
- Existing conversion paths: Everyday search, sneaker size plus search, retailer purchase links, saved price alerts.
- Existing 3D: TiltCard, PressButton, SneakerBanner, Shoebox and their springs are untouched.
- Mobile: 16px travel over 560ms, no stagger delay.
- Desktop: 24px travel over 680ms; only the three explanatory steps stagger by 65ms.
- Content already on screen stays visible. New reveals respect reduced motion, reveal on keyboard focus, clean up observers, and remain visible without JavaScript and when printing.

The Taste pre-flight was scoped to the authorized motion changes. Its broad redesign rules are intentionally not applied to the preserved brand or product UI.

## Validation

- Production build (including TypeScript): passed.
- ESLint: passed.
- Existing automated suite: 77 tests passed.
- Production preview: checked 390px mobile Evening/Daylight scroll reveals and 1280px desktop sneaker layout. Observed pending cards become visible on scroll, footer reveal, and shoebox open interaction; no desktop horizontal overflow.
- Confirmed no diff in the colour tokens, font setup, TiltCard, Shoebox, PressButton, SneakerBanner or shared motion springs.
- Reduced-motion, print and no-JavaScript fallbacks were reviewed in code. Browser emulation and Lighthouse metrics were not measured in this pass. Live retailer calls were not exercised.
