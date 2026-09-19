import { db, schema } from '../_lib/db.js'
import { readBody, parseRun, pgCode } from '../_lib/validate.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { run, error } = parseRun(readBody(req), { requireLink: true })
  if (error) return res.status(400).json({ error })

  try {
    const [submission] = await db
      .insert(schema.runs)
      .values({ ...run, status: 'pending' })
      .returning()
    res.status(201).json({ id: submission.id })
  } catch (err) {
    if (pgCode(err) === '23503') return res.status(400).json({ error: 'Unknown runner' })
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
