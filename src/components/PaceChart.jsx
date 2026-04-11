import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

// Custom plugin: dashed horizontal ref line + pill label at selected point
const refLinePlugin = {
  id: 'refLine',
  afterDraw(chart) {
    const selIdx = chart._selIdx
    if (selIdx === null || selIdx === undefined) return
    const ds = chart.data.datasets[0]
    if (!ds || selIdx >= ds.data.length) return
    const val = ds.data[selIdx]
    const yScale = chart.scales.y
    const xScale = chart.scales.x
    const y = yScale.getPixelForValue(val)
    const c = chart.ctx
    c.save()
    c.beginPath()
    c.setLineDash([5, 4])
    c.strokeStyle = 'rgba(242,92,30,0.45)'
    c.lineWidth = 1.5
    c.moveTo(xScale.left, y)
    c.lineTo(xScale.right, y)
    c.stroke()
    c.setLineDash([])
    const label = chart._tipFn ? chart._tipFn(val) : ''
    if (!label) return
    c.font = '500 11px DM Sans,sans-serif'
    const tw = c.measureText(label).width
    const pw = tw + 14, ph = 20, px = xScale.right - pw - 2, py = y - ph / 2, pr = 4
    c.fillStyle = '#F25C1E'
    c.beginPath()
    c.moveTo(px + pr, py); c.lineTo(px + pw - pr, py)
    c.arcTo(px + pw, py, px + pw, py + pr, pr)
    c.lineTo(px + pw, py + ph - pr)
    c.arcTo(px + pw, py + ph, px + pw - pr, py + ph, pr)
    c.lineTo(px + pr, py + ph)
    c.arcTo(px, py + ph, px, py + ph - pr, pr)
    c.lineTo(px, py + pr)
    c.arcTo(px, py, px + pr, py, pr)
    c.closePath()
    c.fill()
    c.fillStyle = '#fff'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(label, px + pw / 2, y)
    c.restore()
  },
}

// Crosshair: vertical line + bottom label following hovered point
const crosshairPlugin = {
  id: 'crosshair',
  afterEvent(chart, args) {
    const { type } = args.event
    if (type === 'mouseout') {
      if (chart._crosshairIdx !== null) { chart._crosshairIdx = null; args.changed = true }
    } else if (type === 'mousemove') {
      const els = chart.getElementsAtEventForMode(args.event.native, 'index', { intersect: false }, false)
      const idx = els.length ? els[0].index : null
      if (chart._crosshairIdx !== idx) { chart._crosshairIdx = idx; args.changed = true }
    }
  },
  afterDraw(chart) {
    const idx = chart._crosshairIdx
    if (idx == null) return
    const ds = chart.data.datasets[0]
    if (!ds || idx >= ds.data.length) return
    const xScale = chart.scales.x
    const yScale = chart.scales.y
    const x = xScale.getPixelForValue(idx)
    const c = chart.ctx
    c.save()
    c.beginPath()
    c.setLineDash([4, 3])
    c.strokeStyle = 'rgba(242,92,30,0.22)'
    c.lineWidth = 1
    c.moveTo(x, yScale.top)
    c.lineTo(x, yScale.bottom)
    c.stroke()
    c.setLineDash([])
    c.restore()
  },
}

