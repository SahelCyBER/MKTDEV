/**
 * MKTDEV brand, host half.
 *
 * Injects the MKTDEV palette and favicon into the served boot document through
 * the `webserver/index-inject` table, so the brand reaches the page before any
 * browser bundle runs. The sidebar mark, the hero mark and the wordmark are the
 * browser half's business (`./client.js`); the window title is a build-time
 * value (`DSH_CLIENT_TITLE`) and is set by the launcher, not here.
 *
 * The palette is a generated stylesheet (`palette.css`, see
 * `build-palette.mjs`), read here at load time so it stays editable as CSS.
 */
import { readFileSync } from 'node:fs'

/** The MKTDEV mark as standalone SVG, used for the document favicon. */
const FAVICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
  + '<rect width="64" height="64" rx="14" fill="#5C3D20"/>'
  + '<path d="M18 46V20l14 14 14-14v26" fill="none" stroke="#E8C860" '
  + 'stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'

/**
 * Replace the document favicon once the head is parsed. The upstream icon
 * links are markup in `index.html`; this row lands ahead of them, so the swap
 * waits for parsing rather than racing those elements.
 */
const FAVICON_SCRIPT = `(() => {
  const href = 'data:image/svg+xml,' + encodeURIComponent(${JSON.stringify(FAVICON_SVG)})
  const install = () => {
    for (const link of document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')) link.remove()
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/svg+xml'
    link.href = href
    document.head.appendChild(link)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install)
  else install()
})()`

/** The generated brand stylesheet, read once per process. */
const PALETTE = readFileSync(new URL('./palette.css', import.meta.url), 'utf8')

/**
 * Contribute the MKTDEV palette and favicon to every served index document.
 * @param ctx - Host plugin context owning the injection listeners.
 */
export function apply(ctx) {
  ctx.on('webserver/index-inject', (table) => {
    table.push({ kind: 'style', text: PALETTE })
    table.push({ kind: 'script', placement: 'head', text: FAVICON_SCRIPT })
  })
}
