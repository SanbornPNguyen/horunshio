// Run with: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseTimeStr, distKey, eventSlug, safeUrl, predictTime, processRuns, yearReview, distIn, paceIn, fmtDist, formatPace } from './utils.js'

test('parseTimeStr handles H:MM:SS and MM:SS', () => {
  assert.equal(parseTimeStr('1:26:01'), 5161)
  assert.equal(parseTimeStr('58:30'), 3510) // minutes, not hours
})

test('distKey snaps near-standard distances', () => {
  assert.equal(distKey(10), '10K')
  assert.equal(distKey(10.02), '10K')
  assert.equal(distKey(21.1), 'Half')
  assert.equal(distKey(7), '7km')
  // 8K and 5 Mile are 0.6% apart: must pick the nearest, not the first
  assert.equal(distKey(8), '8K')
  assert.equal(distKey(8.05), '5 Mile')   // 5 mi entered in miles, stored to 2dp
  assert.equal(distKey(16.09), '10 Mile')
  assert.equal(distKey(42.2), 'Marathon')
})

test('eventSlug and safeUrl', () => {
  assert.equal(eventSlug('  Santa Monica-Venice Xmas Run 2025 '), 'santa-monica-venice-xmas-run-2025')
  assert.equal(safeUrl('https://strava.com/a/1'), 'https://strava.com/a/1')
  assert.equal(safeUrl('javascript:alert(1)'), null)
})

test('predictTime is Riegel', () => {
  assert.equal(Math.round(predictTime(3000, 10, 10)), 3000)
  assert.equal(Math.round(predictTime(3000, 10, 21.0975)), Math.round(3000 * Math.pow(2.10975, 1.06)))
})

test('PRs group 10.0 and 10.02 km together; wasPR tracks PRs at the time', () => {
  const runs = processRuns([
    { id: 1, eventName: 'A', date: '2024-01-01', km: '10.0', timeSeconds: 3600 },
    { id: 2, eventName: 'B', date: '2024-06-01', km: '10.02', timeSeconds: 3300 },
    { id: 3, eventName: 'C', date: '2025-01-01', km: '10.0', timeSeconds: 3500 },
  ])
  assert.deepEqual(runs.map(r => r.isPR), [false, true, false])
  assert.deepEqual(runs.map(r => r.wasPR), [true, true, false])
  assert.equal(runs[2].prev.id, 2)

  const y = yearReview(runs, 2024)
  assert.equal(y.count, 2)
  assert.equal(y.prsSet.length, 1)
  assert.equal(y.mostImproved.run.id, 2)
})

test('unit helpers convert km <-> mi consistently', () => {
  assert.equal(fmtDist(10, 'km'), '10 km')
  assert.equal(fmtDist(21.0975, 'km'), '21.1 km')
  assert.equal(fmtDist(10, 'mi'), '6.2 mi')
  assert.equal(fmtDist(21.0975, 'mi'), '13.1 mi')
  // 8:36 /km is 13:50 /mi
  assert.equal(formatPace(paceIn(516, 'km')), '8:36')
  assert.equal(formatPace(paceIn(516, 'mi')), '13:50')
  // round trip used by the run form: 6.2 mi entered -> km stored
  assert.equal(Math.round((6.2 / distIn(1, 'mi')) * 100) / 100, 9.98)
  assert.equal(distKey(9.98), '10K')
})
