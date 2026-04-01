import { eq } from 'drizzle-orm'
import { db, schema } from '../../_lib/db.js'
import { verifyAuth } from '../../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    await verifyAuth(req)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const pending = await db
      .select({
        id: schema.runs.id,
        eventName: schema.runs.eventName,
        date: schema.runs.date,
        km: schema.runs.km,
        timeSeconds: schema.runs.timeSeconds,
        link: schema.runs.link,
        status: schema.runs.status,
        submittedAt: schema.runs.submittedAt,
        runnerName: schema.runners.name,
        runnerSlug: schema.runners.slug,
        runnerId: schema.runners.id,
      })
      .from(schema.runs)
      .innerJoin(schema.runners, eq(schema.runs.runnerId, schema.runners.id))
      .where(eq(schema.runs.status, 'pending'))
      .orderBy(schema.runs.submittedAt)

    res.json(pending)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
