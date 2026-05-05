#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const repoRoot = resolve(new URL('..', import.meta.url).pathname)
const strict = process.argv.includes('--strict')
const deployDomain = process.env.DEPLOY_DOMAIN || ''
const updateDir = process.env.UPDATE_DIR || ''

const activeConfigFiles = [
  'cool-electron/src/main/toolbox/index.ts',
  'cool-electron/electron-builder.yml',
  'cool-electron/package.json',
  'cool-service-master/vue/src/config/proxy.ts',
  'cool-service-master/vue/packages/vite-plugin/src/index.ts'
]

const placeholderPatterns = [
  /deploy-domain\.example/,
  /<DEPLOY_DOMAIN>/,
  /show\.cool-admin\.com/,
  /https:\/\/example\.com\/auto-updates/
]

const sensitiveEnvPatterns = [
  /PASSWORD\s*=\s*(?!change-me)/i,
  /SECRET\s*=\s*(?!change-me)/i,
  /TOKEN\s*=\s*(?!change-me)/i,
  /PRIVATE_KEY\s*=/i
]

const errors = []
const warnings = []

function gitFiles() {
  return execFileSync('git', ['ls-files'], {
    cwd: repoRoot,
    encoding: 'utf8'
  })
    .split('\n')
    .filter(Boolean)
}

function readRepoFile(file) {
  return readFileSync(join(repoRoot, file), 'utf8')
}

const trackedFiles = gitFiles()

trackedFiles
  .filter((file) => /(^|\/)\.env(\.|$)/.test(file) && !file.endsWith('.example'))
  .forEach((file) => {
    const content = readRepoFile(file)
    if (sensitiveEnvPatterns.some((pattern) => pattern.test(content))) {
      errors.push(`tracked env file may contain sensitive values: ${file}`)
    } else {
      warnings.push(`tracked env file has no obvious secret but should stay minimal: ${file}`)
    }
  })

activeConfigFiles.forEach((file) => {
  const content = readRepoFile(file)
  const hasPlaceholder = placeholderPatterns.some((pattern) => pattern.test(content))

  if (hasPlaceholder && strict) {
    errors.push(`placeholder remains in active production config: ${file}`)
  } else if (hasPlaceholder) {
    warnings.push(`placeholder remains until DEPLOY_DOMAIN is configured: ${file}`)
  }
})

if (strict && !deployDomain.trim()) {
  errors.push('DEPLOY_DOMAIN is required in strict release checks')
}

if (updateDir) {
  const dir = resolve(repoRoot, updateDir)
  if (!existsSync(dir)) {
    errors.push(`UPDATE_DIR does not exist: ${updateDir}`)
  } else {
    const names = new Set(readdirSync(dir))
    const hasMacMeta = names.has('latest-mac.yml')
    const hasWinMeta = names.has('latest.yml')
    const hasInstallPackage = [...names].some((name) => /\.(dmg|zip|exe)$/i.test(name))

    if (!hasMacMeta) errors.push(`missing latest-mac.yml in UPDATE_DIR: ${updateDir}`)
    if (!hasWinMeta) errors.push(`missing latest.yml in UPDATE_DIR: ${updateDir}`)
    if (!hasInstallPackage) errors.push(`missing desktop installer package in UPDATE_DIR: ${updateDir}`)
  }
} else {
  warnings.push('UPDATE_DIR not set; update package metadata was not checked')
}

warnings.forEach((item) => console.warn(`warn: ${item}`))

if (errors.length) {
  errors.forEach((item) => console.error(`error: ${item}`))
  process.exit(1)
}

console.log(strict ? 'release config strict check passed' : 'release config basic check passed')
