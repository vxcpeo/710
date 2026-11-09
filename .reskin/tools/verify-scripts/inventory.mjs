#!/usr/bin/env node
/**
 * reskin inventory: read-only Vue project audit.
 *
 * Produces a content contract, a route list, a layout archetype and a palette.
 * Nothing in the target project is modified; output goes to .reskin/.
 *
 * Usage:
 *   node scripts/inventory.mjs [--project DIR] [--out .reskin] [--baseline]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(HERE, '..');

const SOURCE_EXT = new Set(['.vue', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.css', '.scss', '.sass', '.less', '.html']);
const IGNORE_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', '.reskin', 'coverage', '.nuxt', '.output', '.next',
  '.cache', '.turbo', 'cypress', 'playwright-report', 'test-results', '.vite', '.idea', '.vscode',
]);
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const CONTENT_ATTRS = new Set([
  'alt', 'placeholder', 'title', 'name', 'href', 'to', 'value', 'src', 'poster', 'download',
]);
const CONTENT_BINDINGS = new Set([...CONTENT_ATTRS]);
const COMPONENT_CONTENT_PROPS = new Set([
  'label', 'title', 'subtitle', 'text', 'message', 'description', 'placeholder', 'alt',
  'heading', 'value', 'unit', 'cta', 'eyebrow', 'meta', 'empty', 'caption',
]);
const FUNCTIONAL_EVENTS = /^(click|submit|change|input|keydown|keyup|keypress|focus|blur|mouseenter|mouseleave|toggle|open|close)$/i;

const normalizeSlashes = (p) => p.replace(/\\/g, '/');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
}

function normalizeText(text) {
  return decodeEntities(text).replace(/\s+/g, ' ').trim();
}

function normalizeExpr(expr) {
  return String(expr).replace(/\s+/g, ' ').trim();
}

function hasWordLike(text) {
  return /[\p{L}\p{N}]/u.test(text);
}

function inc(map, key, data = {}) {
  if (!key) return;
  const current = map.get(key);
  if (current) current.count += 1;
  else map.set(key, { ...data, count: 1 });
}

function mapToArray(map, orderKeys = []) {
  return [...map.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => {
      for (const k of orderKeys) {
        const av = String(a[k] ?? '');
        const bv = String(b[k] ?? '');
        const c = av.localeCompare(bv);
        if (c) return c;
      }
      return a.key.localeCompare(b.key);
    });
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

async function findProject(start) {
  let dir = path.resolve(start || process.cwd());
  const candidates = [];
  while (true) {
    const pkgPath = path.join(dir, 'package.json');
    if (await exists(pkgPath)) {
      const pkg = await readJson(pkgPath).catch(() => null);
      if (pkg) {
        candidates.push({ dir, pkg });
        if (pkg.dependencies?.vue || pkg.devDependencies?.vue || pkg.dependencies?.nuxt || pkg.devDependencies?.nuxt) {
          return { dir, pkg };
        }
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (candidates.length) return candidates[0];
  throw new Error(`No package.json found from ${start || process.cwd()}. Pass --project <vue-project>.`);
}

async function walkFiles(root, relative = '') {
  const out = [];
  const dir = path.join(root, relative);
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      if (relative.split('/').some((part) => IGNORE_DIRS.has(part))) continue;
      out.push(...await walkFiles(root, rel));
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (SOURCE_EXT.has(ext)) out.push(rel);
  }
  return out.sort();
}

function parseAttrs(attrText) {
  const attrs = [];
  let i = 0;
  while (i < attrText.length) {
    while (i < attrText.length && /\s/.test(attrText[i])) i += 1;
    if (i >= attrText.length) break;
    const nameStart = i;
    while (i < attrText.length && !/[\s=]/.test(attrText[i])) i += 1;
    let name = attrText.slice(nameStart, i);
    while (i < attrText.length && /\s/.test(attrText[i])) i += 1;
    let value = null;
    if (attrText[i] === '=') {
      i += 1;
      while (i < attrText.length && /\s/.test(attrText[i])) i += 1;
      const quote = attrText[i];
      if (quote === '"' || quote === "'") {
        i += 1;
        const start = i;
        while (i < attrText.length && attrText[i] !== quote) i += 1;
        value = attrText.slice(start, i);
        i += 1;
      } else {
        const start = i;
        while (i < attrText.length && !/\s/.test(attrText[i])) i += 1;
        value = attrText.slice(start, i);
      }
    } else if (name.endsWith('/')) {
      name = name.slice(0, -1);
    }
    if (name) attrs.push({ name, value });
  }
  return attrs;
}

/** Tokenize a Vue template without external dependencies. */
function tokenizeTemplate(template) {
  const tokens = [];
  let i = 0;
  while (i < template.length) {
    if (template.startsWith('<!--', i)) {
      const end = template.indexOf('-->', i + 4);
      i = end === -1 ? template.length : end + 3;
      continue;
    }
    if (template.startsWith('{{', i)) {
      const end = template.indexOf('}}', i + 2);
      if (end === -1) { i += 2; continue; }
      tokens.push({ type: 'expr', expr: template.slice(i + 2, end) });
      i = end + 2;
      continue;
    }
    if (template[i] === '<') {
      let j = i + 1;
      let quote = null;
      while (j < template.length) {
        const ch = template[j];
        if (quote) {
          if (ch === quote) quote = null;
        } else if (ch === '"' || ch === "'") {
          quote = ch;
        } else if (ch === '>') {
          break;
        }
        j += 1;
      }
      if (j >= template.length) { tokens.push({ type: 'text', text: template.slice(i) }); break; }
      const raw = template.slice(i, j + 1);
      const close = raw.match(/^<\s*\/\s*([A-Za-z][\w:.-]*)/);
      if (close) {
        tokens.push({ type: 'close', name: close[1].toLowerCase() });
      } else {
        const open = raw.match(/^<\s*([A-Za-z][\w:.-]*)/);
        if (open) {
          const name = open[1].toLowerCase();
          const rawName = open[1];
          const selfClosing = /\/\s*>$/.test(raw) || VOID_TAGS.has(name);
          const attrText = raw.slice(open[0].length, selfClosing ? raw.lastIndexOf('/') : -1).replace(/>\s*$/, ' ');
          tokens.push({ type: 'open', name, rawName, attrs: parseAttrs(attrText), selfClosing });
        } else {
          tokens.push({ type: 'text', text: raw });
        }
      }
      i = j + 1;
      continue;
    }
    let j = i;
    while (j < template.length && template[j] !== '<' && !template.startsWith('{{', j)) j += 1;
    if (j === i) j += 1;
    tokens.push({ type: 'text', text: template.slice(i, j) });
    i = j;
  }
  return tokens;
}

