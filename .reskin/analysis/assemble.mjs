import fs from 'node:fs'
import path from 'node:path'

const root = 'E:/workspace/chuangye/ROBIN/710/website'
const original = fs.readFileSync(path.join(root, '.reskin/analysis/App.original.vue'), 'utf8')
const templateText = fs.readFileSync(path.join(root, '.reskin/analysis/new-template.vue'), 'utf8')
const classMap = JSON.parse(fs.readFileSync(path.join(root, '.reskin/analysis/class-map.json'), 'utf8'))
const script = original.slice(0, original.indexOf('<template>'))
const aux = original.slice(original.indexOf('<Transition name="slide">'), original.indexOf('</dialog>') + '</dialog>'.length)

function renameClasses(text) {
  text = text.replace(/(?<!:)\bclass="([^"]*)"/g, (full, value) => {
    const next = value.split(/(\s+)/).map((part) => classMap[part] || part).join('')
    return `class="${next}"`
  })
  text = text.replace(/:class="([^"]*)"/g, (full, expr) => {
    let next = expr
    for (const [from, to] of Object.entries(classMap)) {
      next = next.replace(new RegExp(`'${from}'`, 'g'), `'${to}'`)
      next = next.replace(new RegExp(`(?<![\\w-])${from}\\s*:`, 'g'), `'${to}':`)
    }
    return `:class="${next}"`
  })
  return text
}

const newAux = renameClasses(aux)

const newTemplate = templateText.replace('<!--AUX-->', newAux)
const output = `${script}${newTemplate}`
fs.writeFileSync(path.join(root, 'src/App.vue'), output, 'utf8')
console.log(JSON.stringify({ bytes: output.length, auxBytes: newAux.length, scriptBytes: script.length }))
