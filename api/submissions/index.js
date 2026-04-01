import { eq } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { Resend } from 'resend'

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

    // Send email alert to admin
    if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const runner = await db.query.runners.findFirst({
          where: eq(schema.runners.id, parseInt(runnerId)),
        })
        await resend.emails.send({
          from: 'HoRunShio <noreply@horunshio.com>',
          to: process.env.ADMIN_EMAIL,
          subject: `New run submission: ${eventName}`,
          html: `
            <h2>New Run Submission</h2>
            <p><strong>Runner:</strong> ${runner?.name || runnerId}</p>
            <p><strong>Event:</strong> ${eventName}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Distance:</strong> ${km} km</p>
            <p><strong>Time:</strong> ${Math.floor(timeSeconds / 3600)}:${String(Math.floor((timeSeconds % 3600) / 60)).padStart(2, '0')}:${String(timeSeconds % 60).padStart(2, '0')}</p>
            ${link ? `<p><strong>Link:</strong> <a href="${link}">${link}</a></p>` : ''}
            <p><a href="${process.env.SITE_URL || 'https://horunshio.vercel.app'}/admin/dashboard">Review in admin dashboard →</a></p>
          `,
        })
      } catch (emailErr) {
        console.error('Email send failed:', emailErr)
        // Don't fail the submission if email fails
      }
    }

    res.status(201).json({ id: submission.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
