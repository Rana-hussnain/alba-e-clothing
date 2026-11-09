/**
 * Generates the values the admin login needs in .env.
 *
 *   npx tsx scripts/hash-password.ts            # prompts for a password (hidden input)
 *   npx tsx scripts/hash-password.ts "my pass"  # or pass it as an argument
 *
 * Paste the printed lines into .env (and into your hosting provider's env settings).
 * Do this again any time you want to change the password — old sessions stop working automatically.
 */
import { randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline'
import { hashPassword } from '../src/lib/admin-auth'

async function readHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin })
    for await (const line of rl) return line
    return ''
  }
  process.stdout.write(question)
  return new Promise((resolve) => {
    let value = ''
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    const onData = (ch: string) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n' || c === '\u0004') {
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdin.off('data', onData)
          process.stdout.write('\n')
          return resolve(value)
        }
        if (c === '\u0003') process.exit(1)
        if (c === '\u007f') value = value.slice(0, -1)
        else value += c
      }
    }
    process.stdin.on('data', onData)
  })
}

async function main() {
  const password = process.argv[2] ?? (await readHidden('New admin password: '))
  if (password.length < 12) {
    console.error('Password must be at least 12 characters (use a long passphrase).')
    process.exit(1)
  }
  const hash = await hashPassword(password)
  console.log('\nAdd these to .env:\n')
  console.log('ADMIN_USERNAME="<your username>"')
  console.log(`ADMIN_PASSWORD_HASH="${hash}"`)
  console.log(`ADMIN_SESSION_SECRET="${randomBytes(32).toString('base64url')}"   # only needed once; keep it private`)
}

main()
