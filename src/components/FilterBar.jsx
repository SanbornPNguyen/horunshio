const DIST_ORDER = ['5K', '10K', '15K', 'Half', 'Full']

export default function FilterBar({ runs, filterYear, filterDist, onYearChange, onDistChange }) {
  // Build year map with counts, sorted descending
  const yearMap = {}
  runs.forEach(r => { yearMap[r.year] = (yearMap[r.year] || 0) + 1 })
  const years = Object.keys(yearMap).map(Number).sort((a, b) => b - a)

  // Build available distance labels
  const distSet = new Set(runs.map(r => r.distLabel))
  const dists = DIST_ORDER.filter(d => distSet.has(d))

  if (!years.length) return null

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <button
          className={`filter-pill${!filterYear ? ' on' : ''}`}
          onClick={() => onYearChange(null)}
        >
          All
        </button>
        {years.map(y => (
          <button
            key={y}
            className={`filter-pill${filterYear === y ? ' on' : ''}`}
            onClick={() => onYearChange(filterYear === y ? null : y)}
          >
            {y}
            <span className="filter-count">{yearMap[y]}</span>
          </button>
        ))}
      </div>

      {dists.length > 1 && (
        <>
          <div className="filter-div" />
          <div className="filter-group">
            <button
              className={`filter-pill${!filterDist ? ' on' : ''}`}
              onClick={() => onDistChange(null)}
            >
              All
            </button>
            {dists.map(d => (
              <button
                key={d}
                className={`filter-pill${filterDist === d ? ' on' : ''}`}
                onClick={() => onDistChange(filterDist === d ? null : d)}
              >
                {d}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
