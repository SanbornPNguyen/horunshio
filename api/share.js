import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { eq, and } from 'drizzle-orm'
import { db, schema } from './_lib/db.js'
import { processRuns, computeStats, yearReview, sortDistKeys, formatTime, eventSlug } from '../src/lib/utils.js'

// Serves the SPA's index.html with Open Graph tags filled in, so links to
// /r/:slug, /r/:slug/:year and /events/:event preview nicely in chat apps.
// Crawlers don't run JS, so these can't come from React.

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

async function runnerMeta(slug, year) {
  const runner = await db.query.runners.findFirst({ where: eq(schema.runners.slug, slug) })
  if (!runner) return null
  const raw = await db.select().from(schema.runs)
    .where(and(eq(schema.runs.runnerId, runner.id), eq(schema.runs.status, 'approved')))
  const runs = processRuns(raw)

  if (year) {
    const y = yearReview(runs, Number(year))
    if (!y.count) return null
    return {
      title: `${runner.name}'s ${year} in running · HoRunShio`,
      description: `${y.count} races · ${y.km.toFixed(1)} km · ${y.prsSet.length} PR${y.prsSet.length === 1 ? "" : "s"} set`
        + (y.fastest ? ` · fastest: ${y.fastest.eventName}` : ''),
    }
  }

  const { prs, count } = computeStats(runs)
  const prText = sortDistKeys(Object.keys(prs)).map(k => `${k} PR ${formatTime(prs[k].secs)}`)
  return {
    title: `${runner.name} · HoRunShio`,
    description: [`${count} races`, ...prText].join(' · '),
  }
}

async function eventMeta(slug) {
  const rows = await db
    .select({ run: schema.runs, name: schema.runners.name })
    .from(schema.runs)
    .innerJoin(schema.runners, eq(schema.runs.runnerId, schema.runners.id))
    .where(eq(schema.runs.status, 'approved'))
  const entries = rows.filter(r => eventSlug(r.run.eventName) === slug)
    .sort((a, b) => a.run.timeSeconds - b.run.timeSeconds)
  if (!entries.length) return null
  return {
    title: `${entries[0].run.eventName} · HoRunShio`,
    description: entries.slice(0, 5)
      .map((r, i) => `${i + 1}. ${r.name} ${formatTime(r.run.timeSeconds)}`).join(' · '),
  }
}

export default async function handler(req, res) {
  const { slug, year, event } = req.query
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const origin = `${proto}://${req.headers.host}`

  // Deployed: the built page is bundled with this function (vercel.json includeFiles).
  // Fetching it over HTTP would hit Deployment Protection on previews.
  // Local `vercel dev` has no build, so ask Vite for its transformed page instead.
  let html
  try {
    html = /^(localhost|127\.0\.0\.1)(:|$)/.test(req.headers.host)
      ? await (await fetch(`${origin}/index.html`)).text()
      : await readFile(path.join(process.cwd(), 'dist', 'index.html'), 'utf8')
  } catch (err) {
    console.error(err)
    return res.status(502).end()
  }

  try {
    const meta = event ? await eventMeta(event) : await runnerMeta(slug, year)
    if (meta) {
      const url = origin + (event ? `/events/${event}` : `/r/${slug}${year ? `/${year}` : ''}`)
      const tags = [
        `<title>${esc(meta.title)}</title>`,
        `<meta name="description" content="${esc(meta.description)}" />`,
        `<meta property="og:site_name" content="HoRunShio" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:title" content="${esc(meta.title)}" />`,
        `<meta property="og:description" content="${esc(meta.description)}" />`,
        `<meta property="og:url" content="${esc(url)}" />`,
        `<meta name="twitter:card" content="summary" />`,
      ].join('\n  ')
      html = html.replace(/<title>[^<]*<\/title>/, tags)
    }
  } catch (err) {
    console.error(err) // fall through with the plain page
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  res.send(html)
}
