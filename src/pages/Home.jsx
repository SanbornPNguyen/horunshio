import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import ThemeSelector from '../components/ThemeSelector.jsx'

export default function Home() {
  const navigate = useNavigate()
  const [runners, setRunners] = useState([])
  const [activeSlug, setActiveSlug] = useState(null)
  const [runs, setRuns] = useState([])
  const [selIdx, setSelIdx] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterYear, setFilterYear] = useState(null)
  const [filterDist, setFilterDist] = useState(null)
  const [unit, setUnit] = useState('km')
  const chartRef = useRef(null)

  useEffect(() => {
    getRunners().then(list => {
      setRunners(list)
      if (list.length) setActiveSlug(list[0].slug)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!activeSlug) return
    setLoading(true)
    setSelIdx(null)
    setFilterYear(null)
    setFilterDist(null)
    getRuns(activeSlug).then(raw => {
      setRuns(processRuns(raw))
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
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

  // All-time stats and PRs always use the full runs list
  const stats = computeStats(runs)

  // Chart + table + panel use the filtered subset
  const displayedRuns = runs.filter(r => {
    if (filterYear && r.year !== filterYear) return false
    if (filterDist && r.distLabel !== filterDist) return false
    return true
  })

  const activeRunner = runners.find(r => r.slug === activeSlug)

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <h1 className="logo">Ho<span>Run</span>Shio</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
            <Link to="/submit" className="nav-link primary" style={{ flexShrink: 0 }}>Submit a Run</Link>
            <Link to="/admin" className="nav-link" style={{ flexShrink: 0 }}>Admin</Link>
            <ThemeSelector />
          </div>
        </div>
      </header>

      <RunnerSelector
        runners={runners}
        activeSlug={activeSlug}
        onChange={slug => setActiveSlug(slug)}
        onCompare={() => navigate('/compare')}
      />

      <main className="main">
        {loading && <div className="loading">Loading…</div>}

        {!loading && runs.length === 0 && (
          <div className="empty-state">
            <p>No runs yet for this runner.</p>
          </div>
        )}

        {!loading && runs.length > 0 && (
          <>
            {/* ── Stats ─────────────────────────────────────────── */}
            <StatsHeader stats={stats} />

            {/* ── Personal Records ──────────────────────────────── */}
            <PRCards prs={stats.prs} />

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
