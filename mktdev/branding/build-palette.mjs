/**
 * Generate `palette.css` from the MKTDEV brand palette.
 *
 * The upstream theme is built on two static ramps (a cold grey and a blue) plus
 * an alias layer. Rather than restating ~90 tokens by hand, this script reads
 * the upstream ramp values and remaps each one to a warm equivalent **at the
 * same lightness**, which is what keeps every contrast relationship the product
 * relies on intact while moving the hue to bronze and sand.
 *
 * The accent ladder and the alias overrides are explicit, because the brand
 * names specific values for those roles.
 *
 *    node mktdev/branding/build-palette.mjs      # regenerate palette.css
 *
 * `index.js` reads the generated file at load time, so a change here needs the
 * command above and a server restart.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const upstream = readFileSync(join(root, 'packages/client/ui-theme/src/styles/design-platform.css'), 'utf8').split('\n')

/** MKTDEV brand palette. */
const BRAND = {
  bronze: '#7B5C3A',
  gold: '#C49A3C',
  goldLight: '#E8C860',
  bronzeDark: '#8B6B4A',
  bronzeMedium: '#B8986E',
  bronzeDeep: '#5C3D20',
  goldDark: '#A07830',
  sandLight: '#F9F6F1',
  sand: '#F5F0E8',
  svgLight: '#F3EDE4',
  svgMedium: '#D9C7AD',
  night: '#06090D',
  cardGlass: 'rgba(18, 22, 28, 0.85)',
  textPrimary: '#0D1117',
  textSecondary: '#4A4035',
  surfaceWarm: '#FDFBF7',
}

/** Hue and saturation of the warm grey ramp that replaces the cold ones. */
const WARM = { hue: 32, saturation: 0.28 }
const WARM_DARK = { hue: 32, saturation: 0.22 }

const grab = (block) => {
  const out = {}
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}
const LIGHT_STATIC = grab(upstream.slice(3, 84).join('\n'))
const DARK_STATIC = grab(upstream.slice(84, 165).join('\n'))

const toRgb = (value) => {
  const m = String(value).match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  return m ? [+m[1], +m[2], +m[3]] : null
}
const toHsl = ([r, g, b]) => {
  const [nr, ng, nb] = [r / 255, g / 255, b / 255]
  const max = Math.max(nr, ng, nb), min = Math.min(nr, ng, nb)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === nr ? ((ng - nb) / d + (ng < nb ? 6 : 0)) : max === ng ? ((nb - nr) / d + 2) : ((nr - ng) / d + 4)
  return { h: h * 60, s, l }
}
const warm = (value, profile) => {
  const rgb = toRgb(value)
  if (!rgb) return null
  const { l } = toHsl(rgb)
  const s = Math.round(profile.saturation * 100)
  const h = profile.hue
  const pct = Math.round(l * 100)
  return `hsl(${String(h)} ${String(s)}% ${String(pct)}%)`
}

/** Bronze and gold ladder for the accent ramps, darkest first. */
const ACCENT = {
  'dsw-static-deepseek-900': BRAND.bronzeDeep,
  'dsw-static-deepseek-800': '#4A3120',
  'dsw-static-deepseek-700-delete': '#54381F',
  'dsw-static-deepseek-600': '#6B4E31',
  'dsw-static-deepseek-500': BRAND.bronze,
  'dsw-static-deepseek-450': BRAND.goldDark,
  'dsw-static-deepseek-400': BRAND.gold,
  'dsw-static-deepseek-300': '#D6B168',
  'dsw-static-deepseek-200': '#E4C98E',
  'dsw-static-deepseek-100': '#EFDDB4',
  'dsw-static-deepseek-50': '#F7EDD4',
  'dsw-static-blue-950': '#3A2718',
  'dsw-static-blue-900': '#4A3120',
  'dsw-static-blue-800': '#5C3D20',
  'dsw-static-blue-600': '#7B5C3A',
  'dsw-static-blue-500': '#A07830',
  'dsw-static-blue-450': '#B8986E',
  'dsw-static-blue-400': '#C49A3C',
  'dsw-static-blue-300': '#D6B168',
  'dsw-static-blue-100': '#EFDDB4',
  'dsw-static-blue-75': '#F4E7CC',
  'dsw-static-blue-50p': '#F6EBD6',
  'dsw-static-blue-50': '#F7EDD4',
  'dsw-static-amber-900': '#3A2718',
  'dsw-static-amber-600': BRAND.goldDark,
  'dsw-static-amber-500': BRAND.gold,
  'dsw-static-amber-400': '#D9B96A',
  'dsw-static-amber-100': '#F9F0D8',
}

