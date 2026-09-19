import { eq, desc } from 'drizzle-orm'
import { db, schema } from '../../_lib/db.js'
import { verifyAuth } from '../../_lib/auth.js'
import { readBody, parseRun, pgCode } from '../../_lib/validate.js'

// GET  /api/admin/runs?runnerId=1  — every run for a runner, any status
// POST /api/admin/runs             — add an approved run
export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end()

  try {
    await verifyAuth(req)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    if (req.method === 'GET') {
      const runnerId = Number(req.query.runnerId)
      if (!Number.isInteger(runnerId)) return res.status(400).json({ error: 'runnerId required' })
      const list = await db.select().from(schema.runs)
        .where(eq(schema.runs.runnerId, runnerId))
        .orderBy(desc(schema.runs.date))
      return res.json(list)
    }

    const { run, error } = parseRun(readBody(req))
    if (error) return res.status(400).json({ error })
    const [created] = await db
      .insert(schema.runs)
      .values({ ...run, status: 'approved' })
      .returning()
    res.status(201).json(created)
  } catch (err) {
    if (pgCode(err) === '23503') return res.status(400).json({ error: 'Unknown runner' })
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
