import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getRunners, getRuns } from '../lib/api.js'
import { processRuns, computeStats } from '../lib/utils.js'
import RunnerSelector from '../components/RunnerSelector.jsx'
import StatsHeader from '../components/StatsHeader.jsx'
import PRCards from '../components/PRCards.jsx'
import FilterBar from '../components/FilterBar.jsx'
import PaceChart from '../components/PaceChart.jsx'
import RacePanel from '../components/RacePanel.jsx'
import RaceTable from '../components/RaceTable.jsx'
import MobileCards from '../components/MobileCards.jsx'
import Header from '../components/Header.jsx'
import LockedPanel from '../components/LockedPanel.jsx'

export default function Home() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const [runners, setRunners] = useState([])
  const [notFound, setNotFound] = useState(false)
  const [locked, setLocked] = useState(false)
  const [runs, setRuns] = useState([])
  const [selIdx, setSelIdx] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterYear, setFilterYear] = useState(null)
  const [filterDist, setFilterDist] = useState(null)
  const [unit, setUnit] = useState('km')
  const chartRef = useRef(null)

  useEffect(() => {
    getRunners().then(setRunners).catch(console.error)
  }, [])

  // "/" shows the first runner; "/r/:slug" shows that one
  const activeSlug = slug || runners[0]?.slug

  useEffect(() => {
    if (!activeSlug) return
    let stale = false // ignore responses for a runner we've already switched away from
    setLoading(true)
    setNotFound(false)
    setLocked(false)
    setSelIdx(null)
    setFilterYear(null)
    setFilterDist(null)
    getRuns(activeSlug).then(raw => {
      if (stale) return
      setRuns(processRuns(raw))
      setLoading(false)
    }).catch(err => {
      if (stale) return
      setRuns([])
      if (err.message === 'Locked') setLocked(true)
      else { console.error(err); setNotFound(true) }
      setLoading(false)
    })
    return () => { stale = true }
  }, [activeSlug])

  function handleSelect(idx) {
    setSelIdx(idx)
    if (chartRef.current) {
      chartRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  function handleYearChange(y) {
    setFilterYear(y)
    setSelIdx(null)
  }

  function handleDistChange(d) {
    setFilterDist(d)
    setSelIdx(null)
  }

  const activeRunner = runners.find(r => r.slug === activeSlug)

  // All-time stats and PRs always use the full runs list
  const stats = computeStats(runs)

  // Chart + table + panel use the filtered subset
  const displayedRuns = runs.filter(r => {
    if (filterYear && r.year !== filterYear) return false
    if (filterDist && r.distLabel !== filterDist) return false
    return true
  })


  return (
    <>
      <Header />

      <RunnerSelector
        runners={runners}
        activeSlug={activeSlug}
        onChange={s => navigate(`/r/${s}`)}
        onCompare={() => navigate('/compare')}
      />

      <main className="main">
        {loading && <div className="loading">Loading…</div>}

        {!loading && locked && <LockedPanel />}

        {!loading && !locked && runs.length === 0 && (
          <div className="empty-state">
            <p>{notFound ? 'Runner not found.' : 'No runs yet for this runner.'}</p>
          </div>
        )}

        {!loading && !locked && runs.length > 0 && (
          <>
            {/* ── Stats ─────────────────────────────────────────── */}
            <StatsHeader stats={stats} unit={unit} />

            {/* ── Personal Records ──────────────────────────────── */}
            <PRCards prs={stats.prs} unit={unit} />

            {/* ── Filters ───────────────────────────────────────── */}
            <FilterBar
              runs={runs}
              filterYear={filterYear}
              filterDist={filterDist}
              onYearChange={handleYearChange}
              onDistChange={handleDistChange}
            />

            {/* ── Chart ─────────────────────────────────────────── */}
            {(filterYear || filterDist) && (
              <div className="filter-context">
                {[
                  filterDist,
                  filterYear,
                  displayedRuns.length > 0
                    ? `${displayedRuns.length} race${displayedRuns.length !== 1 ? 's' : ''}`
                    : null,
                ].filter(Boolean).join(' · ')}
                {filterYear && (
                  <Link to={`/r/${activeSlug}/${filterYear}`} className="filter-link">
                    {filterYear} in review →
                  </Link>
                )}
                <button
                  className="filter-clear"
                  onClick={() => { handleYearChange(null); handleDistChange(null) }}
                >
                  ✕ Clear
                </button>
              </div>
            )}

            {displayedRuns.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <p>No races match the current filter.</p>
              </div>
            ) : (
              <>
                <div ref={chartRef}>
                  <PaceChart
                    runs={displayedRuns}
                    selIdx={selIdx}
                    onSelect={handleSelect}
                    onClose={() => setSelIdx(null)}
                    unit={unit}
                    onUnitChange={setUnit}
                  />
                </div>

                <RacePanel
                  runs={displayedRuns}
                  selIdx={selIdx}
                  onClose={() => setSelIdx(null)}
                  onNavigate={handleSelect}
                  unit={unit}
                />

                <RaceTable
                  runs={displayedRuns}
                  selIdx={selIdx}
                  onSelect={handleSelect}
                  unit={unit}
                />

                <MobileCards
                  runs={displayedRuns}
                  selIdx={selIdx}
                  onSelect={handleSelect}
                  unit={unit}
                />
              </>
            )}
          </>
        )}
      </main>
    </>
  )
}
