/**
 * Generate `client.js` from the French dictionaries in `dictionaries/`.
 *
 * The served bundle must be a self-contained classic script, so the
 * dictionaries are inlined. The JSON files stay the source of truth: edit a
 * translation there, then run `node mktdev/locale-fr/build.mjs`.
 *
 * Usage: node mktdev/locale-fr/build.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dictDir = join(here, 'dictionaries')

/** Turn a namespace into a JS identifier, keeping it unique. */
function identifier(ns, taken) {
  const base = ns.replace(/[^A-Za-z0-9]+/g, '_').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()
  let candidate = base
  let suffix = 2
  while (taken.has(candidate)) candidate = `${base}_${String(suffix++)}`
  taken.add(candidate)
  return candidate
}

const namespaces = readdirSync(dictDir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort()

const taken = new Set()
const blocks = []
const registers = []

for (const ns of namespaces) {
  const dict = JSON.parse(readFileSync(join(dictDir, `${ns}.json`), 'utf8'))
  const ident = identifier(ns, taken)
  const lines = Object.entries(dict)
    .map(([k, v]) => `      ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join('\n')
  blocks.push(`    /** \`${ns}\` */\n    const ${ident} = {\n${lines}\n    }`)
  registers.push(`        ctx.effect(\n          () => ctx.locale.register(${JSON.stringify(ns)}, 'fr', ${ident}),\n          'mktdev-locale-fr: ${ns}',\n        )`)
}

const header = `/**
 * MKTDEV French language pack, browser half. GENERATED FILE, do not edit by hand.
 *
 * Source of truth: the JSON files in ./dictionaries/. Regenerate with
 * \`node mktdev/locale-fr/build.mjs\`.
 *
 * Registers the \`fr\` language and ${String(namespaces.length)} French dictionaries over the upstream
 * namespaces. The locale registry has no extension point for replacing a
 * shipped \`en\` or \`zh\` dictionary, so this pack only ADDS \`fr\`. Lookup walks
 * the fallback chain per key and lands on English for any key left out, which
 * is what makes partial coverage safe.
 *
 * Loaded as a classic script by the client module table, so the bundle only
 * registers a factory.
 */
window.__ModuleLoader__.load({
  id: '@mktdev/locale-fr',
  factory() {
`

const footer = `
    return {
      inject: ['locale'],
      apply(ctx) {
        ctx.effect(
          () => ctx.locale.addLanguage({ id: 'fr', label: 'Français', fallback: 'en' }),
          'mktdev-locale-fr: language',
        )
${registers.join('\n')}
      },
    }
  },
})
`

writeFileSync(join(here, 'client.js'), `${header}${blocks.join('\n\n')}\n${footer}`)
console.log(`client.js written: ${String(namespaces.length)} namespaces, ${String(namespaces.reduce((n, ns) => n + Object.keys(JSON.parse(readFileSync(join(dictDir, `${ns}.json`), 'utf8'))).length, 0))} keys`)
