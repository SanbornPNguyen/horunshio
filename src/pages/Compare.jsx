import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'
import { getRunners, getRuns } from '../lib/api.js'
import { processRuns, formatTime, formatPace, KMI } from '../lib/utils.js'
import RunnerSelector from '../components/RunnerSelector.jsx'

Chart.register(...registerables)

const COLOR_A = '#F25C1E'
const COLOR_B = '#1B59AC'

function getTipFn(mode, unit) {
  if (mode === 'pace') {
    return v => {
      const m = Math.floor(v), s = Math.round((v - m) * 60)
      return `${m}:${String(s).padStart(2, '0')} /${unit}`
    }
  }
  return v => {
    const h = Math.floor(v), m = Math.floor((v - h) * 60), s = Math.round(((v - h) * 60 - m) * 60)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
}

function CompareChart({ sharedRuns, runnerA, runnerB, mode, unit }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !sharedRuns.length) return
    if (chartRef.current) chartRef.current.destroy()

    const labels = sharedRuns.map(p =>
      p.runA.eventName.replace(/(\d{4})/, "'$1").split(' ').slice(0, 3).join(' ')
    )
    const tipFn = getTipFn(mode, unit)

    function getValue(run) {
      if (mode === 'pace') return unit === 'km' ? run.paceKm / 60 : run.paceMi / 60
      return run.secs / 3600
    }

    function makeGradient(ctx, color) {
      const g = ctx.createLinearGradient(0, 0, 0, 240)
      const hex = color === COLOR_A ? '242,92,30' : '27,89,172'
      g.addColorStop(0, `rgba(${hex},.12)`)
      g.addColorStop(1, `rgba(${hex},0)`)
      return g
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: runnerA.name,
            data: sharedRuns.map(p => getValue(p.runA)),
            borderColor: COLOR_A,
            backgroundColor: ctx => makeGradient(ctx.chart.ctx, COLOR_A),
            borderWidth: 2,
            pointBackgroundColor: COLOR_A,
            pointBorderColor: COLOR_A,
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: false,
            tension: 0.3,
          },
          {
            label: runnerB.name,
            data: sharedRuns.map(p => getValue(p.runB)),
            borderColor: COLOR_B,
            backgroundColor: ctx => makeGradient(ctx.chart.ctx, COLOR_B),
            borderWidth: 2,
            pointBackgroundColor: COLOR_B,
            pointBorderColor: COLOR_B,
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: false,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#4A3F38', font: { size: 12, family: 'DM Sans' }, boxWidth: 12, boxHeight: 12, borderRadius: 3 },
          },
          tooltip: {
            backgroundColor: '#1A1410',
            titleColor: 'rgba(255,255,255,.5)',
            bodyColor: '#fff',
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              title: c => sharedRuns[c[0].dataIndex].runA.eventName,
              label: c => `${c.dataset.label}: ${tipFn(c.raw)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(26,20,16,.04)' },
            ticks: { color: '#9A8E87', font: { size: 10 }, maxRotation: 40, autoSkip: true },
          },
          y: {
            grid: { color: 'rgba(26,20,16,.04)' },
            reverse: mode === 'pace',
            ticks: { color: '#9A8E87', font: { size: 10 }, callback: tipFn },
          },
        },
      },
    })
  }, [sharedRuns, mode, unit]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [])

  if (!sharedRuns.length) return null

  return (
    <div className="chart-card">
      <div className="chart-wrap">
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}

function paceDisplay(run, unit) {
  const pace = unit === 'km' ? run.paceKm : run.paceMi
  return formatPace(pace) + ' /' + unit
}

export default function Compare() {
  const navigate = useNavigate()
  const [runners, setRunners] = useState([])
  const [slugA, setSlugA] = useState('')
  const [slugB, setSlugB] = useState('')
  const [runsA, setRunsA] = useState(null)
  const [runsB, setRunsB] = useState(null)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)
  const [mode, setMode] = useState('pace')
  const [unit, setUnit] = useState('km')

  useEffect(() => {
    getRunners().then(list => {
      setRunners(list)
      if (list.length >= 2) {
        setSlugA(list[0].slug)
        setSlugB(list[1].slug)
      } else if (list.length === 1) {
        setSlugA(list[0].slug)
      }
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!slugA) return
    setLoadingA(true)
    getRuns(slugA).then(raw => {
      setRunsA(processRuns(raw))
      setLoadingA(false)
    }).catch(() => setLoadingA(false))
  }, [slugA])

  useEffect(() => {
    if (!slugB) return
    setLoadingB(true)
    getRuns(slugB).then(raw => {
      setRunsB(processRuns(raw))
      setLoadingB(false)
    }).catch(() => setLoadingB(false))
  }, [slugB])

  // Find shared runs by event name (case-insensitive)
  const sharedRuns = (() => {
    if (!runsA || !runsB) return []
    const mapB = new Map(runsB.map(r => [r.eventName.toLowerCase().trim(), r]))
    return runsA
      .filter(r => mapB.has(r.eventName.toLowerCase().trim()))
      .map(r => ({ runA: r, runB: mapB.get(r.eventName.toLowerCase().trim()) }))
      .sort((a, b) => a.runA.dateObj - b.runA.dateObj)
  })()

  const runnerA = runners.find(r => r.slug === slugA)
  const runnerB = runners.find(r => r.slug === slugB)
  const bothSelected = slugA && slugB && slugA !== slugB
  const loading = loadingA || loadingB

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap', flex: 1, justifyContent: 'space-between' }}>
            <h1 className="logo">Ho<span>Run</span>Shio</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
              <Link to="/submit" className="nav-link primary" style={{ flexShrink: 0 }}>Submit a Run</Link>
              <Link to="/admin" className="nav-link" style={{ flexShrink: 0 }}>Admin</Link>
            </div>
          </div>
        </div>
      </header>

      <RunnerSelector
        runners={runners}
        activeSlug={null}
        onChange={() => navigate('/')}
        compareActive={true}
        onCompare={() => {}}
      />

      <main className="main">
        <div className="srow" style={{ marginBottom: '20px' }}>
          <span className="stitle">Head-to-Head</span>
          <div className="ctrls">
            <button className={`pbtn${mode === 'pace' ? ' on' : ''}`} onClick={() => setMode('pace')}>Pace</button>
            <button className={`pbtn${mode === 'duration' ? ' on' : ''}`} onClick={() => setMode('duration')}>Duration</button>
            <div className="vdiv" />
            <div className="ugrp">
              <button className={`ubtn${unit === 'km' ? ' on' : ''}`} onClick={() => setUnit('km')}>km</button>
              <button className={`ubtn${unit === 'mi' ? ' on' : ''}`} onClick={() => setUnit('mi')}>mi</button>
            </div>
          </div>
        </div>

        {/* Runner pickers */}
        <div className="compare-pickers">
          <div className="compare-picker">
            <div className="compare-picker-label" style={{ color: COLOR_A }}>Runner A</div>
            <select
              className="compare-select"
              value={slugA}
              onChange={e => setSlugA(e.target.value)}
            >
              <option value="">Select runner…</option>
              {runners.map(r => (
                <option key={r.slug} value={r.slug} disabled={r.slug === slugB}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="compare-vs">VS</div>

          <div className="compare-picker">
            <div className="compare-picker-label" style={{ color: COLOR_B }}>Runner B</div>
            <select
              className="compare-select"
              value={slugB}
              onChange={e => setSlugB(e.target.value)}
            >
              <option value="">Select runner…</option>
              {runners.map(r => (
                <option key={r.slug} value={r.slug} disabled={r.slug === slugA}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        {!bothSelected && (
          <div className="empty-state" style={{ paddingTop: '60px' }}>
            <p>Select two different runners above to compare their shared races.</p>
          </div>
        )}

        {bothSelected && loading && <div className="loading">Loading…</div>}

        {bothSelected && !loading && sharedRuns.length === 0 && (
          <div className="empty-state" style={{ paddingTop: '60px' }}>
            <p>No shared races found between {runnerA?.name} and {runnerB?.name}.</p>
            <p style={{ marginTop: '8px', fontSize: '12px' }}>Races are matched by event name.</p>
          </div>
        )}

        {bothSelected && !loading && sharedRuns.length > 0 && (
          <>
            <div style={{ marginBottom: '6px' }}>
              <CompareChart
                sharedRuns={sharedRuns}
                runnerA={runnerA}
                runnerB={runnerB}
                mode={mode}
                unit={unit}
              />
            </div>
            <p className="chart-hint">{sharedRuns.length} shared race{sharedRuns.length !== 1 ? 's' : ''}</p>

            <div className="srow">
              <span className="stitle">Race Breakdown</span>
            </div>

            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th style={{ color: COLOR_A }}>{runnerA?.name}</th>
                    <th style={{ color: COLOR_A }} className="r">Pace</th>
                    <th style={{ color: COLOR_B }}>{runnerB?.name}</th>
                    <th style={{ color: COLOR_B }} className="r">Pace</th>
                    <th className="r">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {sharedRuns.map(({ runA, runB }) => {
                    const diffSecs = runA.secs - runB.secs
                    const absDiff = Math.abs(diffSecs)
                    const diffH = Math.floor(absDiff / 3600)
                    const diffM = Math.floor((absDiff % 3600) / 60)
                    const diffS = absDiff % 60
                    const diffStr = diffH > 0
                      ? `${diffH}:${String(diffM).padStart(2, '0')}:${String(diffS).padStart(2, '0')}`
                      : `${diffM}:${String(diffS).padStart(2, '0')}`
                    const faster = diffSecs < 0 ? 'a' : diffSecs > 0 ? 'b' : null

                    return (
                      <tr key={runA.id}>
                        <td>
                          <div className="ename">{runA.eventName}</div>
                          <div className="muted" style={{ fontSize: '11px', marginTop: '2px' }}>{runA.displayDate} · {runA.km}km</div>
                        </td>
                        <td className={faster === 'a' ? 'compare-winner' : ''}>{formatTime(runA.secs)}</td>
                        <td className="r mono muted">{paceDisplay(runA, unit)}</td>
                        <td className={faster === 'b' ? 'compare-winner' : ''}>{formatTime(runB.secs)}</td>
                        <td className="r mono muted">{paceDisplay(runB, unit)}</td>
                        <td className="r">
                          {faster === null ? (
                            <span className="delta same">Tied</span>
                          ) : (
                            <span className={`delta ${faster === 'a' ? 'faster' : 'slower'}`}>
                              {faster === 'a' ? `▲ ${diffStr}` : `▼ ${diffStr}`}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="log-cards" style={{ display: 'flex' }}>
              {sharedRuns.map(({ runA, runB }) => {
                const diffSecs = runA.secs - runB.secs
                const absDiff = Math.abs(diffSecs)
                const diffM = Math.floor(absDiff / 60)
                const diffS = absDiff % 60
                const diffStr = `${diffM}:${String(diffS).padStart(2, '0')}`
                const faster = diffSecs < 0 ? 'a' : diffSecs > 0 ? 'b' : null

                return (
                  <div key={runA.id} className="lcard" style={{ cursor: 'default' }}>
                    <div className="lcard-top">
                      <div>
                        <div className="lcard-name">{runA.eventName}</div>
                        <div className="lcard-date">{runA.displayDate} · {runA.km}km</div>
                      </div>
                      {faster !== null && (
                        <span className={`delta ${faster === 'a' ? 'faster' : 'slower'}`}>
                          {faster === 'a' ? `▲ ${diffStr}` : `▼ ${diffStr}`}
                        </span>
                      )}
                    </div>
                    <div className="lcard-body" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div>
                        <div className="lm-l" style={{ color: COLOR_A }}>{runnerA?.name}</div>
                        <div className="lm-v">{formatTime(runA.secs)}</div>
                        <div style={{ fontSize: '11px', color: '#9A8E87', marginTop: '2px' }}>{paceDisplay(runA, unit)}</div>
                      </div>
                      <div>
                        <div className="lm-l" style={{ color: COLOR_B }}>{runnerB?.name}</div>
                        <div className="lm-v">{formatTime(runB.secs)}</div>
                        <div style={{ fontSize: '11px', color: '#9A8E87', marginTop: '2px' }}>{paceDisplay(runB, unit)}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </>
  )
}
