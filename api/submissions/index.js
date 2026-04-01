import { db, schema } from '../_lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { runnerId, eventName, date, km, timeSeconds, link } = req.body

  if (!runnerId || !eventName || !date || !km || !timeSeconds) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const [submission] = await db
      .insert(schema.runs)
      .values({
        runnerId: parseInt(runnerId),
        eventName,
        date,
        km: String(km),
        timeSeconds: parseInt(timeSeconds),
        link: link || null,
        status: 'pending',
      })
      .returning()

    res.status(201).json({ id: submission.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