function extractBlock(source, tag) {
  const openRe = new RegExp(`<${tag}\\b[^>]*>`, 'i');
  const open = openRe.exec(source);
  if (!open) return null;
  const start = open.index + open[0].length;
  // Vue allows nested <template> elements (slots, v-if). Match by depth instead
  // of stopping at the first closing tag.
  const tagRe = new RegExp(`<${tag}\\b[^>]*>|</${tag}\\s*>`, 'gi');
  tagRe.lastIndex = start;
  let depth = 1;
  let m;
  while ((m = tagRe.exec(source))) {
    if (m[0].startsWith('</')) depth -= 1;
    else depth += 1;
    if (depth === 0) return source.slice(start, m.index);
  }
  return null;
}

function readSFC(source) {
  return {
    template: extractBlock(source, 'template') ?? '',
    script: [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n'),
    styles: [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n'),
  };
}

function parseTemplateContract(template, contract, structure) {
  const stack = [];
  let depth = 0;
  const tokens = tokenizeTemplate(template);
  for (const token of tokens) {
    if (token.type === 'open') {
      const attrs = token.attrs;
      const rawTag = token.rawName || token.name;
      const isCustom = /^[A-Z]/.test(rawTag) || rawTag.includes('-');
      const classAttr = attrs.find((a) => a.name.toLowerCase() === 'class');
      const srOnly = stack.some((s) => s.srOnly) || /(?:^|\s)(?:sr-only|visually-hidden|screen-reader-only|a11y-only|visually-hidden-focusable)(?:\s|$)/i.test(classAttr?.value || '');
      structure.tagCounts[token.name] = (structure.tagCounts[token.name] || 0) + 1;
      structure.depthHistogram[depth] = (structure.depthHistogram[depth] || 0) + 1;
      structure.maxDepth = Math.max(structure.maxDepth, depth);
      if (structure.skeletonSample.length < 120) {
        structure.skeletonSample.push(`${'  '.repeat(Math.min(depth, 10))}${token.name}`);
      }
      if (depth === 0) structure.topLevelTags.push(token.name);

      for (const attr of attrs) {
        const rawName = attr.name;
        const name = rawName.toLowerCase();
        const value = attr.value == null ? '' : attr.value;
        const isBind = name.startsWith(':') || name.startsWith('v-bind:');
        const isEvent = name.startsWith('@') || name.startsWith('v-on:');
        const isModel = name === 'v-model' || name.startsWith('v-model:') || name.startsWith('v-model.');
        const isText = name === 'v-text' || name === 'v-html';

        if (isBind) {
          const bound = name.replace(/^v-bind:/, '').replace(/^:/, '').split('.')[0];
          if (CONTENT_BINDINGS.has(bound)) inc(contract.bindings, `attr:${bound}\u0000${normalizeExpr(value)}`, { kind: 'attr', target: bound, expr: normalizeExpr(value) });
          if (isCustom && COMPONENT_CONTENT_PROPS.has(bound)) inc(contract.bindings, `prop:${bound}\u0000${normalizeExpr(value)}`, { kind: 'prop', target: bound, expr: normalizeExpr(value) });
          if (bound === 'href' || bound === 'to') inc(contract.bindings, `link:${bound}\u0000${normalizeExpr(value)}`, { kind: 'link', target: bound, expr: normalizeExpr(value) });
          if (bound === 'src' || bound === 'poster') inc(contract.bindings, `asset:${bound}\u0000${normalizeExpr(value)}`, { kind: 'asset', target: bound, expr: normalizeExpr(value) });
          if (bound === 'name' || bound === 'type') inc(contract.bindings, `form:${bound}\u0000${normalizeExpr(value)}`, { kind: 'form', target: bound, expr: normalizeExpr(value) });
          continue;
        }
        if (isEvent) {
          const evt = name.replace(/^v-on:/, '').replace(/^@/, '').split('.')[0];
          if (FUNCTIONAL_EVENTS.test(evt)) inc(contract.events, `${evt}\u0000${normalizeExpr(value)}`, { event: evt, handler: normalizeExpr(value) });
          continue;
        }
        if (isModel) {
          inc(contract.bindings, `model\u0000${normalizeExpr(value)}`, { kind: 'model', expr: normalizeExpr(value) });
          continue;
        }
        if (isText) {
          inc(contract.bindings, `${name}\u0000${normalizeExpr(value)}`, { kind: 'text', expr: normalizeExpr(value) });
          continue;
        }
        if (!value) continue;
        const normalized = normalizeText(value);
        if (!normalized) continue;
        if (token.name === 'slot' && name === 'name') continue;
        if (isCustom && COMPONENT_CONTENT_PROPS.has(name)) {
          inc(contract.visibleText, normalized, { value: normalized });
        }
        if (CONTENT_ATTRS.has(name)) {
          inc(contract.attributes, `${name}\u0000${normalized}`, { name, value: normalized });
        }
        if ((name === 'href' || name === 'to') && !normalized.startsWith('javascript:')) {
          inc(contract.links, `${name}\u0000${normalized}`, { kind: name, target: normalized });
        }
        if ((name === 'src' || name === 'poster') && normalized) {
          inc(contract.assets, `${name}\u0000${normalized}`, { kind: name, value: normalized });
        }
      }

      if (token.name === 'input' || token.name === 'select' || token.name === 'textarea') {
        const fieldName = attrs.find((a) => a.name.toLowerCase() === 'name')?.value || '';
        const fieldType = attrs.find((a) => a.name.toLowerCase() === 'type')?.value || '';
        inc(contract.forms, `${token.name}\u0000${fieldName}\u0000${fieldType}`, { tag: token.name, name: fieldName, type: fieldType });
      }

      if (token.selfClosing) {
        // no depth change
      } else {
        stack.push({ name: token.name, srOnly });
        depth += 1;
      }
    } else if (token.type === 'close') {
      const idx = [...stack].map((s) => s.name).lastIndexOf(token.name);
      if (idx !== -1) stack.length = idx;
      depth = stack.length;
    } else if (token.type === 'expr') {
      const expr = normalizeExpr(token.expr);
      if (expr) inc(contract.bindings, `interpolation\u0000${expr}`, { kind: 'interpolation', expr });
    } else if (token.type === 'text') {
      const text = normalizeText(token.text);
      if (!text || !hasWordLike(text)) continue;
      const srOnly = stack.some((s) => s.srOnly);
      if (srOnly) inc(contract.hiddenText, text, { value: text });
      else inc(contract.visibleText, text, { value: text });
    }
  }
}

function parseColors(text, paletteMap) {
  const re = /#([0-9a-fA-F]{3,8})\b|rgba?\(\s*([^)]+)\)|hsla?\(\s*([^)]+)\)/g;
  let m;
  while ((m = re.exec(text))) {
    const raw = m[0];
    let hex = null;
    if (m[1]) {
      let h = m[1];
      if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
      if (h.length === 6 || h.length === 8) hex = `#${h.slice(0, 6).toLowerCase()}`;
    } else if (m[2]) {
      const parts = m[2].split(',').map((p) => Number.parseFloat(p.trim()));
      if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
        const alpha = parts.length > 3 ? parts[3] : 1;
        if (alpha > 0.2) hex = rgbToHex(parts[0], parts[1], parts[2]);
      }
    } else if (m[3]) {
      const parts = m[3].split(',').map((p) => Number.parseFloat(p.trim()));
      if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
        const alpha = parts.length > 3 ? parts[3] : 1;
        if (alpha > 0.2) {
          const rgb = hslToRgb(parts[0], parts[1] / 100, parts[2] / 100);
          hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
        }
      }
    }
    if (hex) inc(paletteMap, hex, { hex });
  }
}

