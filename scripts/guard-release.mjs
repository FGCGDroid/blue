import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const BANNED = ['.git', '.env', '.sql', '.pem', '.key', 'id_rsa', 'id_ed25519', '.npmrc']
export function isBanned(name) {
  return BANNED.some((suffix) => (suffix.startsWith('.') ? name === suffix || name.endsWith(suffix) : name === suffix))
}

export function findSensitiveFiles(root) {
  const hits = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (isBanned(entry.name)) hits.push(full)
      else if (entry.isDirectory()) walk(full)
    }
  }
  walk(root)
  return hits
}

export function assertNoSensitiveFiles(root) {
  const hits = findSensitiveFiles(root)
  if (hits.length > 0) {
    console.error('✗ 发布包包含敏感文件，已中止发布：')
    for (const hit of hits) console.error('  ' + hit.replace(root, ''))
    throw new Error('SENSITIVE_FILES_IN_PACKAGE')
  }
  console.log('✓ 发布包敏感文件检查通过')
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (invokedDirectly) {
  const target = process.argv[2] || 'dist'
  try {
    assertNoSensitiveFiles(target)
  } catch {
    process.exit(1)
  }
}
