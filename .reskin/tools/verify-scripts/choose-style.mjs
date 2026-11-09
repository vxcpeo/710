#!/usr/bin/env node
/**
 * reskin style selector.
 *
 * Reads .reskin/inventory.json, samples public blockchain frontends (best effort),
 * then deterministically selects one design DNA and one skeleton archetype that
 * are far from the original. No prompts, no choices for the user.
 *
 * Usage:
 *   node scripts/choose-style.mjs [--project DIR] [--out .reskin] [--no-live] [--seed TEXT]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(HERE, '..');
const CATALOG_PATH = path.join(SKILL_ROOT, 'references', 'style-catalog.json');
const ARCHETYPES_PATH = path.join(SKILL_ROOT, 'references', 'layout-archetypes.json');

const normalizeSlashes = (p) => p.replace(/\\/g, '/');
const sha = (s) => crypto.createHash('sha256').update(s).digest();
const hashUnit = (s) => sha(s).readUInt32BE(0) / 0xffffffff;

function parseArgs(argv) {
  const args = { project: process.cwd(), out: '.reskin', live: true, seed: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--project' || a === '-p') args.project = argv[++i];
    else if (a === '--out' || a === '-o') args.out = argv[++i];
    else if (a === '--no-live') args.live = false;
    else if (a === '--seed') args.seed = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [Number.parseInt(full.slice(0, 2), 16), Number.parseInt(full.slice(2, 4), 16), Number.parseInt(full.slice(4, 6), 16)];
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

function srgbToLinear(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function rgbToLab(rgb) {
  const [r, g, b] = rgb.map(srgbToLinear);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE(hexA, hexB) {
  const a = rgbToLab(hexToRgb(hexA));
  const b = rgbToLab(hexToRgb(hexB));
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(hexA, hexB) {
  const a = luminance(hexA);
  const b = luminance(hexB);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function saturation(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

function lightness(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
}

function chromaticColors(palette, limit = 8) {
  return palette
    .filter((c) => saturation(c.hex) >= 0.35 && lightness(c.hex) > 0.15 && lightness(c.hex) < 0.86)
    .sort((a, b) => (b.count * (0.2 + saturation(b.hex) ** 2)) - (a.count * (0.2 + saturation(a.hex) ** 2)))
    .slice(0, limit);
}

function colorVar(inventory, pattern) {
  const vars = inventory.designSignals?.colorVars || [];
  return vars.find((v) => pattern.test(v.name))?.value || null;
}

function detectTheme(palette) {
  const top = palette[0]?.hex || '#ffffff';
  return lightness(top) < 0.35 ? 'dark' : 'light';
}

function extractColors(text) {
  const map = new Map();
  const re = /#([0-9a-fA-F]{3,8})\b|rgba?\(\s*([^)]+)\)/g;
  let m;
  while ((m = re.exec(text))) {
    let hex = null;
    if (m[1]) {
      let h = m[1];
      if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
      if (h.length === 6 || h.length === 8) hex = `#${h.slice(0, 6).toLowerCase()}`;
    } else if (m[2]) {
      const parts = m[2].split(',').map((p) => Number.parseFloat(p.trim()));
      const alpha = parts.length > 3 ? parts[3] : 1;
      if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite) && alpha > 0.25) hex = rgbToHex(parts[0], parts[1], parts[2]);
    }
    if (hex) map.set(hex, (map.get(hex) || 0) + 1);
  }
  return [...map.entries()].map(([hex, count]) => ({ hex, count })).sort((a, b) => b.count - a.count);
}

function extractFonts(text) {
  const fonts = new Map();
  const re = /font-family\s*:\s*([^;}]+)/gi;
  let m;
  while ((m = re.exec(text))) {
    const value = m[1].replace(/\s+/g, ' ').trim();
    if (!value || value.startsWith('var(')) continue;
    fonts.set(value, (fonts.get(value) || 0) + 1);
  }
  return [...fonts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([value, count]) => ({ value, count }));
}

function extractCssLinks(html, baseUrl) {
  const links = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/stylesheet/i.test(tag) && !/\.css(?:[?"']|$)/i.test(tag)) continue;
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      const url = new URL(href, baseUrl).href;
      if (!links.includes(url)) links.push(url);
    } catch { /* ignore */ }
  }
  return links.slice(0, 3);
}

async function fetchText(url, timeoutMs = 6500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        accept: 'text/html,text/css,*/*;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return { text: text.slice(0, 1_200_000), status: res.status, finalUrl: res.url };
  } finally {
    clearTimeout(timer);
  }
}

