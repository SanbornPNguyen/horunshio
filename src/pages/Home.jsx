import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getRunners, getRuns } from '../lib/api.js'
import { processRuns, computeStats } from '../lib/utils.js'
import RunnerSelector from '../components/RunnerSelector.jsx'
import StatsHeader from '../components/StatsHeader.jsx'
import PaceChart from '../components/PaceChart.jsx'
import RacePanel from '../components/RacePanel.jsx'
import RaceTable from '../components/RaceTable.jsx'
import MobileCards from '../components/MobileCards.jsx'

export default function Home() {
  const navigate = useNavigate()
  const [runners, setRunners] = useState([])
  const [activeSlug, setActiveSlug] = useState(null)
  const [runs, setRuns] = useState([])
  const [selIdx, setSelIdx] = useState(null)
  const [loading, setLoading] = useState(true)
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
    // Scroll chart into view
    if (chartRef.current) {
      chartRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  const stats = computeStats(runs)

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap', flex: 1, justifyContent: 'space-between' }}>
            <h1 className="logo">Ho<span>Run</span>Shio</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
              {!loading && runs.length > 0 && <StatsHeader stats={stats} variant="header" />}
              <Link to="/submit" className="nav-link primary" style={{ marginLeft: '12px', flexShrink: 0 }}>Submit a Run</Link>
              <Link to="/admin" className="nav-link" style={{ flexShrink: 0 }}>Admin</Link>
            </div>
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
            <StatsHeader stats={stats} variant="main" />

            <div ref={chartRef}>
              <PaceChart
                runs={runs}
                selIdx={selIdx}
                onSelect={handleSelect}
                onClose={() => setSelIdx(null)}
              />
            </div>

            <RacePanel
              runs={runs}
              selIdx={selIdx}
              onClose={() => setSelIdx(null)}
              onNavigate={handleSelect}
            />

            <div className="srow">
              <span className="stitle">Race Log</span>
              <span style={{ fontSize: '12px', color: 'var(--ink3)' }}>
                {runs.length} races · click column to sort
              </span>
            </div>

            <RaceTable runs={runs} selIdx={selIdx} onSelect={handleSelect} />
            <MobileCards runs={runs} selIdx={selIdx} onSelect={handleSelect} />
          </>
        )}
      </main>
    </>
  )
}
