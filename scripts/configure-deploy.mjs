#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(new URL('..', import.meta.url).pathname)
const dryRun = process.argv.includes('--dry-run')
const positionalDomain = process.argv.slice(2).find((item) => !item.startsWith('--')) || ''
const rawDomain = process.env.DEPLOY_DOMAIN || positionalDomain

if (!rawDomain.trim()) {
  console.error('DEPLOY_DOMAIN is required, for example: DEPLOY_DOMAIN=toolbox.example.com node scripts/configure-deploy.mjs')
  process.exit(1)
}

function normalizeOrigin(value) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
  const url = new URL(withProtocol)

  if (url.protocol !== 'https:') {
    throw new Error('DEPLOY_DOMAIN must resolve to an https:// origin')
  }

  url.pathname = ''
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

function replaceInFile(file, replacements) {
  const path = resolve(repoRoot, file)
  let content = readFileSync(path, 'utf8')
  let next = content

  replacements.forEach(([from, to]) => {
    next = next.replace(from, to)
  })

  if (next !== content) {
    if (dryRun) {
      console.log(`would update ${file}`)
    } else {
      writeFileSync(path, next, 'utf8')
      console.log(`updated ${file}`)
    }
  } else {
    console.log(`unchanged ${file}`)
  }
}

const origin = normalizeOrigin(rawDomain)
const host = new URL(origin).host
const apiBase = `${origin}/api`
const updatesBase = `${origin}/updates/desktop`

const replacements = [
  {
    file: 'cool-electron/src/main/toolbox/index.ts',
    values: [[/https:\/\/deploy-domain\.example\/api/g, apiBase]]
  },
  {
    file: 'cool-electron/electron-builder.yml',
    values: [[/https:\/\/deploy-domain\.example\/updates\/desktop/g, updatesBase]]
  },
  {
    file: 'cool-electron/package.json',
    values: [[/https:\/\/deploy-domain\.example/g, origin]]
  },
  {
    file: 'cool-electron/.env.production.example',
    values: [[/https:\/\/deploy-domain\.example\/api/g, apiBase]]
  },
  {
    file: 'cool-service-master/vue/.env.production.example',
    values: [[/https:\/\/deploy-domain\.example/g, origin]]
  },
  {
    file: 'cool-service-master/vue/src/config/proxy.ts',
    values: [[/https:\/\/deploy-domain\.example/g, origin]]
  },
  {
    file: 'cool-service-master/vue/packages/vite-plugin/src/index.ts',
    values: [[/https:\/\/deploy-domain\.example\/api/g, apiBase]]
  },
  {
    file: 'docs/deploy/nginx.brmtool.conf.example',
    values: [[/deploy-domain\.example/g, host]]
  },
  {
    file: 'docs/deploy/release.md',
    values: [[/https:\/\/deploy-domain\.example/g, origin], [/deploy-domain\.example/g, host]]
  }
]

replacements.forEach(({ file, values }) => replaceInFile(file, values))

console.log(`\nMode: ${dryRun ? 'dry-run' : 'write'}`)
console.log(`Deploy origin: ${origin}`)
console.log(`API base: ${apiBase}`)
console.log(`Updates base: ${updatesBase}`)
