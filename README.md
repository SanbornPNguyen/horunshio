# HoRunShio

A full-stack running statistics web app for tracking race results across multiple runners. Features a public leaderboard, a run submission workflow with admin approval, and an interactive pace/duration chart.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | [React 18](https://react.dev) + [Vite](https://vitejs.dev) + [React Router v6](https://reactrouter.com) |
| API | [Vercel Serverless Functions](https://vercel.com/docs/functions) (Node.js, `/api` directory) |
| Database | [Neon](https://neon.tech) (serverless Postgres) |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| Auth | [jose](https://github.com/panva/jose) (JWT) — single admin user via environment variables |
| Email | [Resend](https://resend.com) — submission alert emails to admin |
| Hosting | [Vercel](https://vercel.com) |
| Charts | [Chart.js v4](https://www.chartjs.org) |
| Fonts | [Bebas Neue + DM Sans](https://fonts.google.com) via Google Fonts |

## Features

- **Multi-runner support** — switch between runners via tabs; each has their own race log and stats
- **Interactive chart** — pace or duration over time, km/mi toggle, click-to-inspect race panel
- **Sortable race log** — desktop table and mobile card view, sortable by any column
- **Run submission** — public form for submitting new runs (requires a link to a race result)
- **Admin approval workflow** — submitted runs are held as pending; admin receives an email alert, then approves or rejects from the dashboard
- **Admin runner management** — create new runners from the admin dashboard

## Project Structure

```
/
├── src/                        # React frontend (Vite)
│   ├── pages/
│   │   ├── Home.jsx            # Main stats page with runner switcher
│   │   ├── Submit.jsx          # Public run submission form
│   │   ├── AdminLogin.jsx      # Admin login
│   │   └── AdminDashboard.jsx  # Pending submissions + runner management
│   ├── components/
│   │   ├── PaceChart.jsx       # Chart.js line chart with custom plugin
│   │   ├── RaceTable.jsx       # Sortable desktop table
│   │   ├── MobileCards.jsx     # Mobile card view
│   │   ├── RacePanel.jsx       # Slide-in race detail panel
│   │   ├── StatsHeader.jsx     # Aggregate stats (races, distance, time, avg pace)
│   │   └── RunnerSelector.jsx  # Runner tab switcher
│   └── lib/
│       ├── api.js              # Fetch wrappers for all API calls
│       └── utils.js            # Formatting and data processing helpers
├── api/                        # Vercel Serverless Functions
│   ├── runners/index.js        # GET  /api/runners
│   ├── runs/index.js           # GET  /api/runs?runner=:slug
│   ├── submissions/index.js    # POST /api/submissions
│   ├── auth/login.js           # POST /api/auth/login
│   └── admin/
│       ├── submissions/
│       │   ├── index.js        # GET   /api/admin/submissions
│       │   └── [id].js         # PATCH /api/admin/submissions/:id
│       └── runners/index.js    # POST  /api/admin/runners
├── db/
│   ├── schema.js               # Drizzle table definitions
│   ├── index.js                # Neon + Drizzle client
│   └── seed.js                 # One-time seed script for existing race data
├── vercel.json                 # SPA rewrite rule
├── drizzle.config.js
└── vite.config.js
```

## Database Schema

```sql
runners  (id, name, slug, created_at)
runs     (id, runner_id, event_name, date, km, time_seconds, link, status, submitted_at, reviewed_at)
```

`status` is one of `pending | approved | rejected`. Only `approved` runs appear publicly.

## Local Development

Requires the [Vercel CLI](https://vercel.com/docs/cli) to run both the frontend and API functions together.

```bash
npm install
vercel dev
```

The app runs at `http://localhost:3000`. Set environment variables in a `.env.local` file (see `.env.example`).

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `JWT_SECRET` | Random secret for signing admin JWTs |
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD` | Admin login password |
| `RESEND_API_KEY` | Resend API key for email alerts |
| `ADMIN_EMAIL` | Email address to receive submission notifications |
| `SITE_URL` | Deployed site URL (used in email links) |

## Database Setup

Push the schema to Neon and seed the initial race data:

```bash
npm run db:push
npm run db:seed
```

Both commands load `DATABASE_URL` from `.env.local`.

## Deployment

Connect the repository to Vercel, add the environment variables in the Vercel dashboard, and deploy. All pushes to `main` deploy automatically.

## Admin

- **Login:** `/admin`
- **Dashboard:** `/admin/dashboard` — review pending submissions, add runners
- **Submit a run:** `/submit` (public)
