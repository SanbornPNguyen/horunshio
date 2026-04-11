import { db, schema } from '../_lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const list = await db.select({
      id: schema.runners.id,
      name: schema.runners.name,
      slug: schema.runners.slug,
    }).from(schema.runners).orderBy(schema.runners.name)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    res.json(list)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
