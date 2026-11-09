from pathlib import Path

p = Path(r'E:/workspace/chuangye/ROBIN/710/website/.reskin/tools/verify-scripts/verify.mjs')
t = p.read_text(encoding='utf-8')
old = "  const baseMap = new Map(Object.entries(baselinePages.pages || {}));\n  const curMap = new Map(Object.entries(pages.pages || {}));"
new = """  const isUiRoute = (route) => !/\\.[a-z0-9]+$/i.test(route) || /\\.html?$/i.test(route);
  const baseMap = new Map(Object.entries(baselinePages.pages || {}).filter(([route]) => isUiRoute(route)));
  const curMap = new Map(Object.entries(pages.pages || {}).filter(([route]) => isUiRoute(route)));"""
if old not in t:
    raise SystemExit('anchor missing')
t = t.replace(old, new, 1)
p.write_text(t, encoding='utf-8')
print('patched', len(t))
