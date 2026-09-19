import { createHash, timingSafeEqual } from 'node:crypto'
import { signToken } from '../_lib/auth.js'
import { readBody } from '../_lib/validate.js'

// Hash first so lengths match; timingSafeEqual avoids leaking how much matched.
// Brute force is handled by the Vercel firewall rate-limit rule on this path.
const same = (a, b) => timingSafeEqual(
  createHash('sha256').update(String(a ?? '')).digest(),
  createHash('sha256').update(String(b ?? '')).digest(),
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { username, password } = readBody(req)
  const userOk = same(username, process.env.ADMIN_USERNAME)
  const passOk = same(password, process.env.ADMIN_PASSWORD)
  if (!userOk || !passOk || !process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  try {
    const token = await signToken({ role: 'admin', username })
    res.json({ token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
