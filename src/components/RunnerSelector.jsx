export default function RunnerSelector({ runners, activeSlug, onChange, compareActive, onCompare }) {
  if (!runners.length) return null
  return (
    <div className="runner-selector">
      <div className="runner-selector-in">
        {runners.map(r => (
          <button
            key={r.slug}
            className={`runner-tab${r.slug === activeSlug ? ' active' : ''}`}
            onClick={() => onChange(r.slug)}
          >
            {r.name}
          </button>
        ))}
        {onCompare && (
          <button
            className={`runner-tab compare-tab${compareActive ? ' active' : ''}`}
            onClick={onCompare}
          >
            Compare
          </button>
        )}
      </div>
    </div>
  )
}
