import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

// Compile only the pure modules using the existing TypeScript dependency.
// No browser, runtime TS loader, or additional test dependencies are required.
const directory = await mkdtemp(join(tmpdir(), 'math-worksheet-tests-'))
const names = ['generator', 'advanced-generator', 'worksheet-link', 'problem-view']
for (const name of names) {
  const source = await readFile(new URL(`../src/${name}.ts`, import.meta.url), 'utf8')
  let output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  for (const dependency of names) {
    output = output.replaceAll(`from './${dependency}'`, `from './${dependency}.mjs'`)
  }
  await writeFile(join(directory, `${name}.mjs`), output)
}
export const generator = await import(pathToFileURL(join(directory, 'generator.mjs')))
export const advanced = await import(pathToFileURL(join(directory, 'advanced-generator.mjs')))
export const links = await import(pathToFileURL(join(directory, 'worksheet-link.mjs')))
export const view = await import(pathToFileURL(join(directory, 'problem-view.mjs')))
await rm(directory, { recursive: true, force: true })