function rgbToHex(r, g, b) {
  const to = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function extractFonts(text, fontMap) {
  const re = /font-family\s*:\s*([^;}]+)/gi;
  let m;
  while ((m = re.exec(text))) {
    const value = m[1].replace(/\s+/g, ' ').trim();
    if (value && !value.startsWith('var(')) inc(fontMap, value, { value });
  }
}

function collectCssContent(styleText, contractMaps) {
  // Pseudo-element copy is user-visible even though it is absent from
  // innerText and from Vue templates. Treat word-like content as content.
  const re = /content\s*:\s*(["'])([\s\S]*?)\1/g;
  let m;
  while ((m = re.exec(styleText))) {
    const value = normalizeText(m[2].replace(/\\A\s?/gi, ' '));
    if (value && hasWordLike(value)) {
      inc(contractMaps.visibleText, `css-content:${value}`, { value, source: 'css-content' });
    }
  }
}

function extractScriptSignals(script, signals) {
  const apiPatterns = [
    /\bfetch\s*\(\s*[`'"]([^`'"]+)[`'"]/g,
    /\baxios\s*\.\s*(?:get|post|put|patch|delete|request)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi,
    /[`'"](https?:\/\/[^`'"\s]+)[`'"]/g,
    /[`'"](\/api\/[^`'"\s]+)[`'"]/g,
  ];
  for (const re of apiPatterns) {
    let m;
    while ((m = re.exec(script))) {
      if (signals.api.length < 200) signals.api.add(m[1]);
    }
  }
  const envRe = /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g;
  let e;
  while ((e = envRe.exec(script))) signals.env.add(e[1]);
  const routeRe = /path\s*:\s*[`'"]([^`'"]+)[`'"]/g;
  let r;
  while ((r = routeRe.exec(script))) signals.pathStrings.add(r[1]);
}

function extractRoutesFromFiles(files, sources) {
  const paths = new Set();
  for (const file of files) {
    const text = sources.get(file) || '';
    // Only route-bearing modules. A stray `path:` in data or SVG code should
    // not become a browser test route.
    if (!/createRouter|createWebHistory|createWebHashHistory|routes\s*[:=]/.test(text)) continue;
    const re = /path\s*:\s*[`'"]([^`'"]+)[`'"]/g;
    let m;
    while ((m = re.exec(text))) {
      const p = m[1];
      if (p.startsWith('/') && !p.startsWith('//') && !p.includes('http')) paths.add(p);
    }
  }
  const dynamic = (p) => p.includes(':') || p.includes('*');
  const result = [...paths]
    .filter((p) => p !== '/:pathMatch(.*)*' && p !== '/:catchAll(.*)')
    .sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)))
    .map((p) => ({ path: p, dynamic: dynamic(p) }));
  if (!result.length) result.push({ path: '/', dynamic: false });
  return result;
}

function classifyArchetype(sources, styleText) {
  const all = [...sources.values()].join('\n');
  const text = `${all}\n${styleText}`.toLowerCase();
  const has = (re) => re.test(text);
  const traits = {
    sidebar: has(/<aside\b|\bsidebar\b|\bside-menu\b|\bsider\b/),
    topbar: has(/<(?:header|div)[^>]*class=["'][^"']*(?:topbar|navbar|app-header|site-header|top-bar)[^"']*["']/),
    cards: has(/\bcard\b|\btile\b|\bpanel\b/),
    hero: has(/\bhero\b|\bbanner\b|\bjumbotron\b/),
    table: has(/<table\b|\bdata-table\b/),
    grid: has(/display\s*:\s*grid|grid-template|\bcol-\d/),
    tabs: has(/\btabs?\b/),
    modal: has(/\bmodal\b|\bdialog\b/),
    charts: has(/chart|sparkline|recharts|echarts|chart\.js/i),
    sticky: has(/position\s*:\s*sticky|position\s*:\s*fixed/),
    orbital: has(/\borbital\b|\borbit(?:al)?\b|\borbit-(?:core|ring|route|nav|stage|shell)\b|conic-gradient/),
    terminal: has(/\bterminal\b|class=["'][^"']*(?:console|terminal)|\.console-(?:pane|layout|shell)\b/),
    bento: has(/\bbento\b/),
    ticker: has(/\bticker\b|\bmarquee\b/),
    gallery: has(/\bgallery\b|scroll-snap/),
  };
  let archetype = 'document-flow';
  if (traits.orbital) archetype = 'orbital';
  else if (traits.sidebar && traits.topbar) archetype = 'dashboard-shell';
  else if (traits.sidebar) archetype = 'sidebar-workspace';
  else if (traits.bento) archetype = 'bento-canvas';
  else if (traits.topbar && traits.hero) archetype = 'topnav-marketing';
  else if (traits.topbar) archetype = 'topnav-page';
  else if (traits.hero && traits.cards) archetype = 'marketing-stack';
  else if (traits.terminal) archetype = 'terminal-console';
  else if (traits.ticker) archetype = 'ticker-stage';
  else if (traits.gallery) archetype = 'gallery-scroll';
  const family = ['orbital', 'bento-canvas', 'gallery-scroll', 'split-stage'].includes(archetype)
    ? 'spatial'
    : ['document-flow', 'topnav-marketing', 'marketing-stack'].includes(archetype)
      ? 'editorial'
      : ['terminal-console', 'ticker-stage', 'command-rail'].includes(archetype)
        ? 'linear'
        : 'shell';
  return { archetype, family, traits };
}

async function collectI18n(root, files) {
  const values = new Map();
  const keys = new Set();
  const localeFiles = files.filter((f) => /(?:^|\/)(?:locales?|i18n|lang)\//i.test(f) && f.endsWith('.json'));
  for (const rel of localeFiles) {
    try {
      const json = JSON.parse(await fs.readFile(path.join(root, rel), 'utf8'));
      const flatten = (obj, prefix = '') => {
        for (const [k, v] of Object.entries(obj || {})) {
          const full = prefix ? `${prefix}.${k}` : k;
          if (typeof v === 'string') {
            const value = normalizeText(v);
            if (value && value.length <= 500) inc(values, value, { value });
            keys.add(full);
          } else if (v && typeof v === 'object' && !Array.isArray(v)) {
            flatten(v, full);
          }
        }
      };
      flatten(json);
    } catch { /* ignore malformed locale */ }
  }
  return { values, keys, files: localeFiles };
}

function buildContract(meta, routes, visibleText, hiddenText, attributes, bindings, events, links, assets, forms, i18n, signals) {
  return {
    schemaVersion: 1,
    meta,
    routes: routes.map((r) => r.path),
    visibleText: mapToArray(visibleText, ['value']).map(({ value, count }) => ({ value, count })),
    hiddenText: mapToArray(hiddenText, ['value']).map(({ value, count }) => ({ value, count })),
    attributes: mapToArray(attributes, ['name', 'value']).map(({ name, value, count }) => ({ name, value, count })),
    bindings: mapToArray(bindings, ['kind', 'expr']).map(({ kind, expr, count }) => ({ kind, expr, count })),
    events: mapToArray(events, ['event', 'handler']).map(({ event, handler, count }) => ({ event, handler, count })),
    links: mapToArray(links, ['kind', 'target']).map(({ kind, target, count }) => ({ kind, target, count })),
    assets: mapToArray(assets, ['kind', 'value']).map(({ kind, value, count }) => ({ kind, value, count })),
    forms: mapToArray(forms, ['tag', 'name', 'type']).map(({ tag, name, type, count }) => ({ tag, name, type, count })),
    i18n: mapToArray(i18n.values, ['value']).map(({ value, count }) => ({ value, count })),
    i18nKeys: [...i18n.keys].sort(),
    i18nFiles: i18n.files,
    api: [...signals.api].sort(),
    env: [...signals.env].sort(),
  };
}

export async function analyzeProject(projectDir) {
  const { dir: root, pkg } = await findProject(projectDir);
  const allFiles = await walkFiles(root);
  const files = allFiles.filter((f) => /^(?:src|app|pages|components|layouts|assets|public)\//i.test(normalizeSlashes(f)) || /\.(vue|css|scss|less|sass)$/i.test(f));
  const sourceFiles = files.length ? files : allFiles;

  const contractMaps = {
    visibleText: new Map(),
    hiddenText: new Map(),
    attributes: new Map(),
    bindings: new Map(),
    events: new Map(),
    links: new Map(),
    assets: new Map(),
    forms: new Map(),
  };
  const structure = { tagCounts: {}, depthHistogram: {}, maxDepth: 0, skeletonSample: [], topLevelTags: [] };
  const paletteMap = new Map();
  const fontMap = new Map();
  const signals = { api: new Set(), env: new Set(), pathStrings: new Set(), htmlLang: null };
  const sources = new Map();
  const cssTexts = [];
  const styleVars = new Set();
  const colorVars = new Map();
  const mediaQueries = new Set();
  let vueFiles = 0;

  for (const rel of sourceFiles) {
    const abs = path.join(root, rel);
    let text;
    try { text = await fs.readFile(abs, 'utf8'); } catch { continue; }
    sources.set(rel, text);
    const ext = path.extname(rel).toLowerCase();
    if (ext === '.vue') {
      vueFiles += 1;
      const sfc = readSFC(text);
      if (sfc.template) parseTemplateContract(sfc.template, contractMaps, structure);
      if (sfc.styles) {
        cssTexts.push(sfc.styles);
        parseColors(sfc.styles, paletteMap);
        extractFonts(sfc.styles, fontMap);
        collectCssContent(sfc.styles, contractMaps);
      }
      extractScriptSignals(sfc.script, signals);
      if (sfc.template) collectClassNames(sfc.template);
    } else if (['.css', '.scss', '.sass', '.less'].includes(ext)) {
      cssTexts.push(text);
      parseColors(text, paletteMap);
      extractFonts(text, fontMap);
      collectCssContent(text, contractMaps);
    } else if (['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'].includes(ext)) {
      extractScriptSignals(text, signals);
    } else if (ext === '.html') {
      const title = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (title) inc(contractMaps.visibleText, `meta:title\u0000${normalizeText(title[1])}`, { value: normalizeText(title[1]), meta: 'title' });
      const lang = text.match(/<html\b[^>]*\blang=["']([^"']+)["']/i);
      if (lang) signals.htmlLang = lang[1];
      const desc = text.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
      if (desc) inc(contractMaps.attributes, `meta:description\u0000${normalizeText(desc[1])}`, { name: 'meta:description', value: normalizeText(desc[1]) });
    }
    if (ext === '.vue' || ext === '.css' || ext === '.scss') {
      const vars = text.match(/--[\w-]+\s*:/g) || [];
      for (const v of vars) styleVars.add(v.replace(/\s*:$/, ''));
      for (const m of text.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))/g)) {
        const tmp = new Map();
        parseColors(m[2], tmp);
        const hex = [...tmp.keys()][0];
        if (hex) colorVars.set(m[1], hex);
      }
      const medias = text.match(/@media[^{]+/g) || [];
      for (const m of medias) mediaQueries.add(m.replace(/\s+/g, ' ').trim());
    }
  }

  // Class names are used later for an originality check.
  const classNames = new Set();
  for (const text of sources.values()) {
    for (const m of text.matchAll(/\bclass\s*=\s*["']([^"']+)["']/g)) {
      for (const token of m[1].split(/\s+/)) if (token && !token.includes('{') && !token.includes('}')) classNames.add(token);
    }
    for (const m of text.matchAll(/class\s*=\s*["']([^"']+)["']/g)) {
      for (const token of m[1].split(/\s+/)) if (token && !token.includes('{')) classNames.add(token);
    }
  }

  const routes = extractRoutesFromFiles(sourceFiles, sources);
  const linkPaths = new Set();
  for (const key of contractMaps.links.keys()) {
    const target = key.split('\u0000')[1] || '';
    if (target.startsWith('/') && !target.startsWith('//')) linkPaths.add(target.split('?')[0].split('#')[0]);
  }
  for (const p of linkPaths) {
    if (!routes.some((r) => r.path === p) && !p.includes(':')) routes.push({ path: p, dynamic: false, source: 'link' });
  }
  routes.sort((a, b) => (a.path === '/' ? -1 : b.path === '/' ? 1 : a.path.localeCompare(b.path)));

  const i18n = await collectI18n(root, sourceFiles);
  const meta = {
    projectName: pkg.name || path.basename(root),
    title: (() => {
      for (const [key, value] of contractMaps.visibleText) if (key.startsWith('meta:title\u0000')) return value.value;
      return pkg.name || path.basename(root);
    })(),
    lang: signals.htmlLang || 'en',
  };

  const contract = buildContract(meta, routes, contractMaps.visibleText, contractMaps.hiddenText, contractMaps.attributes, contractMaps.bindings, contractMaps.events, contractMaps.links, contractMaps.assets, contractMaps.forms, i18n, signals);
  const contractHash = sha256(stableStringify(contract));
  const archetype = classifyArchetype(sources, cssTexts.join('\n'));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const frameworks = Object.keys(deps).filter((d) => /tailwind|element-plus|vuetify|naive-ui|ant-design-vue|bootstrap|bulma|quasar|primevue|shadcn|headlessui|ionic|framework7|uikit/i.test(d));

  const inventory = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    project: {
      root: normalizeSlashes(root),
      name: pkg.name || path.basename(root),
      vueVersion: deps.vue || deps.nuxt || null,
      nuxt: Boolean(deps.nuxt),
      dependencies: Object.keys(deps).sort(),
      packageManager: await detectPackageManager(root),
      scripts: pkg.scripts || {},
      frameworks,
    },
    stats: {
      filesScanned: sourceFiles.length,
      vueFiles,
      routes: routes.length,
      staticTextTokens: [...contractMaps.visibleText.values()].reduce((n, v) => n + v.count, 0),
      bindingTokens: [...contractMaps.bindings.values()].reduce((n, v) => n + v.count, 0),
      eventTokens: [...contractMaps.events.values()].reduce((n, v) => n + v.count, 0),
      classNames: classNames.size,
      colors: [...paletteMap.values()].reduce((n, v) => n + v.count, 0),
    },
    routes,
    unresolvedRoutes: [...signals.pathStrings].filter((p) => !p.startsWith('/')).sort(),
    archetype: { id: archetype.archetype, family: archetype.family, traits: archetype.traits },
    palette: mapToArray(paletteMap, ['hex']).sort((a, b) => b.count - a.count || a.hex.localeCompare(b.hex)).slice(0, 32).map(({ hex, count }) => ({ hex, count })),
    fonts: mapToArray(fontMap, ['value']).sort((a, b) => b.count - a.count).slice(0, 12).map(({ value, count }) => ({ value, count })),
    classNames: [...classNames].sort().slice(0, 400),
    designSignals: {
      frameworks,
      cssVars: [...styleVars].sort().slice(0, 240),
      colorVars: [...colorVars.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(0, 120).map(([name, value]) => ({ name, value })),
      mediaQueries: [...mediaQueries].sort(),
      darkMode: /prefers-color-scheme\s*:\s*dark|\.dark\b|data-theme=["']dark/i.test(cssTexts.join('\n')),
    },
    structure: {
      tagCounts: objectSorted(structure.tagCounts),
      depthHistogram: objectSorted(structure.depthHistogram),
      maxDepth: structure.maxDepth,
      topLevelTags: structure.topLevelTags,
      skeletonSample: structure.skeletonSample,
    },
    contentContract: contract,
    contentContractHash: contractHash,
  };
  return inventory;
}

function objectSorted(obj) {
  return Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));
}

function collectClassNames() {
  // Compatibility hook for future template-level class collection.
  return undefined;
}

async function detectPackageManager(root) {
  for (const [file, name] of [['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn'], ['bun.lockb', 'bun'], ['bun.lock', 'bun'], ['package-lock.json', 'npm']]) {
    if (await exists(path.join(root, file))) return name;
  }
  return 'npm';
}

export function contractDiff(baseline, current, { allowAdditions = true } = {}) {
  const issues = [];
  const warnings = [];
  const compareCounts = (label, baseArr, curArr, keyFn) => {
    const base = new Map(baseArr.map((x) => [keyFn(x), x]));
    const cur = new Map(curArr.map((x) => [keyFn(x), x]));
    for (const [key, item] of base) {
      const now = cur.get(key);
      if (!now) issues.push(`${label}: removed "${key}"`);
      else if (now.count < item.count) issues.push(`${label}: "${key}" count ${item.count} -> ${now.count}`);
      else if (now.count > item.count) warnings.push(`${label}: "${key}" count increased ${item.count} -> ${now.count}`);
    }
    for (const [key] of cur) {
      if (!base.has(key)) {
        if (allowAdditions) warnings.push(`${label}: added "${key}"`);
        else issues.push(`${label}: added "${key}"`);
      }
    }
  };
  compareCounts('visibleText', baseline.visibleText || [], current.visibleText || [], (x) => x.value);
  compareCounts('hiddenText', baseline.hiddenText || [], current.hiddenText || [], (x) => x.value);
  compareCounts('attributes', baseline.attributes || [], current.attributes || [], (x) => `${x.name}=${x.value}`);
  compareCounts('bindings', baseline.bindings || [], current.bindings || [], (x) => `${x.kind}:${x.expr}`);
  compareCounts('events', baseline.events || [], current.events || [], (x) => `${x.event}:${x.handler}`);
  compareCounts('links', baseline.links || [], current.links || [], (x) => `${x.kind}:${x.target}`);
  compareCounts('assets', baseline.assets || [], current.assets || [], (x) => `${x.kind}:${x.value}`);
  compareCounts('forms', baseline.forms || [], current.forms || [], (x) => `${x.tag}:${x.name}:${x.type}`);
  compareCounts('i18n', baseline.i18n || [], current.i18n || [], (x) => x.value);
  const baseRoutes = new Set(baseline.routes || []);
  const curRoutes = new Set(current.routes || []);
  for (const r of baseRoutes) if (!curRoutes.has(r)) issues.push(`route removed: ${r}`);
  for (const r of curRoutes) if (!baseRoutes.has(r)) warnings.push(`route added: ${r}`);
  for (const k of baseline.i18nKeys || []) if (!(current.i18nKeys || []).includes(k)) issues.push(`i18n key removed: ${k}`);
  for (const a of baseline.api || []) if (!(current.api || []).includes(a)) issues.push(`api endpoint removed: ${a}`);
  for (const e of baseline.env || []) if (!(current.env || []).includes(e)) issues.push(`env var removed: ${e}`);
  return { issues, warnings };
}

export async function writeInventory(inventory, outDir, { baseline = false, force = false } = {}) {
  await fs.mkdir(outDir, { recursive: true });
  const inventoryPath = path.join(outDir, 'inventory.json');
  const contractPath = path.join(outDir, 'content-contract.json');
  await fs.writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
  await fs.writeFile(contractPath, `${JSON.stringify(inventory.contentContract, null, 2)}\n`, 'utf8');
  if (baseline) {
    const baseDir = path.join(outDir, 'baseline');
    await fs.mkdir(baseDir, { recursive: true });
    const baseInventory = path.join(baseDir, 'inventory.json');
    // Freeze the original evidence. A later --baseline must not silently
    // replace the pre-reskin contract after the UI has already changed.
    if (!force && await exists(baseInventory)) {
      console.warn(`Baseline inventory already exists at ${normalizeSlashes(baseInventory)}; keeping it. Use --force to replace.`);
    } else {
      await fs.writeFile(baseInventory, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
      await fs.writeFile(path.join(baseDir, 'content-contract.json'), `${JSON.stringify(inventory.contentContract, null, 2)}\n`, 'utf8');
    }
  }
  await fs.writeFile(path.join(outDir, 'INVENTORY.md'), renderInventoryMarkdown(inventory), 'utf8');
  return { inventoryPath, contractPath };
}

export function renderInventoryMarkdown(inv) {
  const topColors = (inv.palette || []).slice(0, 10).map((c) => `\`${c.hex}\` (${c.count})`).join(' · ');
  const routes = (inv.routes || []).map((r) => `- \`${r.path}\`${r.dynamic ? ' _(dynamic)_' : ''}`).join('\n');
  const traits = Object.entries(inv.archetype?.traits || {}).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none';
  return `# Reskin inventory — ${inv.project.name}

Generated: ${inv.generatedAt}

## Project

| Field | Value |
|---|---|
| Root | \`${inv.project.root}\` |
| Vue | ${inv.project.vueVersion || 'not declared'} |
| Package manager | ${inv.project.packageManager} |
| Nuxt | ${inv.project.nuxt ? 'yes' : 'no'} |
| CSS frameworks | ${inv.project.frameworks.join(', ') || 'none detected'} |
| Files scanned | ${inv.stats.filesScanned} (${inv.stats.vueFiles} SFCs) |

## Original skeleton

- Archetype: **${inv.archetype.id}** (${inv.archetype.family})
- Traits: ${traits}
- Max template depth: ${inv.structure.maxDepth}
- Top-level tags: ${inv.structure.topLevelTags.join(', ') || 'unknown'}

The replacement skeleton must not be \`${inv.archetype.id}\` and must not be in the same family (\`${inv.archetype.family}\`).

## Routes

${routes || '- `/`'}

## Palette (most used first)

${topColors || '_No colors found._'}

## Content lock

- Static visible text tokens: **${inv.stats.staticTextTokens}**
- Binding expressions: **${inv.stats.bindingTokens}**
- Event handlers: **${inv.stats.eventTokens}**
- Contract hash: \`${inv.contentContractHash}\`

Everything in \`.reskin/content-contract.json\` is immutable: visible copy, placeholders, labels, routes, link targets, asset sources, bindings, handlers, API endpoints and i18n values. A reskin may move these tokens to new markup but may not rewrite, remove or hide them.

## Next

\`\`\`bash
node scripts/choose-style.mjs --project "${inv.project.root}" --out .reskin
node scripts/verify.mjs baseline --project "${inv.project.root}" --out .reskin
\`\`\`

Then rewrite the UI and run \`verify.mjs check\`.
`;
}

function parseArgs(argv) {
  const args = { project: process.cwd(), out: '.reskin', baseline: false, force: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--project' || a === '-p') args.project = argv[++i];
    else if (a === '--out' || a === '-o') args.out = argv[++i];
    else if (a === '--baseline') args.baseline = true;
    else if (a === '--force') args.force = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/inventory.mjs [--project DIR] [--out .reskin] [--baseline] [--force]');
    return;
  }
  const inventory = await analyzeProject(args.project);
  const outDir = path.resolve(inventory.project.root, args.out);
  const { inventoryPath } = await writeInventory(inventory, outDir, { baseline: args.baseline, force: args.force });
  console.log(`Reskin inventory: ${inventoryPath}`);
  console.log(`Project: ${inventory.project.name} (${inventory.project.vueVersion || 'Vue version unknown'})`);
  console.log(`Routes: ${inventory.routes.map((r) => r.path).join(', ')}`);
  console.log(`Archetype: ${inventory.archetype.id} (${inventory.archetype.family})`);
  console.log(`Content contract: ${inventory.stats.staticTextTokens} text tokens, ${inventory.stats.bindingTokens} bindings, hash ${inventory.contentContractHash.slice(0, 12)}`);
  console.log(`Palette: ${inventory.palette.slice(0, 8).map((c) => c.hex).join(' ')}`);
  console.log(args.baseline ? 'Baseline copy written to .reskin/baseline/' : 'Tip: rerun with --baseline before editing to freeze the original inventory.');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => { console.error(`reskin inventory failed: ${err.message}`); process.exitCode = 1; });
}
