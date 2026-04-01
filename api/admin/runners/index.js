import { db, schema } from '../../_lib/db.js'
import { verifyAuth } from '../../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    await verifyAuth(req)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { name, slug } = req.body
  if (!name || !slug) return res.status(400).json({ error: 'name and slug required' })

  // Validate slug: lowercase alphanumeric and hyphens only
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: 'slug must be lowercase alphanumeric with hyphens only' })
  }

  try {
    const [runner] = await db
      .insert(schema.runners)
      .values({ name, slug })
      .returning()
    res.status(201).json(runner)
  } catch (err) {
    if (err.message?.includes('unique')) {
      return res.status(409).json({ error: 'Slug already taken' })
    }
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