/** Aliases the brand names directly, per mode. */
const LIGHT_ALIAS = {
  'dsw-alias-bg-base': BRAND.sandLight,
  'dsw-alias-bg-layer-1': BRAND.sand,
  'dsw-alias-bg-layer-2': BRAND.surfaceWarm,
  'dsw-alias-bg-layer-3': BRAND.surfaceWarm,
  'dsw-alias-bg-document-preview': BRAND.svgLight,
  'dsw-alias-bg-module-platform': BRAND.sand,
  'dsw-alias-bg-multi-select': '#F0E9DD',
  'dsw-alias-bg-overlay': '#E8DFD0',
  'dsw-alias-bg-skeleton': 'rgba(123, 92, 58, 0.07)',
  'dsw-alias-border-l1': 'rgba(123, 92, 58, 0.10)',
  'dsw-alias-border-l2': 'rgba(123, 92, 58, 0.16)',
  'dsw-alias-border-l2-darkmode-thin': 'rgba(123, 92, 58, 0.12)',
  'dsw-alias-border-l3': 'rgba(123, 92, 58, 0.22)',
  'dsw-alias-border-l4': 'rgba(123, 92, 58, 0.30)',
  'dsw-alias-interactive-bg-hover': 'rgba(123, 92, 58, 0.06)',
  'dsw-alias-interactive-bg-active': 'rgba(123, 92, 58, 0.10)',
  'dsw-alias-interactive-bg-hover-accent': 'rgba(196, 154, 60, 0.18)',
  'dsw-alias-button-tool-bar-fill': 'rgba(92, 80, 66, 0.5)',
  'dsw-alias-button-tool-bar-hover': 'rgba(92, 80, 66, 0.6)',
  'dsw-alias-button-tool-bar-fill-invisible': 'rgba(31, 26, 20, 0.36)',
  'dsw-alias-brand-primary': BRAND.bronze,
  'dsw-alias-brand-text': BRAND.bronze,
  'dsw-alias-button-primary-fill': `linear-gradient(135deg, ${BRAND.bronzeDark} 0%, ${BRAND.bronze} 45%, ${BRAND.bronzeDeep} 100%)`,
  'dsw-alias-button-primary-hover': BRAND.bronzeDark,
  /* Gold belongs to hover, badges and decoration in this brand, so the primary
     button stays bronze with white text: every stop of that gradient clears
     4.8:1. The brand's gold button gradient cannot carry any single text
     colour at 4.5:1, because it spans light gold to deep bronze; it is kept
     below as a decorative variable rather than the primary fill. */
  'dsw-alias-label-primary-foreground': '#FFFFFF',
  /* Text roles. The brand's tertiary grey measures below the readable
     threshold on the sand background, so the four label roles are darkened
     until each clears 4.5:1; see the README table. */
  'dsw-alias-label-primary': BRAND.textPrimary,
  'dsw-alias-label-secondary': BRAND.textSecondary,
  'dsw-alias-label-tertiary': '#6E6151',
  'dsw-alias-label-caption': '#756A5A',
  'dsw-alias-label-dimmed': '#7F7363',
  'dsw-alias-markdown-placeholder': '#7F7363',
  'dsw-menu-surface-fill': 'rgba(249, 246, 241, 0.62)',
}

