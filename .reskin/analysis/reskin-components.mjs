import fs from 'node:fs'
import path from 'node:path'

const root = 'E:/workspace/chuangye/ROBIN/710/website'
const map = {
  'market-detail': 'ab-market',
  'market-eyebrow': 'ab-market-kicker',
  'market-header': 'ab-market-head',
  'market-identity': 'ab-market-id',
  'market-symbol': 'ab-market-sym',
  'market-listen': 'ab-market-play',
  'market-links': 'ab-market-links',
  'market-error': 'ab-market-error',
  'sound-story': 'ab-market-story',
  'creator-socials': 'ab-market-socials',
  'market-columns': 'ab-market-cols',
  'market-main': 'ab-market-main',
  'market-stat-grid': 'ab-market-stats',
  'market-chart-panel': 'ab-market-chart',
  'chart-tabs': 'ab-chart-tabs',
  'curve-chart': 'ab-curve',
  'chart-value-labels': 'ab-curve-labels',
  'chart-grid': 'ab-curve-grid',
  'curve-line': 'ab-curve-line',
  'chart-axis': 'ab-curve-axis',
  'chart-caption': 'ab-curve-caption',
  'inventory-progress': 'ab-progress-block',
  'activity-heading': 'ab-activity-head',
  'activity-scroll': 'ab-activity-scroll',
  'activity-table': 'ab-activity-table',
  'buy-tag': 'ab-buy-tag',
  'sell-tag': 'ab-sell-tag',
  'audio-proof': 'ab-proof',
  'creator-panel': 'ab-creator-panel',
  'creator-numbers': 'ab-creator-numbers',
  'creator-buttons': 'ab-creator-buttons',
  'vesting-details': 'ab-vesting',
  'market-trade': 'ab-trade',
  'trade-title': 'ab-trade-title',
  'graduation-ready': 'ab-graduated',
  'dex-notice': 'ab-dex-note',
  'snipe-notice': 'ab-snipe-note',
  'trade-tabs': 'ab-trade-tabs',
  'trade-amount': 'ab-trade-amount',
  'amount-shortcuts': 'ab-shortcuts',
  'trade-quote': 'ab-quote',
  'pool-proof': 'ab-pool-proof',
  active: 'is-on',
  button: 'ab-btn',
  'button-small': 'ab-btn-sm',
  'button-dark': 'ab-btn-ghost',
  'button-lime': 'ab-btn-hot',
  'full-width': 'ab-wide',
  'text-button': 'ab-text-btn',
  'inline-warning': 'ab-warn',
  'fine-print': 'ab-fine',
  'modal-message': 'ab-sheet-msg',
  'transaction-link': 'ab-tx',
  spin: 'is-spin',
  'creator-settings': 'ab-settings',
  'creator-settings-body': 'ab-settings-body',
  'settings-error': 'ab-settings-error',
  'creator-tax': 'ab-tax-field',
  'buyback-choice': 'ab-buyback'
}

function transform(rel) {
  const file = path.join(root, rel)
  let text = fs.readFileSync(file, 'utf8')
  const before = text.length
  text = text.replace(/(?<!:)\bclass="([^"]*)"/g, (full, value) => {
    const next = value.split(/(\s+)/).map((part) => map[part] || part).join('')
    return `class="${next}"`
  })
  text = text.replace(/:class="([^"]*)"/g, (full, expr) => {
    let next = expr
    for (const [from, to] of Object.entries(map)) {
      next = next.replace(new RegExp(`'${from}'`, 'g'), `'${to}'`)
      next = next.replace(new RegExp(`(?<![\\w-])${from}\\s*:`, 'g'), `'${to}':`)
    }
    return `:class="${next}"`
  })
  // Replace the old scoped stylesheet with nothing; new styles live in abyss.css.
  text = text.replace(/\n<style scoped>[\s\S]*?<\/style>\s*$/m, '\n')
  fs.writeFileSync(file, text, 'utf8')
  console.log(rel, before, '->', text.length)
}

transform('src/components/MarketDetailV2.vue')
transform('src/components/CreatorSettings.vue')
