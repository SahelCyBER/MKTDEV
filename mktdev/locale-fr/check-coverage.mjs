/**
 * Report the French translation coverage of this pack.
 *
 * Upstream adds interface strings over time. A missing key is harmless at
 * runtime, because lookup falls back to English, but it is still an English
 * string in a French interface. Run this after every upstream sync to see
 * exactly what needs translating.
 *
 *   node mktdev/locale-fr/check-coverage.mjs
 *
 * Exit code is 0 when every upstream key has a French value, 1 otherwise, so
 * the command is usable as a check. Keys are read from the client packages of
 * this checkout through the TypeScript parser, resolving imports and re-exports
 * to the real dictionary literals.
 */
import ts from 'typescript'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const dictDir = join(root, 'mktdev', 'locale-fr', 'dictionaries')

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) { if (!['node_modules', 'lib', 'tests'].includes(e.name)) walk(p, out) }
    else if (/\.tsx?$/.test(e.name) && !/\.spec\./.test(e.name)) out.push(p)
  }
  return out
}

/** Strip `satisfies`, `as`, and parentheses so the real literal is reachable. */
const unwrap = (n) => {
  for (;;) {
    if (ts.isSatisfiesExpression(n) || ts.isAsExpression(n) || ts.isParenthesizedExpression(n)) { n = n.expression; continue }
    return n
  }
}

const decls = new Map()
const imps = new Map()
const reexports = new Map()
const calls = []

for (const pkg of readdirSync(join(root, 'packages', 'client'))) {
  const srcDir = join(root, 'packages', 'client', pkg, 'src')
  if (!existsSync(srcDir) || !statSync(srcDir).isDirectory()) continue
  for (const f of walk(srcDir)) {
    const sf = ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    const d = new Map(), im = new Map(), re = []
    decls.set(f, d); imps.set(f, im); reexports.set(f, re)
    const visit = (node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) d.set(node.name.text, node.initializer)
      if (ts.isImportDeclaration(node) && typeof node.moduleSpecifier.text === 'string' && node.importClause?.namedBindings
          && ts.isNamedImports(node.importClause.namedBindings)) {
        for (const s of node.importClause.namedBindings.elements) {
          im.set(s.name.text, { source: node.moduleSpecifier.text, orig: s.propertyName ? s.propertyName.text : s.name.text })
        }
      }
      if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        re.push({
          source: node.moduleSpecifier.text,
          names: node.exportClause && ts.isNamedExports(node.exportClause)
            ? node.exportClause.elements.map(e => ({ local: e.propertyName ? e.propertyName.text : e.name.text, exported: e.name.text }))
            : null,
        })
      }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
          && node.expression.name.text === 'register' && node.arguments.length >= 2) {
        const dicts = unwrap(node.arguments[1])
        if (ts.isObjectLiteralExpression(dicts)) {
          for (const prop of dicts.properties) {
            let loc, init
            if (ts.isPropertyAssignment(prop)) {
              loc = ts.isIdentifier(prop.name) ? prop.name.text : ts.isStringLiteral(prop.name) ? prop.name.text : undefined
              init = prop.initializer
            } else if (ts.isShorthandPropertyAssignment(prop)) { loc = prop.name.text; init = prop.name }
            else continue
            if (loc === 'en') calls.push({ nsArg: node.arguments[0], file: f, init })
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
}

function origin(file, name, depth = 0) {
  if (depth > 6) return undefined
  const own = decls.get(file)?.get(name)
  if (own) return { file, node: own }
  const im = imps.get(file)?.get(name)
  if (!im) {
    for (const r of reexports.get(file) ?? []) {
      const target = r.names === null ? name : r.names.find(n => n.exported === name)?.local
      if (target === undefined) continue
      const rb = join(dirname(file), r.source)
      for (const cand of [rb, `${rb}.ts`, `${rb}.tsx`, join(rb, 'index.ts')]) {
        if (decls.has(cand)) { const f = origin(cand, target, depth + 1); if (f) return f }
      }
    }
    return undefined
  }
  const base = join(dirname(file), im.source)
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (decls.has(cand)) return origin(cand, im.orig, depth + 1)
  }
  return undefined
}

const textOf = (node, file, depth = 0) => {
  const n = unwrap(node)
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text
  if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const l = textOf(n.left, file, depth + 1), r = textOf(n.right, file, depth + 1)
    return l === undefined || r === undefined ? undefined : l + r
  }
  if (ts.isIdentifier(n) && depth < 6) {
    const o = origin(file, n.text)
    return o ? textOf(o.node, o.file, depth + 1) : undefined
  }
  return undefined
}

function objectKeys(node, file) {
  const n = unwrap(node)
  if (!ts.isObjectLiteralExpression(n)) return undefined
  const keys = []
  for (const prop of n.properties) {
    const name = ts.isPropertyAssignment(prop)
      ? (ts.isStringLiteral(prop.name) || ts.isNumericLiteral(prop.name) ? prop.name.text : ts.isIdentifier(prop.name) ? prop.name.text : undefined)
      : ts.isShorthandPropertyAssignment(prop) ? prop.name.text : undefined
    if (name !== undefined) keys.push(name)
  }
  return keys
}

const upstream = new Map()
for (const c of calls) {
  const ns = ts.isStringLiteral(c.nsArg) ? c.nsArg.text : textOf(c.nsArg, c.file)
  if (ns === undefined) continue
  let node = unwrap(c.init), file = c.file
  if (ts.isIdentifier(node)) { const o = origin(c.file, node.text); if (!o) continue; node = unwrap(o.node); file = o.file }
  const keys = objectKeys(node, file)
  if (keys) upstream.set(ns, keys)
}

let missingTotal = 0, staleTotal = 0
for (const [ns, keys] of [...upstream].sort(([a], [b]) => a.localeCompare(b))) {
  const path = join(dictDir, `${ns}.json`)
  if (!existsSync(path)) {
    console.log(`MANQUANT   ${ns} : ${String(keys.length)} clés, aucun dictionnaire français`)
    missingTotal += keys.length
    continue
  }
  const fr = JSON.parse(readFileSync(path, 'utf8'))
  const missing = keys.filter(k => !(k in fr))
  const stale = Object.keys(fr).filter(k => !keys.includes(k))
  missingTotal += missing.length; staleTotal += stale.length
  if (missing.length || stale.length) {
    console.log(`${missing.length ? 'INCOMPLET' : 'OBSOLÈTE '} ${ns} : ${String(missing.length)} à traduire, ${String(stale.length)} sans équivalent amont`)
    for (const k of missing.slice(0, 8)) console.log(`    à traduire : ${k}`)
    for (const k of stale.slice(0, 5)) console.log(`    obsolète   : ${k}`)
  }
}

console.log('')
console.log(`namespaces amont : ${String(upstream.size)}`)
console.log(`clés à traduire  : ${String(missingTotal)}`)
console.log(`clés obsolètes   : ${String(staleTotal)}`)
process.exitCode = missingTotal === 0 ? 0 : 1
