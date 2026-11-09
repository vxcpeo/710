# Reskin verification — PASS

Generated: 2026-10-21T17:54:10.200Z

- Project: **sonira-website**
- URL: http://127.0.0.1:4317/
- Original skeleton: `dashboard-shell` (shell)
- New skeleton: `marketing-stack` (editorial)
- Accent: #265dff -> #ff0000 (156.74 ΔE; min 30)
- Source contract: intact (`6827e768d399`)

| Route | Result | DOM similarity | Landmark similarity | Axe serious | Screenshot |
|---|---|---:|---:|---:|---|
| `/` | PASS | 0.249 | 0.667 | 0 | [desktop](current/home-desktop.png) |

## Blocking issues

- None.

## Warnings

- attributes: "href=/docs/business-plan.pdf" count increased 2 -> 4
- attributes: added "href=/"
- links: "href:/docs/business-plan.pdf" count increased 2 -> 4
- links: added "href:/"
- /: aria attribute added: aria-label=Business plan document
- /: aria attribute added: aria-label=Project links
- /: aria attribute added: aria-label=Release studio
- /: aria attribute added: aria-label=Sonira home
- /: link target added: /
- /: link target added: /docs/business-plan.pdf

## Thresholds

- DOM fingerprint similarity <= 0.5
- Landmark sequence similarity <= 0.68
- CSS class overlap <= 0.1
- Accent distance >= 30 ΔE
- Contrast failures <= 0
- Axe serious/critical <= 0

All content is compared as a multiset of visible words plus rendered attribute values. Reordering is allowed, rewriting/removing/adding visible copy is not. Dynamic numeric values are reported as warnings, never silently accepted.
