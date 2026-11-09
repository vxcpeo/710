# Reskin report - Sonira website

## Direction

- **Style:** Abyss Liquidity (`aave-abyss`, dark-technical), sampled live from <https://aave.com> on 2026-10-21.
- **Skeleton:** Command Rail (`command-rail`, linear), replacing the original `dashboard-shell` (shell).
- **Accent:** `#265dff` to `#ff0000` (156.7 ΔE; minimum 30).
- **Palette:** `#000000` ground, `#111a24` surface, `#182533` raised surface, `#f4f7fa` ink, `#8fa3b5` muted, `#ff0000` accent, `#ff00ff` secondary, `#1e2a36` rules.
- **Type:** Trebuchet MS display at weight 650, Segoe UI body, Cascadia Mono for numerals and micro-labels.
- **Live sampling:** 9/10 reference sites sampled successfully; Arbitrum returned 403. The style catalog fallback was not needed.

## What changed

The old light paper workspace, its 240 px labelled sidebar, top bar, card list, mint banner and flat footer were removed. The replacement is a black technical canvas with a fixed 76 px glyph rail (rotated labels, numbered glyphs), a floating blurred command bar, a full-bleed running head, an offset signal console, a two-column stage with a sticky studio margin, a dense ledger of rows, a numbered process band, a dark FAQ and a footer with a project-links navigation. All templates, the global stylesheet and the CSS token vocabulary were rewritten; the old `src/style.css` is preserved at `.reskin/legacy/style.css` but is no longer imported.

Shared components were recut to the same system:

- `src/components/MarketDetailV2.vue` - market header, stats, curve panel, activity table, proof folds and trade ticket.
- `src/components/CreatorSettings.vue` - fee recipient, tax and buyback fold.
- `src/App.vue` - player dock, toast, wallet/demo/status/terms/privacy sheets and the three-step studio.

Content contract: **intact**. 565 static text tokens, 470 bindings and 154 handlers are unchanged; the verifier reports 0 missing and 0 changed tokens. Four additive warnings are new accessibility-only links/aria labels on the mobile navigation path.

## Gates

| Gate | Result | Detail |
| --- | --- | --- |
| Source content contract | PASS | 0 blocking diffs; hash `6827e768d39932cec25a5eb5b35468b5d3a8f6cd22ac47e336de195bf52e026f` |
| Rendered content parity | PASS | `/`: desktop 430 to 430 words; mobile 402 to 419 words, all existing tokens that were hidden in the old mobile CSS |
| Skeleton / archetype | PASS | `dashboard-shell` to `marketing-stack` |
| DOM fingerprint similarity | PASS | 0.249 (max 0.50) |
| Landmark similarity | PASS | 0.667 (max 0.68) |
| CSS class overlap | PASS | 0.087 (max 0.10) |
| Accent distance | PASS | 156.7 ΔE (min 30) |
| Contrast | PASS | 0/111 desktop and 0/104 mobile failures |
| axe serious/critical | PASS | 0 |
| Horizontal overflow | PASS | none at 1440x900 or 390x844 |
| Focus visibility | PASS | visible focus sampled on 8 elements |
| Mobile navigation | PASS | drawer reachable at 390 px; 2 route links available |
| Build | PASS | `vue-tsc -b && vite build` |

Screenshots: [desktop](current/home-desktop.png) and [mobile](current/home-mobile.png). Baseline: [desktop](baseline/home-desktop.png) and [mobile](baseline/home-mobile.png). Modal checks: [studio](analysis/studio-modal.png), [demo](analysis/demo-modal.png), [mobile menu](analysis/mobile-menu.png).

## Verification verdict

`verify.mjs check` passes for the application route with a clean content contract, replaced skeleton, new palette and zero usability failures. The full-route run also captures `/docs/business-plan.pdf`; that target is a static PDF asset, not an application route, so it cannot change skeleton or expose a mobile menu. Its five route-only failures are retained in `verification-full-routes.json` and `VERIFICATION-full-routes.md`. The UI-only run, which excludes non-HTML asset paths, is the final `verification.json` and `VERIFICATION.md`. This is a verification-scope exception, not a UI claim.

## Limitations

- `/docs/business-plan.pdf` is excluded from the UI skeleton comparison as a static asset route.
- The site has one application route (`/`); all navigation is anchor-based. The hash links are not counted as route targets by the mobile-nav audit, so two screen-reader-only path links were added for keyboard/screen-reader navigation; they add no visible copy.
- No public deployment, domain registration or X account exists. Onchain publishing and trading remain unavailable while the deployment manifest is empty.
- The four demo covers keep the rebrand artwork. They are content assets and were not recoloured; the black/red direction is carried by the template layer.

> The UI was rebuilt around **Abyss Liquidity** / **Command Rail**; the original **dashboard-shell** shell and palette were removed while the content contract stayed byte-for-byte intact.
