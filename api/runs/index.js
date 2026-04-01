import { eq, and } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { runner } = req.query
  if (!runner) return res.status(400).json({ error: 'runner param required' })

  try {
    const runnerRow = await db.query.runners.findFirst({
      where: eq(schema.runners.slug, runner),
    })
    if (!runnerRow) return res.status(404).json({ error: 'Runner not found' })

    const list = await db
      .select()
      .from(schema.runs)
      .where(and(eq(schema.runs.runnerId, runnerRow.id), eq(schema.runs.status, 'approved')))
      .orderBy(schema.runs.date)

    res.json(list)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
