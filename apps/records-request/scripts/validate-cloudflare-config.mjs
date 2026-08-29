import { readFile } from 'node:fs/promises'

const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8').then((text) => text.replace(/^\s*\/\/.*$/gm, '')))

const ids = []
for (const db of config.d1_databases ?? []) ids.push(db.database_id)
for (const env of Object.values(config.env ?? {})) {
  for (const db of env.d1_databases ?? []) ids.push(db.database_id)
}

const placeholders = ids.filter((id) => typeof id !== 'string' || id.includes('REPLACE_WITH_REAL_'))
if (placeholders.length) {
  console.error(`Cloudflare D1 configuration is not production-ready: ${placeholders.length} database ID placeholder(s) remain.`)
  process.exit(1)
}

console.log('Cloudflare D1 configuration contains concrete database IDs.')