// Year separators: draw vertical bands between year groups
const yearBandsPlugin = {
  id: 'yearBands',
  afterDraw(chart) {
    const runs = chart._runs
    if (!runs?.length) return
    const xScale = chart.scales.x
    const yScale = chart.scales.y
    const c = chart.ctx
    c.save()
    c.font = '500 9px DM Sans,sans-serif'
    c.textBaseline = 'top'
    runs.forEach((r, i) => {
      if (i === 0 || r.year === runs[i - 1].year) return
      const x1 = xScale.getPixelForValue(i - 1)
      const x2 = xScale.getPixelForValue(i)
      const x = (x1 + x2) / 2
      // separator line
      c.beginPath()
      c.setLineDash([3, 4])
      c.strokeStyle = 'rgba(26,20,16,0.1)'
      c.lineWidth = 1
      c.moveTo(x, yScale.top)
      c.lineTo(x, yScale.bottom)
      c.stroke()
      c.setLineDash([])
      // year pill label
      const label = String(r.year)
      const tw = c.measureText(label).width
      const pw = tw + 8, ph = 14, py = yScale.top + 4, px = x - pw / 2, pr = 3
      c.fillStyle = 'rgba(26,20,16,0.06)'
      c.beginPath()
      c.roundRect?.(px, py, pw, ph, pr) || (() => { c.rect(px, py, pw, ph) })()
      c.fill()
      c.fillStyle = 'rgba(26,20,16,0.3)'
      c.textAlign = 'center'
      c.fillText(label, x, py + 2)
    })
    c.restore()
  },
}

if (!Chart.registry.plugins.get('refLine')) Chart.register(refLinePlugin)
if (!Chart.registry.plugins.get('crosshair')) Chart.register(crosshairPlugin)
if (!Chart.registry.plugins.get('yearBands')) Chart.register(yearBandsPlugin)

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

function linearTrend(data) {
  const n = data.length
  if (n < 3) return null
  const xMean = (n - 1) / 2
  const yMean = data.reduce((s, v) => s + v, 0) / n
  let num = 0, den = 0
  data.forEach((y, x) => {
    num += (x - xMean) * (y - yMean)
    den += (x - xMean) * (x - xMean)
  })
  if (!den) return null
  const slope = num / den
  const intercept = yMean - slope * xMean
  return data.map((_, i) => +(slope * i + intercept).toFixed(5))
}

