import { eq } from 'drizzle-orm'
import { db, schema } from '../../_lib/db.js'
import { verifyAuth } from '../../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).end()

  try {
    await verifyAuth(req)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const { action } = body ?? {}

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action must be approve or reject' })
  }

  try {
    const [updated] = await db
      .update(schema.runs)
      .set({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedAt: new Date(),
      })
      .where(eq(schema.runs.id, parseInt(id)))
      .returning()

    if (!updated) return res.status(404).json({ error: 'Submission not found' })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