const DARK_ALIAS = {
  'dsw-alias-bg-base': BRAND.night,
  'dsw-alias-bg-document-preview': BRAND.night,
  'dsw-alias-bg-layer-1': '#0E1218',
  'dsw-alias-bg-layer-2': BRAND.cardGlass,
  'dsw-alias-bg-layer-3': '#1A1F26',
  'dsw-alias-bg-module-platform': '#141A21',
  'dsw-alias-bg-multi-select': '#1A1F26',
  'dsw-alias-bg-overlay': '#2A3038',
  'dsw-alias-border-l1': 'rgba(249, 246, 241, 0.08)',
  'dsw-alias-border-l2': 'rgba(249, 246, 241, 0.14)',
  'dsw-alias-border-l2-darkmode-thin': 'rgba(249, 246, 241, 0.08)',
  'dsw-alias-border-l3': 'rgba(249, 246, 241, 0.18)',
  'dsw-alias-border-l4': 'rgba(249, 246, 241, 0.24)',
  'dsw-alias-interactive-bg-hover': 'rgba(196, 154, 60, 0.10)',
  'dsw-alias-interactive-bg-active': 'rgba(196, 154, 60, 0.16)',
  'dsw-alias-interactive-bg-hover-accent': 'rgba(196, 154, 60, 0.24)',
  'dsw-alias-button-tool-bar-fill': 'rgba(92, 80, 66, 0.5)',
  'dsw-alias-button-tool-bar-hover': 'rgba(92, 80, 66, 0.6)',
  'dsw-alias-brand-primary': BRAND.gold,
  'dsw-alias-brand-text': BRAND.goldLight,
  'dsw-alias-button-primary-fill': BRAND.gold,
  'dsw-alias-button-primary-hover': BRAND.goldLight,
  'dsw-alias-label-primary': BRAND.sandLight,
  'dsw-alias-label-secondary': '#D5CEC4',
  'dsw-alias-label-tertiary': '#B5A896',
  'dsw-alias-label-caption': '#A89B8A',
  'dsw-alias-label-dimmed': '#9A8E7D',
  'dsw-alias-markdown-placeholder': '#9A8E7D',
  'dsw-menu-surface-fill': 'rgba(18, 22, 28, 0.72)',
}

const lines = []
const emit = (target, decls) => { for (const [k, v] of Object.entries(decls)) target.push(`  --${k}: ${v};`) }

/** Remap every cold neutral step to the warm ramp, preserving lightness. */
for (const [name, value] of Object.entries(LIGHT_STATIC)) {
  if (!/^dsw-static-neutral/.test(name)) continue
  const mapped = name === 'dsw-static-neutral-00' ? BRAND.surfaceWarm : warm(value, WARM)
  if (mapped) lines.push([name, mapped, 'light'])
}
for (const [name, value] of Object.entries(DARK_STATIC)) {
  if (!/^dsw-static-neutral/.test(name)) continue
  const mapped = warm(value, WARM_DARK)
  if (mapped) lines.push([name, mapped, 'dark'])
}

const lightDecls = new Map()
const darkDecls = new Map()
for (const [name, value, mode] of lines) (mode === 'light' ? lightDecls : darkDecls).set(name, value)
for (const [name, value] of Object.entries(ACCENT)) {
  lightDecls.set(name, value)
  darkDecls.set(name, value)
}
/* Dark mode reads its accents from the gold end, so the accent ramp keeps
   enough punch on the night background. */
darkDecls.set('dsw-static-deepseek-500', BRAND.gold)
darkDecls.set('dsw-static-deepseek-450', BRAND.goldLight)
darkDecls.set('dsw-static-deepseek-400', BRAND.goldLight)
for (const [name, value] of Object.entries(LIGHT_ALIAS)) lightDecls.set(name, value)
for (const [name, value] of Object.entries(DARK_ALIAS)) darkDecls.set(name, value)

const render = (decls) => [...decls].map(([k, v]) => `  --${k}: ${v};`).join('\n')

const css = `/*
 * MKTDEV brand palette. GENERATED FILE, do not edit by hand.
 * Source: mktdev/branding/build-palette.mjs
 *
 * Two override layers over the upstream tokens: the cold neutral ramps are
 * remapped to a warm sand ramp at identical lightness, the blue accent ramp
 * becomes a bronze and gold ladder, and the aliases the brand names directly
 * are set explicitly. The higher-specificity selectors outrank the upstream
 * \`body\` rules whatever the stylesheet order.
 */
html:root body {
${render(lightDecls)}
  /* Decorative gold gradient from the brand sheet, kept available for artwork
     and accents. It is not the primary button fill: no single text colour
     clears 4.5:1 across it. */
  --mktdev-degrade-or: linear-gradient(135deg, ${BRAND.gold} 0%, ${BRAND.goldDark} 30%, ${BRAND.bronzeDark} 60%, ${BRAND.gold} 100%);
  --dsh-boot-bg: ${BRAND.sandLight};
  background-color: ${BRAND.sandLight};
  background-image: radial-gradient(278.83% 64.59% at 47.99% 60.98%, #FDFAF5 0%, #F7F2E8 100%);
}

html:root body[data-ds-dark-theme] {
${render(darkDecls)}
  --dsh-boot-bg: ${BRAND.night};
  background-color: ${BRAND.night};
  background-image: none;
}
`

writeFileSync(join(here, 'palette.css'), css)
console.log(`palette.css written: ${String(lightDecls.size)} light tokens, ${String(darkDecls.size)} dark tokens`)
