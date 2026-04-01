import { db, schema } from '../../_lib/db.js'
import { verifyAuth } from '../../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    await verifyAuth(req)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const { runnerId, eventName, date, km, timeSeconds, link } = body ?? {}

  if (!runnerId || !eventName || !date || !km || !timeSeconds) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const [run] = await db
      .insert(schema.runs)
      .values({
        runnerId: parseInt(runnerId),
        eventName,
        date,
        km: String(km),
        timeSeconds: parseInt(timeSeconds),
        link: link || null,
        status: 'approved',
      })
      .returning()

    res.status(201).json(run)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