async function sampleLive(styles) {
  const targets = [...styles];
  const results = [];
  const queue = [...targets];
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const style = queue.shift();
      const url = style.sources?.[0];
      if (!url) continue;
      const started = Date.now();
      try {
        const page = await fetchText(url);
        const cssLinks = extractCssLinks(page.text, page.finalUrl);
        const cssTexts = [];
        for (const cssUrl of cssLinks) {
          try {
            const css = await fetchText(cssUrl);
            cssTexts.push(css.text);
          } catch { /* one stylesheet is enough */ }
        }
        const combined = `${page.text}\n${cssTexts.join('\n')}`;
        const colors = extractColors(combined);
        const fonts = extractFonts(combined);
        const bgCandidates = colors.filter((c) => {
          const l = lightness(c.hex);
          const catalogDark = lightness(style.palette.bg) < 0.35;
          return catalogDark ? l < 0.14 : l > 0.88;
        });
        const bg = bgCandidates[0]?.hex || null;
        const accents = colors
          .filter((c) => saturation(c.hex) > 0.3 && lightness(c.hex) > 0.18 && lightness(c.hex) < 0.82)
          .sort((a, b) => (b.count * (0.4 + saturation(b.hex))) - (a.count * (0.4 + saturation(a.hex))));
        const accent = accents.find((c) => !bg || contrast(c.hex, bg) >= 2.5)?.hex || accents[0]?.hex || null;
        results.push({
          styleId: style.id,
          url,
          ok: true,
          status: page.status,
          elapsedMs: Date.now() - started,
          cssFiles: cssLinks.length,
          colors: colors.slice(0, 10),
          fonts,
          bg,
          accent,
        });
      } catch (err) {
        results.push({
          styleId: style.id,
          url,
          ok: false,
          elapsedMs: Date.now() - started,
          error: err.name === 'AbortError' ? 'timeout' : String(err.message || err),
        });
      }
    }
  });
  await Promise.all(workers);
  return results;
}

function enrichFromLive(styles, live) {
  const byId = new Map(live.filter((x) => x.ok).map((x) => [x.styleId, x]));
  let applied = 0;
  const enriched = styles.map((style) => {
    const sample = byId.get(style.id);
    if (!sample) return { ...style, live: { sampled: false } };
    const palette = { ...style.palette };
    const notes = [];
    if (sample.accent && saturation(sample.accent) > 0.35) {
      const d = deltaE(sample.accent, palette.accent);
      // Accept live color when it is plausibly the same brand, or when it is a
      // strong, repeated color with enough contrast against the sampled ground.
      if (d < 48 || (contrast(sample.accent, sample.bg || palette.bg) >= 3.2 && sample.colors[0]?.count >= 1)) {
        palette.accent = sample.accent;
        palette.accentSafe = contrast(sample.accent, sample.bg || palette.bg) >= 4.5 ? sample.accent : adjustForContrast(sample.accent, sample.bg || palette.bg, 4.5);
        notes.push(`accent ${style.palette.accent} -> ${palette.accent}`);
        applied += 1;
      }
    }
    if (sample.bg && deltaE(sample.bg, palette.bg) < 22) {
      palette.bg = sample.bg;
      notes.push(`bg ${style.palette.bg} -> ${palette.bg}`);
    }
    if (sample.accent2 || (sample.colors[0] && saturation(sample.colors[0].hex) > 0.4)) {
      const candidate = sample.colors.find((c) => (
        saturation(c.hex) > 0.35
        && lightness(c.hex) > 0.18
        && lightness(c.hex) < 0.86
        && deltaE(c.hex, palette.accent) > 12
        && contrast(c.hex, palette.bg) >= 2.5
      ))?.hex;
      if (candidate) palette.accent2 = candidate;
    }
    return {
      ...style,
      palette,
      live: {
        sampled: true,
        url: sample.url,
        elapsedMs: sample.elapsedMs,
        sampledColors: sample.colors.slice(0, 6),
        sampledFonts: sample.fonts,
        applied: notes,
      },
    };
  });
  return { styles: enriched, applied };
}

