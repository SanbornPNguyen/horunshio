import { useTheme } from '../hooks/useTheme.js'

const THEMES = [
  { id: 'default', label: 'Warm',    color: '#F25C1E' },
  { id: 'night',   label: 'Night',   color: '#1C2128' },
  { id: 'ocean',   label: 'Pacific', color: '#0096C7' },
  { id: 'trail',   label: 'Trail',   color: '#40916C' },
]

export default function ThemeSelector() {
  const [theme, setTheme] = useTheme()
  return (
    <div className="theme-selector">
      {THEMES.map(t => (
        <button
          key={t.id}
          className={`theme-swatch${theme === t.id ? ' active' : ''}`}
          style={{ background: t.color }}
          title={t.label}
          onClick={() => setTheme(t.id)}
        />
      ))}
    </div>
  )
}
