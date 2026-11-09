/**
 * Runs automatically before `npm run dev`:
 *   1. creates the database collections/indexes (prisma db push)
 *   2. loads the default products if the database is empty
 * Never blocks the website from starting — if the database can't be reached it explains why.
 * Skip with:  SKIP_DB_SETUP=1 npm run dev
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const say = (m = '') => console.log(m)

if (process.env.SKIP_DB_SETUP === '1') process.exit(0)

if (!existsSync('.env')) {
  say('\n⚠  .env file not found. Copy .env.example to .env and fill it in (see SETUP.md).\n')
  process.exit(0)
}

/** Run a Node script (with .env loaded) without needing a shell — works on Windows, Mac and Linux. */
function runNode(args) {
  return spawnSync(process.execPath, ['--env-file=.env', ...args], { stdio: 'inherit' }).status === 0
}

function bin(id) {
  try {
    return require.resolve(id)
  } catch {
    return null
  }
}

const prisma = bin('prisma/build/index.js')
const tsx = bin('tsx/cli')
if (!prisma || !tsx) {
  say('\n⚠  Packages are missing. Run  npm install  first.\n')
  process.exit(0)
}

say('\n▶ Setting up the database…')
const pushed = runNode([prisma, 'db', 'push', '--skip-generate'])

if (!pushed) {
  say(`
⚠  Could not connect to the database. The website will still start, but products/orders won't work until this is fixed:
   1. Is your internet on?
   2. MongoDB Atlas → Network Access → "Add IP Address" → Allow access from anywhere (0.0.0.0/0)
   3. Is DATABASE_URL in .env correct (username, password, cluster address)?
   Then stop (Ctrl+C) and run  npm run dev  again.
`)
  process.exit(0)
}

if (!runNode([tsx, 'scripts/seed.ts'])) {
  say('\n⚠  Loading the default products failed (see the error above).\n')
} else {
  say('✔ Database ready\n')
}
