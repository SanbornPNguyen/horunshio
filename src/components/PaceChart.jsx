import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

// Custom plugin: dashed ref line + pill label at selected point
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
    c.moveTo(px + pr, py)
    c.lineTo(px + pw - pr, py)
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

// Register once
if (!Chart.registry.plugins.get('refLine')) {
  Chart.register(refLinePlugin)
}

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

export default function PaceChart({ runs, selIdx, onSelect, onClose }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)
  const [mode, setMode] = useState('pace')
  const [unit, setUnit] = useState('km')

  // Build / rebuild chart when runs, mode, or unit changes
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

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: '#F25C1E',
          backgroundColor: ctx => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 240)
            g.addColorStop(0, 'rgba(242,92,30,.12)')
            g.addColorStop(1, 'rgba(242,92,30,0)')
            return g
          },
          borderWidth: 2,
          pointBackgroundColor: data.map((_, i) => i === selIdx ? '#F25C1E' : '#fff'),
          pointBorderColor: '#F25C1E',
          pointBorderWidth: data.map((_, i) => i === selIdx ? 3 : 2),
          pointRadius: data.map((_, i) => i === selIdx ? 8 : 5),
          pointHoverRadius: 7,
          fill: true,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1A1410',
            titleColor: 'rgba(255,255,255,.5)',
            bodyColor: '#fff',
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              title: c => runs[c[0].dataIndex].eventName,
              label: c => tipFn(c.raw),
              afterLabel: c => {
                const r = runs[c.dataIndex]
                const prev = r.prev
                const delta = prev
                  ? (() => {
                    const d = r.paceKm - prev.paceKm
                    const abs = Math.abs(d)
                    const dm = Math.floor(abs / 60), ds = Math.round(abs % 60)
                    const str = dm > 0 ? `${dm}m ${String(ds).padStart(2, '0')}s` : `${ds}s`
                    if (d < -2) return `▲ ${str}/km faster`
                    if (d > 2) return `▼ ${str}/km slower`
                    return '± same'
                  })()
                  : null
                return `${r.km}km · ${r.displayDate}` + (delta ? ` · ${delta}` : '')
              },
            },
          },
        },
        onClick(_, els) {
          if (!els.length) { onClose(); return }
          const idx = els[0].index
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
  }, [runs, mode, unit]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update dots only when selIdx changes (no rebuild needed)
  useEffect(() => {
    if (!chartRef.current) return
    chartRef.current._selIdx = selIdx
    const ds = chartRef.current.data.datasets[0]
    ds.pointBackgroundColor = ds.data.map((_, i) => i === selIdx ? '#F25C1E' : '#fff')
    ds.pointRadius = ds.data.map((_, i) => i === selIdx ? 8 : 5)
    ds.pointBorderWidth = ds.data.map((_, i) => i === selIdx ? 3 : 2)
    chartRef.current.update('none')
  }, [selIdx])

  // Destroy on unmount
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
            <button className={`ubtn${unit === 'km' ? ' on' : ''}`} onClick={() => setUnit('km')}>km</button>
            <button className={`ubtn${unit === 'mi' ? ' on' : ''}`} onClick={() => setUnit('mi')}>mi</button>
          </div>
        </div>
      </div>
      <div className="chart-card">
        <div className="chart-wrap">
          <canvas ref={canvasRef} />
        </div>
      </div>
      <p className="chart-hint">Click a point to inspect a race</p>
    </>
  )
}
