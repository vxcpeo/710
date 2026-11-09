# Reskin inventory — sonira-website

Generated: 2026-10-21T17:38:49.001Z

## Project

| Field | Value |
|---|---|
| Root | `E:/workspace/chuangye/ROBIN/710/website` |
| Vue | ^3.5.43 |
| Package manager | npm |
| Nuxt | no |
| CSS frameworks | none detected |
| Files scanned | 18 (6 SFCs) |

## Original skeleton

- Archetype: **marketing-stack** (editorial)
- Traits: cards, hero, table, grid, tabs, modal, charts, sticky, terminal, ticker
- Max template depth: 11
- Top-level tags: a, div, transition, transition, dialog, details, section, a, div, transition, transition, dialog, details, section

The replacement skeleton must not be `marketing-stack` and must not be in the same family (`editorial`).

## Routes

- `/`
- `/docs/business-plan.pdf`

## Palette (most used first)

`#ff0000` (52) · `#8fa3b5` (30) · `#000000` (26) · `#ffffff` (18) · `#182533` (14) · `#111a24` (8) · `#555555` (8) · `#171717` (6) · `#5ce1a0` (6) · `#06090d` (4)

## Content lock

- Static visible text tokens: **565**
- Binding expressions: **470**
- Event handlers: **154**
- Contract hash: `a96ea6d3bd62ad2203fd6c3d646694fa55a461a7911b97bf108339369f1835f2`

Everything in `.reskin/content-contract.json` is immutable: visible copy, placeholders, labels, routes, link targets, asset sources, bindings, handlers, API endpoints and i18n values. A reskin may move these tokens to new markup but may not rewrite, remove or hide them.

## Next

```bash
node scripts/choose-style.mjs --project "E:/workspace/chuangye/ROBIN/710/website" --out .reskin
node scripts/verify.mjs baseline --project "E:/workspace/chuangye/ROBIN/710/website" --out .reskin
```

Then rewrite the UI and run `verify.mjs check`.