export default function PaceChart({ runs, selIdx, onSelect, onClose, unit, onUnitChange }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)
  const [mode, setMode] = useState('pace')
  const [showTrend, setShowTrend] = useState(false)

  useEffect(() => {
    if (!canvasRef.current || !runs.length) return
    if (chartRef.current) chartRef.current.destroy()

    const labels = runs.map(r =>
      r.eventName.replace(/(\d{4})/, "'$1").split(' ').slice(0, 3).join(' ')
    )
    const data = mode === 'pace'
      ? runs.map(r => unit === 'km' ? r.paceKm / 60 : r.paceMi / 60)
      : runs.map(r => r.secs / 3600)

    const tipFn = getTipFn(mode, unit)
    const trendData = showTrend ? linearTrend(data) : null

    const datasets = [
      {
        data,
        borderColor: '#F25C1E',
        backgroundColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300)
          g.addColorStop(0, 'rgba(242,92,30,.10)')
          g.addColorStop(1, 'rgba(242,92,30,0)')
          return g
        },
        borderWidth: 2,
        pointStyle: data.map((_, i) => runs[i].isPR ? 'star' : 'circle'),
        pointBackgroundColor: data.map((_, i) => {
          if (i === selIdx) return '#F25C1E'
          if (runs[i].isPR) return '#F25C1E'
          return '#fff'
        }),
        pointBorderColor: '#F25C1E',
        pointBorderWidth: data.map((_, i) => i === selIdx ? 3 : 2),
        pointRadius: data.map((_, i) => {
          if (i === selIdx) return 8
          if (runs[i].isPR) return 7
          return 4
        }),
        pointHoverRadius: 7,
        fill: true,
        tension: 0.3,
        order: 1,
      },
    ]

    if (trendData) {
      datasets.push({
        label: 'Trend',
        data: trendData,
        borderColor: 'rgba(242,92,30,0.4)',
        borderWidth: 1.5,
        borderDash: [6, 4],
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        tension: 0,
        order: 2,
      })
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            display: showTrend,
            position: 'top',
            labels: {
              color: '#4A3F38',
              font: { size: 11, family: 'DM Sans' },
              boxWidth: 10,
              boxHeight: 10,
              filter: item => item.datasetIndex === 1,
            },
          },
          tooltip: {
            filter: item => item.datasetIndex === 0,
            backgroundColor: '#1A1410',
            titleColor: 'rgba(255,255,255,.5)',
            bodyColor: '#fff',
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              title: c => runs[c[0].dataIndex].eventName,
              label: c => {
                const label = tipFn(c.raw)
                return runs[c[0].dataIndex].isPR ? `${label}  ★ PR` : label
              },
              afterLabel: c => {
                const r = runs[c.dataIndex]
                const prev = r.prev
                const delta = prev
                  ? (() => {
                    const pace = unit === 'mi' ? r.paceMi : r.paceKm
                    const prevPace = unit === 'mi' ? prev.paceMi : prev.paceKm
                    const d = pace - prevPace
                    const abs = Math.abs(d)
                    const dm = Math.floor(abs / 60), ds = Math.round(abs % 60)
                    const str = dm > 0 ? `${dm}m ${String(ds).padStart(2, '0')}s` : `${ds}s`
                    if (d < -2) return `▲ ${str}/${unit} faster`
                    if (d > 2) return `▼ ${str}/${unit} slower`
                    return '± same'
                  })()
                  : null
                const distStr = unit === 'mi' ? `${r.mi.toFixed(1)}mi` : `${r.km}km`
                return `${distStr} · ${r.displayDate}` + (delta ? ` · ${delta}` : '')
              },
            },
          },
        },
        onClick(_, els) {
          if (!els.length) { onClose(); return }
          const idx = els[0].index
          if (idx >= datasets[0].data.length) return
          if (selIdx === idx) onClose()
          else onSelect(idx)
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

    chartRef.current._tipFn = tipFn
    chartRef.current._selIdx = selIdx
    chartRef.current._runs = runs
    chartRef.current._crosshairIdx = null
  }, [runs, mode, unit, showTrend]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update selection dots without full rebuild
  useEffect(() => {
    if (!chartRef.current) return
    chartRef.current._selIdx = selIdx
    const ds = chartRef.current.data.datasets[0]
    ds.pointBackgroundColor = ds.data.map((_, i) => {
      if (i === selIdx) return '#F25C1E'
      if (runs[i]?.isPR) return '#F25C1E'
      return '#fff'
    })
    ds.pointRadius = ds.data.map((_, i) => {
      if (i === selIdx) return 8
      if (runs[i]?.isPR) return 7
      return 4
    })
    ds.pointBorderWidth = ds.data.map((_, i) => i === selIdx ? 3 : 2)
    chartRef.current.update('none')
  }, [selIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [])

  return (
    <>
      <div className="srow">
        <span className="stitle">Pace Over Time</span>
        <div className="ctrls">
          <button className={`pbtn${mode === 'pace' ? ' on' : ''}`} onClick={() => setMode('pace')}>Pace</button>
          <button className={`pbtn${mode === 'duration' ? ' on' : ''}`} onClick={() => setMode('duration')}>Duration</button>
          <div className="vdiv" />
          <div className="ugrp">
            <button className={`ubtn${unit === 'km' ? ' on' : ''}`} onClick={() => onUnitChange('km')}>km</button>
            <button className={`ubtn${unit === 'mi' ? ' on' : ''}`} onClick={() => onUnitChange('mi')}>mi</button>
          </div>
          <div className="vdiv" />
          <button
            className={`pbtn${showTrend ? ' on' : ''}`}
            onClick={() => setShowTrend(t => !t)}
            title="Show linear trend line"
          >
            Trend
          </button>
        </div>
      </div>
      <div className="chart-card">
        <div className="chart-wrap">
          <canvas ref={canvasRef} />
        </div>
      </div>
      <p className="chart-hint">
        Click a point to inspect · <span style={{ color: 'var(--orange)' }}>★ = Personal Record</span>
      </p>
    </>
  )
}
