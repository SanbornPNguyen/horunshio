import { eq, and } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'

// GET /api/runs?runner=slug — one runner's approved runs
// GET /api/runs             — every approved run, with runner name/slug (events pages)
// Locked runners (admin easter egg) are withheld from both.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { runner } = req.query
  const approved = eq(schema.runs.status, 'approved')

  try {
    let list
    if (runner) {
      const runnerRow = await db.query.runners.findFirst({
        where: eq(schema.runners.slug, runner),
      })
      if (!runnerRow) return res.status(404).json({ error: 'Runner not found' })
      if (runnerRow.locked) {
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
        return res.status(403).json({ error: 'Locked', locked: true })
      }
      list = await db.select().from(schema.runs)
        .where(and(eq(schema.runs.runnerId, runnerRow.id), approved))
        .orderBy(schema.runs.date)
    } else {
      const rows = await db
        .select({ run: schema.runs, runnerName: schema.runners.name, runnerSlug: schema.runners.slug })
        .from(schema.runs)
        .innerJoin(schema.runners, eq(schema.runs.runnerId, schema.runners.id))
        .where(and(approved, eq(schema.runners.locked, false)))
        .orderBy(schema.runs.date)
      list = rows.map(r => ({ ...r.run, runnerName: r.runnerName, runnerSlug: r.runnerSlug }))
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    res.json(list)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
