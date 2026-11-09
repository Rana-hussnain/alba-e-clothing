/** After `next build`: copy static assets next to the standalone server (works on Windows, Mac and Linux). */
import { cpSync } from 'node:fs'

cpSync('.next/static', '.next/standalone/.next/static', { recursive: true })
cpSync('public', '.next/standalone/public', { recursive: true })
console.log('✔ Static files copied to .next/standalone')
