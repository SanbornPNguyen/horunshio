import { db, schema } from '../../_lib/db.js'
import { verifyAuth } from '../../_lib/auth.js'
import { readBody, pgCode } from '../../_lib/validate.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    await verifyAuth(req)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const body = readBody(req)
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
  if (!name || !slug || name.length > 255 || slug.length > 255) {
    return res.status(400).json({ error: 'name and slug required (max 255 chars)' })
  }

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
    if (pgCode(err) === '23505') {
      return res.status(409).json({ error: 'Slug already taken' })
    }
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