function adjustForContrast(fg, bg, target) {
  let current = fg;
  for (let i = 0; i < 12 && contrast(current, bg) < target; i += 1) {
    const [r, g, b] = hexToRgb(current);
    const dark = luminance(bg) > 0.45;
    current = rgbToHex(
      dark ? Math.max(0, r - 14) : Math.min(255, r + 14),
      dark ? Math.max(0, g - 14) : Math.min(255, g + 14),
      dark ? Math.max(0, b - 14) : Math.min(255, b + 14),
    );
  }
  return current;
}

function styleScores(styles, original, seed, archetypes) {
  const background = original.background || '#ffffff';
  const anchorAccent = original.anchorAccent || '#4f46e5';
  const originalFamily = original.family;
  const rows = [];
  for (const style of styles) {
    const accentDistance = deltaE(style.palette.accentSafe || style.palette.accent, anchorAccent);
    const bgDistance = deltaE(style.palette.bg, background);
    const paletteNovelty = Math.min(1, accentDistance / 65) * 0.82 + Math.min(1, bgDistance / 45) * 0.18;
    const archetype = chooseArchetype(style, archetypes, original, seed);
    const familyNovelty = archetype.family === originalFamily ? 0.15 : 1;
    const liveBonus = style.live?.sampled ? 0.04 : 0;
    const jitter = hashUnit(`${seed}:style:${style.id}`);
    const score = 0.50 * paletteNovelty + 0.24 * familyNovelty + 0.22 * jitter + liveBonus;
    rows.push({
      id: style.id,
      name: style.name,
      score: Number(score.toFixed(4)),
      accentDistance: Number(accentDistance.toFixed(1)),
      bgDistance: Number(bgDistance.toFixed(1)),
      familyNovelty,
      jitter: Number(jitter.toFixed(3)),
      archetype: archetype.id,
      archetypeFamily: archetype.family,
      live: Boolean(style.live?.sampled),
      accent: style.palette.accent,
    });
  }
  return rows.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

function chooseArchetype(style, archetypes, original, seed) {
  const candidates = (style.layoutAffinity || [])
    .map((id) => archetypes.find((a) => a.id === id))
    .filter(Boolean)
    .filter((a) => a.id !== original.id);
  const pool = candidates.length ? candidates : archetypes.filter((a) => a.id !== original.id);
  const scored = pool.map((a) => {
    const familyNovelty = a.family === original.family ? 0.2 : 1;
    const jitter = hashUnit(`${seed}:layout:${style.id}:${a.id}`);
    return { ...a, score: 0.78 * familyNovelty + 0.22 * jitter };
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return scored[0] || archetypes[0];
}

function renderCssVariables(style) {
  const p = style.palette;
  return `:root {
  --bg: ${p.bg};
  --surface: ${p.surface};
  --surface-alt: ${p.surfaceAlt};
  --ink: ${p.ink};
  --muted: ${p.muted};
  --accent: ${p.accent};
  --accent-safe: ${p.accentSafe};
  --accent-2: ${p.accent2};
  --line: ${p.line};
  --success: ${p.success};
  --danger: ${p.danger};
  --warning: ${p.warning};

  --font-display: ${style.typography.display};
  --font-body: ${style.typography.body};
  --font-mono: ${style.typography.mono};
  --display-weight: ${style.typography.displayWeight};
  --display-tracking: ${style.typography.displayTracking};
  --label-tracking: ${style.typography.labelTracking};

  --radius-sm: ${style.shape.radiusSm};
  --radius-md: ${style.shape.radiusMd};
  --radius-lg: ${style.shape.radiusLg};
  --border: ${style.shape.border};
  --shadow: ${style.shape.shadow};

  --motion-duration: ${style.motion.duration};
  --motion-ease: ${style.motion.easing};
  --space-1: clamp(4px, .35vw, 6px);
  --space-2: clamp(8px, .7vw, 12px);
  --space-3: clamp(14px, 1.2vw, 20px);
  --space-4: clamp(22px, 2vw, 32px);
  --space-5: clamp(36px, 3.4vw, 56px);
  --space-6: clamp(56px, 5vw, 88px);
  --page-pad: clamp(18px, 4vw, 64px);
  --max-width: 1440px;
}`;
}

function renderStyleMarkdown(result, inventory) {
  const { style, layout, selection, originality } = result;
  const sourceLinks = (style.sources || []).map((s) => `[${s}](${s})`).join(' · ');
  const liveRows = (result.liveSampling || []).map((x) => `| ${x.styleId} | ${x.url} | ${x.ok ? `ok (${x.elapsedMs} ms)` : `failed: ${x.error}`} | ${x.accent || '—'} | ${x.bg || '—'} |`).join('\n');
  const candidateRows = selection.ranking.slice(0, 10).map((r) => `| ${r.name} | ${r.score} | ${r.accentDistance} | ${r.archetype} | ${r.live ? 'yes' : 'no'} |`).join('\n');
  return `# Reskin art direction — ${style.name}

> Selected automatically. Do not ask the user to confirm or choose another direction.

- **Style DNA:** \`${style.id}\` (${style.family})
- **Skeleton:** \`${layout.id}\` (${layout.family})
- **Seed:** \`${result.seed}\`
- **Source DNA:** ${sourceLinks || 'local catalog'}
- **Live sampled:** ${style.live?.sampled ? `yes — ${style.live.url} (${style.live.elapsedMs} ms)` : 'no — offline-safe catalog used'}
- **Original:** ${inventory.archetype.id} / ${originality.originalTheme} / accent ${originality.anchorAccent}

## Why this direction

${selection.reason}

## Live reference sampling

| Style | URL | Result | Accent sampled | Ground sampled |
|---|---|---|---|---|
${liveRows || '| — | — | live sampling disabled | — | — |'}

Live sampling is evidence, not a copy target. Never download or reuse a reference site's logo, imagery, copy, or code. Use only the abstract tokens below.

## Candidate ranking

| Candidate | Score | Accent ΔE from original | Layout | Live |
|---|---:|---:|---|---|
${candidateRows}

## Skeleton brief

**${layout.name}** — ${layout.signature.join('; ')}.

Navigation: ${layout.navigation}

Structure:
${layout.structure.map((s) => `1. ${s}`).join('\n')}

Content mapping: ${layout.content_mapping}

Recipe: \`${layout.css_recipe}\`

Risks: ${layout.risks.join('; ')}

## Design tokens

\`\`\`css
${renderCssVariables(style)}
\`\`\`

## Component grammar

- Surface: ${style.shape.border}; radius ${style.shape.radiusMd}; shadow ${style.shape.shadow}.
- Type: display **${style.typography.display}** at weight ${style.typography.displayWeight}, tracking ${style.typography.displayTracking}; body **${style.typography.body}**; numerals and micro-labels **${style.typography.mono}**.
- Texture: ${style.texture.join(', ')}.
- Motion: ${style.motion.feel}, ${style.motion.duration}, ${style.motion.easing}. Always wrap non-essential motion in \`@media (prefers-reduced-motion: no-preference)\`.
- Density: ${style.density}. Keep body text >= 14px and body contrast >= 4.5:1.
- Use \`--accent-safe\` for text and icons on \`--bg\`; use \`--accent\` for fills and large shapes.

## Originality guard

The replacement must satisfy all of these:

1. The source inventory archetype is \`${inventory.archetype.id}\`; the new skeleton is \`${layout.id}\`. Do not fall back to the old shell during implementation.
2. Do not reuse any original class name, CSS selector, design token name, or original accent family.
3. Rewrite templates, not only CSS. Every route must visibly use the new skeleton.
4. Keep every token in \`.reskin/content-contract.json\`; move it, never rewrite it.
5. Run \`node scripts/verify.mjs check\` and do not stop until content, structure, accessibility and responsive checks pass.

## Commit statement

Use this sentence in the final report: "The UI was rebuilt around ${style.name} / ${layout.name}; the original ${inventory.archetype.id} shell and palette were removed while the content contract stayed byte-for-byte intact."
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/choose-style.mjs [--project DIR] [--out .reskin] [--no-live] [--seed TEXT]');
    return;
  }
  const projectRoot = path.resolve(args.project);
  const outDir = path.resolve(projectRoot, args.out);
  const baselinePath = path.join(outDir, 'baseline', 'inventory.json');
  const inventoryPath = (await fs.access(baselinePath).then(() => baselinePath).catch(() => null))
    || path.join(outDir, 'inventory.json');
  let inventory;
  try {
    inventory = JSON.parse(await fs.readFile(inventoryPath, 'utf8'));
  } catch {
    throw new Error(`Missing ${inventoryPath}. Run inventory.mjs first.`);
  }

  const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, 'utf8'));
  const layouts = JSON.parse(await fs.readFile(ARCHETYPES_PATH, 'utf8')).archetypes;
  const palette = inventory.palette || [];
  const accentVar = colorVar(inventory, /(?:^|[-_])(accent|primary|brand|highlight)(?:[-_]|$)/i);
  const bgVar = colorVar(inventory, /(?:^|[-_])(bg|background|canvas)(?:[-_]|$)/i);
  const original = {
    id: inventory.archetype?.id || 'document-flow',
    family: inventory.archetype?.family || 'flow',
    theme: detectTheme(palette),
    background: bgVar || palette.find((c) => (detectTheme(palette) === 'dark' ? lightness(c.hex) < 0.1 : lightness(c.hex) > 0.92))?.hex || (detectTheme(palette) === 'dark' ? '#0a0a0a' : '#ffffff'),
    anchorAccent: (accentVar && saturation(accentVar) >= 0.3 && lightness(accentVar) < 0.9 ? accentVar : null)
      || chromaticColors(palette, 1)[0]?.hex
      || '#4f46e5',
  };
  // Keep the direction stable when content tokens or the parser evolve. The
  // identity of the job is the project + route set + original design signature.
  const seed = args.seed || sha(`${inventory.project.name}|${inventory.routes.map((r) => r.path).join(',')}|${original.id}|${original.anchorAccent}|${original.background}`).toString('hex');

  let liveSampling = [];
  let styles = catalog.styles.map((s) => ({ ...s }));
  if (args.live) {
    liveSampling = await sampleLive(styles);
    const enriched = enrichFromLive(styles, liveSampling);
    styles = enriched.styles;
  }

  const ranking = styleScores(styles, original, seed, layouts);
  // Prefer a direction that already clears the palette-originality gate. If
  // none does, surface the farthest candidate and let verification force a
  // manual token adjustment rather than silently accepting a look-alike.
  const selectedRow = ranking.find((row) => row.accentDistance >= 30) || ranking[0];
  const style = styles.find((s) => s.id === selectedRow.id);
  const layout = chooseArchetype(style, layouts, original, seed);

  const originality = {
    originalTheme: original.theme,
    anchorAccent: original.anchorAccent,
    background: original.background,
    originalArchetype: original.id,
    originalFamily: original.family,
    accentDistance: selectedRow.accentDistance,
    bgDistance: selectedRow.bgDistance,
    thresholds: {
      minAccentDistance: 30,
      minStructureDistance: 0.50,
      maxClassOverlap: 0.10,
    },
    passed: selectedRow.accentDistance >= 30,
  };

  const reason = `The selector sampled ${liveSampling.filter((x) => x.ok).length}/${liveSampling.length} blockchain references, scored every direction for perceptual distance from the original accent (${original.anchorAccent}) and background (${original.background}), added a deterministic seed jitter, and chose ${style.name} because it is ${selectedRow.accentDistance.toFixed(0)} ΔE away from the original accent and pairs with ${layout.name}, a ${layout.family} skeleton rather than the original ${original.id}.`;

  const result = {
    schemaVersion: 1,
    selectedAt: new Date().toISOString(),
    seed,
    style: {
      id: style.id,
      name: style.name,
      family: style.family,
      sources: style.sources,
      keywords: style.keywords,
      palette: style.palette,
      typography: style.typography,
      shape: style.shape,
      texture: style.texture,
      motion: style.motion,
      density: style.density,
      live: style.live || { sampled: false },
    },
    layout: {
      id: layout.id,
      name: layout.name,
      family: layout.family,
      signature: layout.signature,
      navigation: layout.navigation,
      structure: layout.structure,
      content_mapping: layout.content_mapping,
      css_recipe: layout.css_recipe,
      risks: layout.risks,
      not_interchangeable_with: layout.not_interchangeable_with,
    },
    selection: {
      reason,
      ranking,
      liveApplied: style.live?.applied || [],
    },
    originality,
    liveSampling,
    css: renderCssVariables(style),
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'style.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(outDir, 'STYLE.md'), renderStyleMarkdown(result, inventory), 'utf8');

  console.log(`Reskin style: ${style.name} (${style.id})`);
  console.log(`Skeleton: ${layout.name} (${layout.id}) — original was ${inventory.archetype.id}`);
  console.log(`Live samples: ${liveSampling.filter((x) => x.ok).length}/${liveSampling.length} ok; selected accent ${style.palette.accent}`);
  console.log(`Original accent ${original.anchorAccent}; accent distance ${selectedRow.accentDistance.toFixed(1)} ΔE`);
  console.log(`Wrote ${normalizeSlashes(path.join(outDir, 'style.json'))} and STYLE.md`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => { console.error(`reskin style selection failed: ${err.message}`); process.exitCode = 1; });
}
