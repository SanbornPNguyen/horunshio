import { eq } from 'drizzle-orm'
import { db, schema } from '../../_lib/db.js'
import { verifyAuth } from '../../_lib/auth.js'
import { readBody, parseRun, pgCode } from '../../_lib/validate.js'

// PATCH  /api/admin/runs/:id — replace a run's fields (and optionally status)
// DELETE /api/admin/runs/:id
export default async function handler(req, res) {
  if (!['PATCH', 'DELETE'].includes(req.method)) return res.status(405).end()

  try {
    await verifyAuth(req)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const id = Number(req.query.id)
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Bad id' })

  try {
    if (req.method === 'DELETE') {
      const [deleted] = await db.delete(schema.runs).where(eq(schema.runs.id, id)).returning()
      if (!deleted) return res.status(404).json({ error: 'Run not found' })
      return res.status(204).end()
    }

    const { run, error } = parseRun(readBody(req), { allowStatus: true })
    if (error) return res.status(400).json({ error })
    const [updated] = await db.update(schema.runs).set(run).where(eq(schema.runs.id, id)).returning()
    if (!updated) return res.status(404).json({ error: 'Run not found' })
    res.json(updated)
  } catch (err) {
    if (pgCode(err) === '23503') return res.status(400).json({ error: 'Unknown runner' })
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
