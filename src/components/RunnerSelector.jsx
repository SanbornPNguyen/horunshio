export default function RunnerSelector({ runners, activeSlug, onChange }) {
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
      </div>
    </div>
  )
}
