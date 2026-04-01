import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema.js'
import { runners, runs } from './schema.js'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL env var is required')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const db = drizzle(sql, { schema })

// Raw data from the original hardcoded HTML
const RAW = [
  { n: 'Turkey Trot 2023',                  d: '11/23/2023', km: 10.0, t: '1:45:14' },
  { n: 'Turkey Trot 2024',                  d: '11/28/2024', km: 10.0, t: '1:36:42' },
  { n: 'Santa Monica-Venice Xmas Run 2024', d: '12/14/2024', km: 10.0, t: '1:35:04' },
  { n: 'LA Chinatown Firecracker 2025',     d: '03/08/2025', km: 10.0, t: '1:26:01' },
  { n: 'Santa Barbara Wine Country 2025',   d: '05/10/2025', km: 21.1, t: '3:22:28' },
  { n: 'Santa Monica Classic 2025',         d: '09/07/2025', km: 10.0, t: '1:33:57' },
  { n: 'Surf City 10K 2025',                d: '09/14/2025', km: 10.0, t: '1:28:22' },
  { n: 'LA Dodgers Foundation Run',         d: '09/27/2025', km: 10.0, t: '1:36:54' },
  { n: 'Malibu Run',                        d: '11/16/2025', km: 21.1, t: '3:28:10' },
  { n: 'Turkey Trot 2025',                  d: '11/27/2025', km: 10.0, t: '1:40:46' },
  { n: 'Santa Monica-Venice Xmas Run 2025', d: '12/13/2025', km: 10.0, t: '1:29:17' },
  { n: 'LA Chinatown Firecracker 2026',     d: '03/01/2026', km: 10.0, t: '1:37:24' },
]

function parseTime(t) {
  const p = t.split(':').map(Number)
  return p[0] * 3600 + p[1] * 60 + (p[2] || 0)
}

// Convert MM/DD/YYYY to YYYY-MM-DD
function toISODate(d) {
  const [m, day, y] = d.split('/')
  return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`
}

async function seed() {
  console.log('Seeding database...')

  // Insert the runner
  const [runner] = await db
    .insert(runners)
    .values({ name: 'Sanborn', slug: 'sanborn' })
    .onConflictDoNothing()
    .returning()

  if (!runner) {
    console.log('Runner "sanborn" already exists, skipping runner insert.')
    const existing = await db.query.runners.findFirst({
      where: (r, { eq }) => eq(r.slug, 'sanborn'),
    })
    if (!existing) {
      console.error('Could not find or create runner')
      process.exit(1)
    }
    console.log(`Using existing runner id=${existing.id}`)
    await insertRuns(existing.id)
  } else {
    console.log(`Created runner: ${runner.name} (id=${runner.id})`)
    await insertRuns(runner.id)
  }

  console.log('Done!')
}

async function insertRuns(runnerId) {
  for (const r of RAW) {
    await db
      .insert(runs)
      .values({
        runnerId,
        eventName: r.n,
        date: toISODate(r.d),
        km: String(r.km),
        timeSeconds: parseTime(r.t),
        status: 'approved',
      })
      .onConflictDoNothing()
    console.log(`  Inserted: ${r.n}`)
  }
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
