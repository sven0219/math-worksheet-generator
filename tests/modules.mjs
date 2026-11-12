import { readFile, writeFile, mkdtemp, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const sources = [
  'generator.ts',
  'app-settings.ts',
  'ui-constants.ts',
  'problems/utils.ts',
  'problems/specialty-generators.ts',
  'problems/life-generators.ts',
  'advanced-generator.ts',
  'worksheet-link.ts',
  'problem-view.ts',
  'print-templates.ts',
]

const directory = await mkdtemp(join(tmpdir(), 'math-worksheet-tests-'))
await mkdir(join(directory, 'problems'), { recursive: true })

for (const relative of sources) {
  const source = await readFile(new URL(`../src/${relative}`, import.meta.url), 'utf8')
  let output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  output = output.replace(/from '(\.\.?\/[^']+)'/g, (match, path) =>
    path.endsWith('.mjs') ? match : `from '${path}.mjs'`)
  const outPath = join(directory, relative.replace(/\.ts$/, '.mjs'))
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, output)
}

export const generator = await import(pathToFileURL(join(directory, 'generator.mjs')))
export const advanced = await import(pathToFileURL(join(directory, 'advanced-generator.mjs')))
export const links = await import(pathToFileURL(join(directory, 'worksheet-link.mjs')))
export const view = await import(pathToFileURL(join(directory, 'problem-view.mjs')))
export const printTemplates = await import(pathToFileURL(join(directory, 'print-templates.mjs')))
await rm(directory, { recursive: true, force: true })
