import { useState, useMemo, useEffect, createContext, useContext } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend
} from 'chart.js'
import { Bar, Radar, Scatter } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend
)

// ── constants ────────────────────────────────────────────────────────────────
const RATERS = ['Hlynur', 'Robert', 'Steinar', 'Palli']
const RATER_COLORS = {
  Hlynur:  '#ff9f0a',
  Robert:  '#0a84ff',
  Steinar: '#bf5af2',
  Palli:   '#30d158',
}
const FLAG = {
  Iceland: '🇮🇸', Belgium: '🇧🇪', Denmark: '🇩🇰', USA: '🇺🇸',
  Germany: '🇩🇪', UK: '🇬🇧', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Mexico: '🇲🇽',
  Italy: '🇮🇹', 'Czech Republic': '🇨🇿', Sweden: '🇸🇪', Japan: '🇯🇵',
}
const PALETTE = ['#ff9f0a','#0a84ff','#bf5af2','#30d158','#ff375f','#64d2ff','#ffd60a','#ff6961','#5e5ce6','#32d74b']

const RADAR_CATEGORIES = ['Lager', 'Pale Ale', 'IPA', 'Amber Ale', 'Wheat Beer', 'Belgian']
const STYLE_TO_RADAR = {
  'Lager': 'Lager', 'Light Lager': 'Lager', 'Pilsner': 'Lager',
  'Rice Lager': 'Lager', 'European Dark Lager': 'Lager', 'Zwickel': 'Lager',
  'Märzen': 'Lager', 'Bock': 'Lager', 'Dunkel': 'Lager',
  'Pale Ale': 'Pale Ale', 'APA': 'Pale Ale', 'Golden Ale': 'Pale Ale',
  'Ale': 'Pale Ale', 'Kveik': 'Pale Ale', 'Nordic Saison': 'Pale Ale',
  'Saison': 'Pale Ale', 'Barleywine Style Ale': 'Pale Ale', 'Farmhouse Ale': 'Pale Ale',
  'IPA': 'IPA', 'Session IPA': 'IPA', 'NEIPA': 'IPA',
  'Double IPA': 'IPA', 'NEDIPA': 'IPA', 'Milkshake IPA': 'IPA',
  'Sumar session IPA': 'IPA', 'Belgian IPA': 'IPA', 'Black IPA': 'IPA',
  'Amber Ale': 'Amber Ale', 'Red Ale': 'Amber Ale', 'Irish Red Ale': 'Amber Ale',
  'Wheat Beer': 'Wheat Beer', 'Hveitibjór': 'Wheat Beer', 'Hefeweizen': 'Wheat Beer',
  'Weizen': 'Wheat Beer', 'Witbier': 'Wheat Beer', 'White Ale': 'Wheat Beer',
  'Belgian Ale': 'Belgian', 'Belgískt Öl': 'Belgian', 'Blonde': 'Belgian',
  'Trappist': 'Belgian', 'Dubbel': 'Belgian', 'Tripel': 'Belgian',
  'Quadrupel': 'Belgian', 'Abbey Ale': 'Belgian',
}

ChartJS.defaults.font = { family: 'Montserrat, system-ui, sans-serif', size: 11 }

// ── theme context ─────────────────────────────────────────────────────────────
const ThemeCtx = createContext(false)
const useTheme = () => useContext(ThemeCtx)

// ── helpers ───────────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s == null) return 'var(--text-veryfaint)'
  if (s >= 85) return '#30d158'
  if (s >= 70) return '#ffd60a'
  if (s >= 50) return '#ff9f0a'
  return '#ff375f'
}

function scoreColorRaw(s, dark) {
  if (s == null) return dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'
  if (s >= 85) return '#30d158'
  if (s >= 70) return '#ffd60a'
  if (s >= 50) return '#ff9f0a'
  return '#ff375f'
}

function trunc(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : str
}

function chartColors(dark) {
  return {
    grid:    dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)',
    tick:    dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)',
    tickMid: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    tooltip: {
      backgroundColor: dark ? 'rgba(12,12,20,0.92)' : 'rgba(255,255,255,0.97)',
      borderColor:     dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
      borderWidth: 1,
      titleColor: dark ? '#ffffff' : '#0f0f0f',
      bodyColor:  dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
      padding: 12, cornerRadius: 10,
    },
    barBg:   dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    barBord: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
  }
}

// ── design tokens (CSS-var based — works for HTML, not Canvas) ────────────────
const GLASS = {
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(40px) saturate(180%)',
  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--glass-shadow)',
}
const GLASS_DARK = {
  background: 'var(--glass-dark-bg)',
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
  border: '1px solid var(--glass-dark-border)',
  boxShadow: 'var(--glass-dark-shadow)',
}

function hBarOpts(maxVal, dark) {
  const c = chartColors(dark)
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...c.tooltip } },
    scales: {
      x: {
        grid: { color: c.grid },
        ticks: { color: c.tick, font: { size: 10 } },
        max: maxVal,
        border: { color: 'transparent' },
      },
      y: {
        grid: { display: false },
        ticks: { color: c.tickMid, font: { size: 11 }, maxRotation: 0 },
        border: { color: 'transparent' },
      },
    },
  }
}

// ── responsive hook ───────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = e => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])
  return isMobile
}

// ── tiny components ───────────────────────────────────────────────────────────
function ScoreBadge({ score, size = 'md' }) {
  if (score == null) return <span style={{ color: 'var(--text-veryfaint)', fontSize: 12 }}>—</span>
  const col = scoreColor(score)
  const dim = size === 'lg' ? 52 : size === 'sm' ? 34 : 42
  const fs  = size === 'lg' ? 15 : size === 'sm' ? 11 : 13
  return (
    <div style={{
      width: dim, height: dim, borderRadius: '50%', flexShrink: 0,
      background: `radial-gradient(circle at 40% 35%, rgba(255,255,255,0.18) 0%, ${col}28 50%, ${col}12 100%)`,
      border: `1.5px solid ${col}55`,
      boxShadow: `0 0 12px ${col}33, 0 0 4px ${col}22, inset 0 1px 0 rgba(255,255,255,0.15)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontWeight: 800, fontSize: fs, color: col, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>
        {score.toFixed(0)}
      </span>
    </div>
  )
}

function SectionHead({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
      <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--section-dot)' }} />
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'var(--text-dim)' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--section-line)' }} />
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ ...GLASS, borderRadius: 20, padding: '22px', ...style }}>
      {children}
    </div>
  )
}

function CardLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 2.5, marginBottom: 16 }}>
      {children}
    </div>
  )
}

function GlowBar({ value, max, color }) {
  const pct = Math.min(100, (value / max) * 100)
  const c = color || '#ff9f0a'
  return (
    <div style={{ width: 64, height: 3, borderRadius: 2, background: 'var(--border-mid)', flexShrink: 0, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 2, boxShadow: `0 0 6px ${c}` }} />
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--divider-line)', margin: '0 0 60px' }} />
}

// ── ADD BEER FORM ─────────────────────────────────────────────────────────────
function AddBeerForm({ beers, onAdd, onUpdate }) {
  const [open, setOpen] = useState(false)
  const blank = { name: '', style: '', brewery: '', country: '', abv: '', rater: '', rating: '' }
  const [form, setForm] = useState(blank)
  const [matched, setMatched] = useState(null)

  const styleOpts   = useMemo(() => [...new Set(beers.map(b => b.style).filter(Boolean).sort())], [beers])
  const breweryOpts = useMemo(() => [...new Set(beers.map(b => b.brewery).filter(Boolean).sort())], [beers])
  const countryOpts = useMemo(() => [...new Set(beers.map(b => b.country).filter(Boolean).sort())], [beers])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleNameChange(val) {
    const beer = beers.find(b => b.name.toLowerCase() === val.toLowerCase())
    if (beer) {
      setMatched(beer)
      setForm(f => ({
        ...f,
        name: beer.name,
        style: beer.style || '',
        brewery: beer.brewery || '',
        country: beer.country || '',
        abv: beer.abv != null ? String(beer.abv) : '',
      }))
    } else {
      setMatched(null)
      set('name', val)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const ratingVal = parseFloat(form.rating)
    if (matched) {
      await onUpdate(matched.id, form.rater, ratingVal)
    } else {
      const ratings = { [form.rater]: ratingVal }
      await onAdd({
        name: form.name.trim(),
        style: form.style.trim(),
        brewery: form.brewery.trim(),
        country: form.country.trim(),
        abv: parseFloat(form.abv),
        ratings,
        avg: ratingVal,
        ratingCount: 1,
      })
    }
    setForm(blank)
    setMatched(null)
    setOpen(false)
  }

  function handleClose() {
    setOpen(false)
    setForm(blank)
    setMatched(null)
  }

  const inp = {
    background: 'var(--input-bg)',
    border: '1px solid var(--border-mid)',
    borderRadius: 10,
    padding: '9px 13px',
    fontSize: 13, color: 'var(--text)',
    fontFamily: 'inherit', outline: 'none', width: '100%',
    caretColor: '#ff9f0a',
    transition: 'border-color 0.15s',
  }
  const lbl = { fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2, display: 'block', marginBottom: 6, fontWeight: 600 }
  const selectedRaterColor = form.rater ? RATER_COLORS[form.rater] : null

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: open ? 20 : 0 }}>
        <SectionHead>Log a Beer</SectionHead>
        <button
          onClick={() => open ? handleClose() : setOpen(true)}
          style={{
            background: open ? 'var(--input-bg)' : 'linear-gradient(135deg, #ff9f0a, #ff6b00)',
            border: open ? '1px solid var(--border-mid)' : '1px solid rgba(255,159,10,0.4)',
            borderRadius: 20, padding: '8px 18px',
            fontSize: 13, fontWeight: 600,
            color: open ? 'var(--text-mid)' : '#ffffff',
            boxShadow: open ? 'none' : '0 0 20px rgba(255,159,10,0.3), 0 4px 12px rgba(0,0,0,0.15)',
            marginBottom: 22, cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {open ? 'Cancel' : '+ Add Beer'}
        </button>
      </div>
      {open && (
        <div style={{ ...GLASS, borderRadius: 20, padding: '24px', marginTop: -4 }}>
          {matched && (
            <div style={{
              marginBottom: 16, padding: '10px 14px', borderRadius: 10,
              background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.25)',
              fontSize: 12, color: 'rgba(255,159,10,0.9)',
            }}>
              This beer is already in the database — your rating will be added to the existing entry.
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.6fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Beer Name</label>
                <input
                  list="dl-names" style={inp} value={form.name} required
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Chimay Blue"
                />
              </div>
              {[
                { key: 'style', label: 'Style', list: 'dl-styles', ph: 'IPA, Lager…' },
                { key: 'brewery', label: 'Brewery', list: 'dl-breweries', ph: '' },
                { key: 'country', label: 'Country', list: 'dl-countries', ph: '' },
              ].map(({ key, label, list, ph }) => (
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <input
                    list={list}
                    style={{ ...inp, opacity: matched ? 0.6 : 1 }}
                    value={form[key]} onChange={e => set(key, e.target.value)}
                    placeholder={ph} required
                  />
                </div>
              ))}
              <div>
                <label style={lbl}>ABV %</label>
                <input
                  style={{ ...inp, opacity: matched ? 0.6 : 1 }}
                  type="number" step="0.1" min="0" max="20"
                  value={form.abv} onChange={e => set('abv', e.target.value)}
                  placeholder="5.0" required
                />
              </div>
            </div>
            <datalist id="dl-names">{beers.map(b => <option key={b.id} value={b.name} />)}</datalist>
            <datalist id="dl-styles">{styleOpts.map(s => <option key={s} value={s} />)}</datalist>
            <datalist id="dl-breweries">{breweryOpts.map(b => <option key={b} value={b} />)}</datalist>
            <datalist id="dl-countries">{countryOpts.map(c => <option key={c} value={c} />)}</datalist>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 16px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={lbl}>Who are you?</label>
                <select
                  value={form.rater} onChange={e => set('rater', e.target.value)} required
                  style={{
                    ...inp,
                    cursor: 'pointer',
                    borderColor: selectedRaterColor ? selectedRaterColor + '55' : 'var(--border-mid)',
                    color: selectedRaterColor || 'var(--text)',
                  }}
                >
                  <option value="" disabled style={{ background: 'var(--select-bg)' }}>Select…</option>
                  {RATERS.map(r => (
                    <option key={r} value={r} style={{ background: 'var(--select-bg)', color: RATER_COLORS[r] }}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ ...lbl, color: selectedRaterColor ? selectedRaterColor + 'bb' : 'var(--text-dim)' }}>
                  Your Rating
                </label>
                <input
                  style={{ ...inp, borderColor: selectedRaterColor ? selectedRaterColor + '55' : 'var(--border-mid)' }}
                  type="number" min="0" max="100" step="1"
                  value={form.rating} onChange={e => set('rating', e.target.value)}
                  placeholder="0–100" required
                />
              </div>
              <button type="submit" style={{
                background: 'linear-gradient(135deg, #ff9f0a, #ff6b00)',
                border: 'none', borderRadius: 10, padding: '10px 24px',
                fontSize: 13, fontWeight: 700, color: '#ffffff',
                boxShadow: '0 0 20px rgba(255,159,10,0.4), 0 4px 12px rgba(0,0,0,0.15)',
                cursor: 'pointer', whiteSpace: 'nowrap', alignSelf: 'end',
              }}>
                {matched ? 'Add Rating' : 'Add Beer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

// ── RATER PROFILE ─────────────────────────────────────────────────────────────
function RaterProfile({ rater, beers, onClose }) {
  const dark = useTheme()
  const color = RATER_COLORS[rater]
  const [vinRecs, setVinRecs] = useState([])

  useEffect(() => {
    fetch(`/api/recommendations?rater=${encodeURIComponent(rater)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.recommendations) setVinRecs(d.recommendations.slice(0, 30)) })
      .catch(() => {})
  }, [rater])

  const rated = useMemo(() =>
    beers
      .filter(b => b.ratings[rater] != null)
      .map(b => ({ ...b, myScore: b.ratings[rater] }))
      .sort((a, b) => b.myScore - a.myScore),
    [beers, rater]
  )

  const tryNext = useMemo(() => {
    const others = RATERS.filter(r => r !== rater)
    return beers
      .filter(b => b.ratings[rater] == null)
      .map(b => {
        const scores = others.map(r => b.ratings[r]).filter(v => v != null)
        if (scores.length < 2) return null
        const othersAvg = +(scores.reduce((a, c) => a + c, 0) / scores.length).toFixed(1)
        return { ...b, othersAvg, otherScores: Object.fromEntries(others.map(r => [r, b.ratings[r] ?? null])) }
      })
      .filter(Boolean)
      .sort((a, b) => b.othersAvg - a.othersAvg)
  }, [beers, rater])

  const scores = rated.map(b => b.myScore)
  const avg = scores.length ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null
  const min = scores.length ? Math.min(...scores) : null
  const max = scores.length ? Math.max(...scores) : null
  const generous = scores.filter(s => s >= 85).length
  const harsh = scores.filter(s => s < 40).length

  // close on backdrop click
  function handleBackdrop(e) { if (e.target === e.currentTarget) onClose() }

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: dark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        overflowY: 'auto',
        display: 'flex', justifyContent: 'center',
        padding: '24px 16px 60px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* header */}
        <div style={{ ...GLASS, background: dark ? 'var(--glass-bg)' : '#ffffff', borderRadius: 20, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: `radial-gradient(circle at 40% 35%, ${color}cc, ${color}44)`,
            border: `2px solid ${color}66`,
            boxShadow: `0 0 24px ${color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: '#fff',
          }}>{rater[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: -0.5 }}>{rater}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{rated.length} beers rated</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border-mid)',
              background: dark ? 'var(--glass-bg)' : 'rgba(0,0,0,0.06)',
              color: 'var(--text-dim)', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        {/* stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[['Avg', avg, null], ['Min', min, '#ff375f'], ['Max', max, '#30d158'], ['≥ 85', generous, '#30d158'], ['< 40', harsh, '#ff375f']].map(([l, v, col]) => (
            <div key={l} style={{ ...GLASS, background: dark ? 'var(--glass-bg)' : '#ffffff', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -1, color: col || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{v ?? '—'}</div>
              <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 4, letterSpacing: 1.5, fontWeight: 700 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* vínbúðin picks */}
        {vinRecs.length > 0 && (
          <div style={{ ...GLASS, background: dark ? 'var(--glass-bg)' : '#ffffff', borderRadius: 20, overflow: 'hidden', padding: 0 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--text-dim)' }}>FROM VÍNBÚÐIN</span>
              <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>— picked for your taste</span>
            </div>
            <div style={{ overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              <div style={{ display: 'flex', gap: 12, padding: '14px 16px', width: 'max-content' }}>
                {vinRecs.map(rec => {
                  const relColor = rec.relevance >= 80 ? '#30d158' : rec.relevance >= 65 ? '#ffd60a' : rec.relevance >= 50 ? '#ff9f0a' : '#8e8e93'
                  return (
                    <a
                      key={rec.id}
                      href={rec.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: 130, flexShrink: 0,
                        borderRadius: 14, overflow: 'hidden',
                        background: dark ? 'var(--input-bg)' : '#f5f5f7',
                        border: '1px solid var(--border)',
                        textDecoration: 'none', color: 'inherit',
                        display: 'flex', flexDirection: 'column',
                        transition: 'transform 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = '' }}
                    >
                      <div style={{ height: 110, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <img
                          src={rec.image_url} alt={rec.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 10 }}
                          onError={e => { e.currentTarget.style.display = 'none' }}
                        />
                      </div>
                      <div style={{ padding: '10px 10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ fontWeight: 700, fontSize: 11, lineHeight: 1.3, color: 'var(--text)' }}>{rec.name}</div>
                        {rec.brewery && <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>{rec.brewery}</div>}
                        {rec.style && (
                          <span style={{
                            fontSize: 8, fontWeight: 700, letterSpacing: 0.5, padding: '2px 6px', marginTop: 3,
                            borderRadius: 20, background: 'var(--input-bg)', color: 'var(--text-dim)',
                            border: '1px solid var(--border)', alignSelf: 'flex-start',
                          }}>{rec.style}</span>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 'auto', paddingTop: 6 }}>
                          <div style={{ flex: 1, height: 2, borderRadius: 1, background: 'var(--border-mid)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${rec.relevance}%`, background: relColor, borderRadius: 1 }} />
                          </div>
                          <span style={{ fontSize: 8, color: relColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{rec.relevance.toFixed(0)}</span>
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* try next + all ratings side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* try next */}
          <div style={{ ...GLASS, background: dark ? 'var(--glass-bg)' : '#ffffff', borderRadius: 20, overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column', maxHeight: 460 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--text-dim)' }}>TRY NEXT</span>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {tryNext.length === 0 ? (
                <div style={{ padding: '20px', fontSize: 12, color: 'var(--text-faint)', textAlign: 'center' }}>No suggestions yet</div>
              ) : tryNext.map((b, i) => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 20px',
                  borderBottom: i < tryNext.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <ScoreBadge score={b.othersAvg} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>{b.brewery}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {RATERS.filter(r => r !== rater).map(r => b.otherScores[r] != null && (
                      <div key={r} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{ fontSize: 8, fontWeight: 700, color: RATER_COLORS[r] }}>{r[0]}</span>
                        <ScoreBadge score={b.otherScores[r]} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* all ratings */}
          <div style={{ ...GLASS, background: dark ? 'var(--glass-bg)' : '#ffffff', borderRadius: 20, overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column', maxHeight: 460 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--text-dim)' }}>ALL RATINGS</span>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {rated.map((b, i) => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 20px',
                  borderBottom: i < rated.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <ScoreBadge score={b.myScore} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>{b.brewery}{b.style ? ` · ${b.style}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {RATERS.filter(r => r !== rater).map(r => b.ratings[r] != null && (
                      <div key={r} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{ fontSize: 8, fontWeight: 700, color: RATER_COLORS[r] }}>{r[0]}</span>
                        <ScoreBadge score={b.ratings[r]} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}

// ── COUNTRIES ─────────────────────────────────────────────────────────────────
function CountriesSection({ beers }) {
  const data = useMemo(() => {
    const m = {}
    beers.forEach(b => {
      if (!b.country) return
      if (!m[b.country]) m[b.country] = { country: b.country, count: 0, scores: [] }
      m[b.country].count++
      if (b.avg != null) m[b.country].scores.push(b.avg)
    })
    return Object.values(m)
      .map(c => ({ ...c, avg: c.scores.length ? +(c.scores.reduce((a, b) => a + b) / c.scores.length).toFixed(1) : null }))
      .filter(c => c.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [beers])
  const max = data[0]?.count || 1

  return (
    <section>
      <SectionHead>By Country</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {data.map(c => (
          <div key={c.country} style={{ ...GLASS, borderRadius: 18, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 28 }}>{FLAG[c.country] || '🍺'}</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{c.country}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{c.count} beers</span>
              {c.avg != null && (
                <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(c.avg), fontVariantNumeric: 'tabular-nums' }}>{c.avg}</span>
              )}
            </div>
            <GlowBar value={c.count} max={max} color="#ff9f0a" />
          </div>
        ))}
      </div>
    </section>
  )
}

// ── BREWERIES ─────────────────────────────────────────────────────────────────
function BreweriesSection({ beers }) {
  const dark = useTheme()
  const isMobile = useIsMobile()
  const data = useMemo(() => {
    const m = {}
    beers.forEach(b => {
      if (!b.brewery) return
      if (!m[b.brewery]) m[b.brewery] = { brewery: b.brewery, country: b.country, count: 0, scores: [] }
      m[b.brewery].count++
      if (b.avg != null) m[b.brewery].scores.push(b.avg)
    })
    return Object.values(m)
      .map(c => ({ ...c, avg: c.scores.length ? +(c.scores.reduce((a, b) => a + b) / c.scores.length).toFixed(1) : null }))
      .filter(b => b.count >= 2)
      .sort((a, b) => (b.avg || 0) - (a.avg || 0) || b.count - a.count)
      .slice(0, 12)
  }, [beers])

  const c = chartColors(dark)
  const chartData = {
    labels: data.map(d => trunc(d.brewery, 18)),
    datasets: [{
      data: data.map(d => d.count),
      backgroundColor: data.map((_, i) => i < 3 ? 'rgba(255,159,10,0.25)' : c.barBg),
      borderColor: data.map((_, i) => i < 3 ? '#ff9f0a' : c.barBord),
      borderWidth: 1, borderRadius: 4,
    }],
  }

  return (
    <section>
      <SectionHead>Breweries</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        <div style={{ ...GLASS, borderRadius: 20, overflow: 'hidden', padding: 0 }}>
          {data.slice(0, 8).map((b, i) => (
            <div
              key={b.brewery}
              style={{
                padding: '13px 18px',
                borderBottom: i < Math.min(7, data.length - 1) ? '1px solid var(--border)' : 'none',
                display: 'flex', alignItems: 'center', gap: 14,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: i < 3 ? 'linear-gradient(135deg, #ff9f0a, #ff6b00)' : 'var(--input-bg)',
                boxShadow: i < 3 ? '0 0 12px rgba(255,159,10,0.5)' : 'none',
                border: i < 3 ? '1px solid rgba(255,159,10,0.4)' : '1px solid var(--border-mid)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
                color: i < 3 ? '#ffffff' : 'var(--text-faint)',
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.brewery}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>{FLAG[b.country] || ''} {b.country} · {b.count} beers</div>
              </div>
              {b.avg != null && (
                <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(b.avg), fontVariantNumeric: 'tabular-nums' }}>{b.avg}</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ ...GLASS_DARK, borderRadius: 20, overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <CardLabel>Beers per Brewery</CardLabel>
          </div>
          <div style={{ padding: '16px', height: Math.max(220, data.length * 38) }}>
            <Bar data={chartData} options={hBarOpts((data[0]?.count || 1) + 1, dark)} />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── STYLES ────────────────────────────────────────────────────────────────────
function StylesSection({ beers }) {
  const dark = useTheme()
  const isMobile = useIsMobile()
  const data = useMemo(() => {
    const m = {}
    beers.forEach(b => {
      if (!b.style) return
      if (!m[b.style]) m[b.style] = { style: b.style, count: 0, scores: [] }
      m[b.style].count++
      if (b.avg != null) m[b.style].scores.push(b.avg)
    })
    return Object.values(m)
      .map(s => ({ ...s, avg: s.scores.length ? +(s.scores.reduce((a, b) => a + b) / s.scores.length).toFixed(1) : null }))
      .filter(s => s.count >= 2)
      .sort((a, b) => b.count - a.count)
  }, [beers])

  const total = data.reduce((s, d) => s + d.count, 0)
  const sorted = [...data].filter(s => s.avg != null).sort((a, b) => (b.avg || 0) - (a.avg || 0))

  const c = chartColors(dark)
  const chartData = {
    labels: sorted.map(s => trunc(s.style, 18)),
    datasets: [{
      data: sorted.map(s => s.avg),
      backgroundColor: sorted.map(s => scoreColorRaw(s.avg, dark) + '33'),
      borderColor: sorted.map(s => scoreColorRaw(s.avg, dark)),
      borderWidth: 1, borderRadius: 4,
    }],
  }

  return (
    <section>
      <SectionHead>Styles</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        <Card>
          <CardLabel>Distribution</CardLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {data.map((s, i) => (
              <div key={s.style} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: PALETTE[i % PALETTE.length], boxShadow: `0 0 6px ${PALETTE[i % PALETTE.length]}`, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.style}</div>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', width: 30, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round(s.count / total * 100)}%</span>
                <GlowBar value={s.count} max={data[0].count} color={PALETTE[i % PALETTE.length]} />
                <span style={{ fontSize: 11, color: 'var(--text-mid)', width: 14, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.count}</span>
              </div>
            ))}
          </div>
        </Card>
        <div style={{ ...GLASS_DARK, borderRadius: 20, overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <CardLabel>Avg Score by Style</CardLabel>
          </div>
          <div style={{ padding: '16px', height: Math.max(220, sorted.length * 38) }}>
            <Bar data={chartData} options={hBarOpts(100, dark)} />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── RATERS ────────────────────────────────────────────────────────────────────
function RatersSection({ beers }) {
  const dark = useTheme()
  const isMobile = useIsMobile()
  const [hoveredRater, setHoveredRater] = useState(null)
  const [selectedRater, setSelectedRater] = useState(null)

  const stats = useMemo(() => RATERS.map(r => {
    const scores = beers.map(b => b.ratings[r]).filter(v => v != null)
    return {
      name: r,
      count: scores.length,
      avg: scores.length ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null,
      min: scores.length ? Math.min(...scores) : null,
      max: scores.length ? Math.max(...scores) : null,
      harsh: scores.filter(s => s < 40).length,
      generous: scores.filter(s => s >= 85).length,
    }
  }), [beers])

  const radarData = useMemo(() => ({
    labels: RADAR_CATEGORIES,
    datasets: RATERS.map(r => {
      const active = !hoveredRater || hoveredRater === r
      return {
        label: r,
        spanGaps: false,
        data: RADAR_CATEGORIES.map(cat => {
          const scores = beers.filter(b => STYLE_TO_RADAR[b.style] === cat && b.ratings[r] != null).map(b => b.ratings[r])
          return scores.length ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : null
        }),
        borderColor: active ? RATER_COLORS[r] : RATER_COLORS[r] + '20',
        backgroundColor: active ? RATER_COLORS[r] + '22' : RATER_COLORS[r] + '05',
        borderWidth: active ? 2.5 : 1,
        pointRadius: active ? 4 : 2,
        pointBackgroundColor: active ? RATER_COLORS[r] : RATER_COLORS[r] + '30',
        pointBorderColor: 'transparent',
      }
    })
  }), [beers, hoveredRater])

  const c = chartColors(dark)
  const radarOpts = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      r: {
        min: 0, max: 100,
        grid: { color: c.grid },
        angleLines: { color: c.grid },
        pointLabels: { color: c.tickMid, font: { size: 11 } },
        ticks: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { ...c.tooltip },
    },
  }

  const agreement = useMemo(() => {
    const pairs = []
    for (let i = 0; i < RATERS.length; i++) for (let j = i + 1; j < RATERS.length; j++) {
      const r1 = RATERS[i], r2 = RATERS[j]
      const shared = beers.filter(b => b.ratings[r1] != null && b.ratings[r2] != null)
      if (shared.length < 3) continue
      const avgDiff = +(shared.map(b => Math.abs(b.ratings[r1] - b.ratings[r2])).reduce((a, b) => a + b) / shared.length).toFixed(1)
      pairs.push({ pair: `${r1} & ${r2}`, avgDiff, shared: shared.length })
    }
    return pairs.sort((a, b) => a.avgDiff - b.avgDiff)
  }, [beers])

  return (
    <section>
      {selectedRater && (
        <RaterProfile rater={selectedRater} beers={beers} onClose={() => setSelectedRater(null)} />
      )}
      <SectionHead>The Raters</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        {stats.map(s => (
          <div key={s.name} onClick={() => setSelectedRater(s.name)} style={{
            ...GLASS,
            borderRadius: 20,
            padding: '20px 18px',
            border: `1px solid ${RATER_COLORS[s.name]}22`,
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${RATER_COLORS[s.name]}22` }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: `radial-gradient(circle at 40% 35%, ${RATER_COLORS[s.name]}cc, ${RATER_COLORS[s.name]}44)`,
              border: `1.5px solid ${RATER_COLORS[s.name]}66`,
              boxShadow: `0 0 16px ${RATER_COLORS[s.name]}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, color: '#fff',
              marginBottom: 12,
            }}>{s.name[0]}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: RATER_COLORS[s.name] }}>{s.name}</div>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: -2.5, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{s.avg}</div>
            <div style={{ fontSize: 9, color: 'var(--text-faint)', marginBottom: 14, letterSpacing: 2 }}>avg score</div>
            {[['Rated', s.count, null], ['Min', s.min, '#ff375f'], ['Max', s.max, '#30d158'], ['≥ 85', s.generous, '#30d158'], ['< 40', s.harsh, '#ff375f']].map(([l, v, col]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 7, paddingTop: 7, borderTop: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-dim)' }}>{l}</span>
                <span style={{ fontWeight: 600, color: col || 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        <div style={{ ...GLASS_DARK, borderRadius: 20, overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <CardLabel>Taste Profile by Style</CardLabel>
          </div>
          <div style={{ padding: '16px', height: 300 }}>
            <Radar data={radarData} options={radarOpts} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '0 16px 16px', flexWrap: 'wrap' }}>
            {RATERS.map(r => {
              const active = !hoveredRater || hoveredRater === r
              return (
                <div
                  key={r}
                  onMouseEnter={() => setHoveredRater(r)}
                  onMouseLeave={() => setHoveredRater(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 20, cursor: 'default',
                    background: active ? RATER_COLORS[r] + '18' : 'var(--input-bg)',
                    border: `1px solid ${active ? RATER_COLORS[r] + '55' : 'var(--border)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? RATER_COLORS[r] : 'var(--text-faint)', boxShadow: active ? `0 0 6px ${RATER_COLORS[r]}` : 'none', transition: 'all 0.15s' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: active ? RATER_COLORS[r] : 'var(--text-faint)', transition: 'color 0.15s' }}>{r}</span>
                </div>
              )
            })}
          </div>
        </div>
        <Card>
          <CardLabel>Agreement — lower = more alike</CardLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 6 }}>
            {agreement.map(a => (
              <div key={a.pair}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a.pair}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(100 - a.avgDiff), fontVariantNumeric: 'tabular-nums' }}>{a.avgDiff} pts</span>
                </div>
                <div style={{ height: 3, background: 'var(--border-mid)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (a.avgDiff / 35) * 100)}%`,
                    background: a.avgDiff < 12 ? '#30d158' : a.avgDiff < 20 ? '#ffd60a' : '#ff375f',
                    boxShadow: `0 0 6px ${a.avgDiff < 12 ? '#30d158' : a.avgDiff < 20 ? '#ffd60a' : '#ff375f'}`,
                    borderRadius: 2,
                  }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 5 }}>{a.shared} beers in common</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  )
}

// ── ABV SCATTER ───────────────────────────────────────────────────────────────
function AbvSection({ beers }) {
  const dark = useTheme()
  const pts = useMemo(() =>
    beers.filter(b => b.abv != null && b.avg != null).map(b => ({ x: b.abv, y: b.avg, name: b.name, brewery: b.brewery })),
    [beers]
  )

  const c = chartColors(dark)
  const scatterData = {
    datasets: [{
      label: 'Beers', data: pts,
      backgroundColor: pts.map(p => scoreColorRaw(p.y, dark) + 'cc'),
      pointRadius: 5, pointHoverRadius: 7,
    }],
  }

  const scatterOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...c.tooltip,
        callbacks: {
          label: ctx => { const p = ctx.raw; return [`${p.name}`, `${p.brewery}`, `ABV: ${p.x}%  ·  Score: ${p.y}`] },
          title: () => '',
        },
      },
    },
    scales: {
      x: { title: { display: true, text: 'ABV %', color: c.tick, font: { size: 10 } }, grid: { color: c.grid }, ticks: { color: c.tick }, border: { color: 'transparent' } },
      y: { title: { display: true, text: 'Score', color: c.tick, font: { size: 10 } }, min: 0, max: 100, grid: { color: c.grid }, ticks: { color: c.tick }, border: { color: 'transparent' } },
    },
  }

  return (
    <section>
      <SectionHead>ABV vs Score</SectionHead>
      <div style={{ ...GLASS_DARK, borderRadius: 20, overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <CardLabel>Does Stronger = Better?</CardLabel>
        </div>
        <div style={{ padding: '20px', height: 320 }}>
          <Scatter data={scatterData} options={scatterOpts} />
        </div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', padding: '0 20px 18px', flexWrap: 'wrap' }}>
          {[['≥ 85', '#30d158'], ['70–85', '#ffd60a'], ['50–70', '#ff9f0a'], ['< 50', '#ff375f']].map(([l, col]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: col, boxShadow: `0 0 6px ${col}` }} />
              <span style={{ color: 'var(--text-dim)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── BEER TABLE ────────────────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'name',    label: 'Beer',  align: 'left'   },
  { key: 'style',   label: 'Style', align: 'center' },
  { key: 'Hlynur',  label: 'H',     align: 'center' },
  { key: 'Robert',  label: 'R',     align: 'center' },
  { key: 'Steinar', label: 'S',     align: 'center' },
  { key: 'Palli',   label: 'P',     align: 'center' },
  { key: 'avg',     label: 'Avg',   align: 'center' },
  { key: 'abv',     label: 'ABV',   align: 'center' },
]

function BeerTable({ beers, onUpdate }) {
  const isMobile = useIsMobile()
  const [search, setSearch]   = useState('')
  const [sortBy, setSortBy]   = useState('avg')
  const [sortDir, setSortDir] = useState('desc')
  const [country, setCountry] = useState('All')
  const [style, setStyle]     = useState('All')
  const [editing, setEditing] = useState(null) // { beerId, rater }
  const [editVal, setEditVal] = useState('')

  function startEdit(beerId, rater, current) {
    setEditing({ beerId, rater })
    setEditVal(current != null ? String(current) : '')
  }

  async function commitEdit() {
    if (!editing) return
    const val = parseFloat(editVal)
    if (!isNaN(val) && val >= 0 && val <= 100) {
      await onUpdate(editing.beerId, editing.rater, Math.round(val))
    }
    setEditing(null)
    setEditVal('')
  }

  function cancelEdit() {
    setEditing(null)
    setEditVal('')
  }

  const countries = useMemo(() => ['All', ...new Set(beers.map(b => b.country).filter(Boolean).sort())], [beers])
  const styles    = useMemo(() => ['All', ...new Set(beers.map(b => b.style).filter(Boolean).sort())], [beers])

  function handleSort(key) {
    if (key === sortBy) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(key)
      setSortDir('desc')
    }
  }

  const filtered = useMemo(() => {
    let list = [...beers]
    if (search) list = list.filter(b =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.brewery || '').toLowerCase().includes(search.toLowerCase())
    )
    if (country !== 'All') list = list.filter(b => b.country === country)
    if (style !== 'All') list = list.filter(b => b.style === style)

    list.sort((a, b) => {
      let av, bv
      if (RATERS.includes(sortBy)) {
        av = a.ratings[sortBy] ?? null
        bv = b.ratings[sortBy] ?? null
      } else if (sortBy === 'name') {
        return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      } else if (sortBy === 'style') {
        const as = a.style || '', bs = b.style || ''
        return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
      } else {
        av = a[sortBy] ?? null
        bv = b[sortBy] ?? null
      }
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return list
  }, [beers, search, sortBy, sortDir, country, style])

  const ctrl = {
    background: 'var(--input-bg)',
    border: '1px solid var(--border-mid)',
    borderRadius: 10, padding: '8px 13px',
    fontSize: 12, color: 'var(--text)',
    outline: 'none', fontFamily: 'inherit',
    caretColor: '#ff9f0a',
  }

  const colTemplate = '1fr 100px 52px 52px 52px 52px 52px 48px'

  return (
    <section>
      <SectionHead>All Beers</SectionHead>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ ...ctrl, flex: 1, minWidth: 160 }} />
        {[
          ['country', country, setCountry, countries.map(c => [c, c])],
          ['style',   style,   setStyle,   styles.map(s => [s, s])],
        ].map(([, val, set, opts]) => (
          <select key={String(opts[0])} value={val} onChange={e => set(e.target.value)} style={{ ...ctrl, cursor: 'pointer' }}>
            {opts.map(([v, l]) => <option key={v} value={v} style={{ background: 'var(--select-bg)' }}>{l}</option>)}
          </select>
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>{filtered.length}</span>
      </div>

      {isMobile ? (
        /* ── MOBILE: card list ── */
        <>
          {/* sort controls */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {[['avg', 'Avg'], ['name', 'Name'], ['abv', 'ABV'], ...RATERS.map(r => [r, r])].map(([key, label]) => {
              const active = sortBy === key
              return (
                <button key={key} onClick={() => handleSort(key)} style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                  cursor: 'pointer', letterSpacing: 0.3, border: 'none',
                  background: active ? 'var(--text-mid)' : 'var(--input-bg)',
                  color: active ? 'var(--bg)' : 'var(--text-dim)',
                  border: active ? 'none' : '1px solid var(--border-mid)',
                }}>
                  {label}{active ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ''}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(b => (
            <div key={b.id} style={{ ...GLASS, borderRadius: 16, padding: '14px 16px' }}>
              {/* name + meta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{FLAG[b.country] || ''} {b.brewery}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                    {b.style && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, padding: '2px 8px', borderRadius: 20, background: 'var(--input-bg)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
                        {b.style}
                      </span>
                    )}
                    {b.abv != null && (
                      <span style={{ fontSize: 9, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums', padding: '2px 0' }}>
                        {b.abv}%
                      </span>
                    )}
                  </div>
                </div>
                <ScoreBadge score={b.avg} size="md" />
              </div>

              {/* ratings row */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                {RATERS.map(r => {
                  const isEditing = editing?.beerId === b.id && editing?.rater === r
                  return (
                    <div key={r} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: RATER_COLORS[r], letterSpacing: 0.5 }}>{r.slice(0, 3).toUpperCase()}</span>
                      {isEditing ? (
                        <input
                          autoFocus
                          type="number" min="0" max="100"
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit() }}
                          style={{
                            width: 38, height: 38, borderRadius: '50%',
                            border: '1.5px solid #ff9f0a',
                            background: 'var(--input-bg)',
                            color: 'var(--text)', fontFamily: 'inherit',
                            fontSize: 12, fontWeight: 800, textAlign: 'center',
                            outline: 'none', padding: 0,
                            MozAppearance: 'textfield',
                          }}
                        />
                      ) : (
                        <div
                          onClick={() => startEdit(b.id, r, b.ratings[r] ?? null)}
                          style={{ cursor: 'pointer', borderRadius: '50%', transition: 'opacity 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          <ScoreBadge score={b.ratings[r] ?? null} size="sm" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          </div>
        </>
      ) : (
        /* ── DESKTOP: grid table ── */
        <div style={{ ...GLASS, borderRadius: 20, overflow: 'hidden', padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: colTemplate, padding: '11px 18px', borderBottom: '1px solid var(--border)' }}>
            {COLUMNS.map(col => {
              const active = sortBy === col.key
              return (
                <div
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    textAlign: col.align,
                    fontSize: 9, fontWeight: 700, letterSpacing: 2,
                    color: active ? 'var(--text-mid)' : 'var(--text-faint)',
                    cursor: 'pointer', userSelect: 'none',
                    display: 'flex', alignItems: 'center',
                    justifyContent: col.align === 'center' ? 'center' : 'flex-start',
                    gap: 4, transition: 'color 0.15s',
                  }}
                >
                  {col.label}
                  {active && <span style={{ fontSize: 8, opacity: 0.7 }}>{sortDir === 'desc' ? '▼' : '▲'}</span>}
                </div>
              )
            })}
          </div>
          {filtered.map((b, i) => (
            <div
              key={b.id}
              style={{
                display: 'grid', gridTemplateColumns: colTemplate,
                padding: '11px 18px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                alignItems: 'center', transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{FLAG[b.country] || ''} {b.brewery}</div>
              </div>
              <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-dim)' }}>{b.style || '—'}</div>
              {RATERS.map(r => {
                const isEditing = editing?.beerId === b.id && editing?.rater === r
                return (
                  <div key={r} style={{ display: 'flex', justifyContent: 'center' }}>
                    {isEditing ? (
                      <input
                        autoFocus
                        type="number" min="0" max="100"
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit() }}
                        style={{
                          width: 34, height: 34, borderRadius: '50%',
                          border: '1.5px solid #ff9f0a',
                          background: 'var(--input-bg)',
                          color: 'var(--text)', fontFamily: 'inherit',
                          fontSize: 11, fontWeight: 800, textAlign: 'center',
                          outline: 'none', padding: 0,
                          MozAppearance: 'textfield',
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => startEdit(b.id, r, b.ratings[r] ?? null)}
                        title={`Edit ${r}'s rating`}
                        style={{ cursor: 'pointer', borderRadius: '50%', transition: 'opacity 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >
                        <ScoreBadge score={b.ratings[r] ?? null} size="sm" />
                      </div>
                    )}
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <ScoreBadge score={b.avg} size="sm" />
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
                {b.abv != null ? `${b.abv}%` : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ── RECOMMENDATIONS ───────────────────────────────────────────────────────────
function RecommendationsSection({ recommendations, syncedAt, total, onSync, syncing }) {
  const dark = useTheme()
  function relevanceColor(r) {
    if (r >= 80) return '#30d158'
    if (r >= 65) return '#ffd60a'
    if (r >= 50) return '#ff9f0a'
    return '#8e8e93'
  }

  const syncLabel = syncedAt
    ? `Synced ${new Date(syncedAt).toLocaleDateString('is-IS', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : 'Never synced'

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <SectionHead>Recommendations</SectionHead>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {syncedAt && (
            <span style={{ fontSize: 10, color: 'var(--text-faint)', letterSpacing: 1 }}>{syncLabel}</span>
          )}
          <button
            onClick={onSync}
            disabled={syncing}
            style={{
              background: syncing ? 'var(--input-bg)' : 'linear-gradient(135deg, #0a84ff, #005ec4)',
              border: '1px solid rgba(10,132,255,0.35)',
              borderRadius: 20, padding: '7px 16px',
              fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
              color: syncing ? 'var(--text-faint)' : '#ffffff',
              cursor: syncing ? 'default' : 'pointer',
              boxShadow: syncing ? 'none' : '0 0 16px rgba(10,132,255,0.25)',
              transition: 'all 0.2s',
            }}
          >
            {syncing ? 'Syncing…' : '↻ Sync Vínbúðin'}
          </button>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: '0 0 18px', lineHeight: 1.6 }}>
        Beers available at Vínbúðin that we haven't tried yet, ranked by how well their style matches our ratings. Click any card to open it on Vínbúðin.
      </p>

      {recommendations.length === 0 && !syncing && (
        <Card>
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-faint)', fontSize: 13 }}>
            {total === 0
              ? 'No Vínbúðin data yet — click "Sync Vínbúðin" to fetch beers.'
              : 'All Vínbúðin beers have been tried!'}
          </div>
        </Card>
      )}

      {recommendations.length > 0 && (
        <>
          {/* horizontal scroll row — top 50 */}
          <div style={{ overflowX: 'auto', margin: '0 -8px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            <div style={{
              display: 'flex', gap: 14,
              padding: '8px 8px 16px',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
            }}>
            {recommendations.slice(0, 50).map(rec => (
              <a
                key={rec.id}
                href={rec.product_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...GLASS, borderRadius: 16, overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  flexShrink: 0, width: 180,
                  scrollSnapAlign: 'start',
                  textDecoration: 'none', color: 'inherit',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = dark ? '0 10px 36px rgba(0,0,0,0.55)' : '0 8px 28px rgba(0,0,0,0.14)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
              >
                {/* image */}
                <div style={{ height: 150, background: '#ffffff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={rec.image_url}
                    alt={rec.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 14 }}
                    onError={e => { e.currentTarget.replaceWith(Object.assign(document.createElement('div'), { textContent: '🍺', style: 'font-size:36px;display:flex;align-items:center;justify-content:center;width:100%;height:100%' })) }}
                  />
                </div>

                {/* info */}
                <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.35, color: 'var(--text)' }}>{rec.name}</div>
                  {rec.brewery && <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>{rec.brewery}</div>}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                    {rec.style && (
                      <span style={{
                        fontSize: 8, fontWeight: 700, letterSpacing: 0.8, padding: '2px 7px',
                        borderRadius: 20, background: 'var(--input-bg)', color: 'var(--text-dim)',
                        border: '1px solid var(--border)',
                      }}>
                        {rec.style}
                      </span>
                    )}
                    {rec.abv != null && (
                      <span style={{ fontSize: 9, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
                        {rec.abv}%
                      </span>
                    )}
                  </div>

                  {/* relevance bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                    <div style={{ flex: 1, height: 2, borderRadius: 1, background: 'var(--border-mid)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${rec.relevance}%`,
                        background: relevanceColor(rec.relevance),
                        borderRadius: 1,
                        boxShadow: `0 0 4px ${relevanceColor(rec.relevance)}`,
                      }} />
                    </div>
                    <span style={{ fontSize: 8, color: relevanceColor(rec.relevance), fontWeight: 700, minWidth: 20, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {rec.relevance.toFixed(0)}
                    </span>
                  </div>
                </div>
              </a>
            ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile()
  const [dark, setDark]       = useState(false)
  const [allBeers, setAllBeers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [recs, setRecs] = useState({ recommendations: [], syncedAt: null, total: 0 })
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    document.documentElement.toggleAttribute('data-dark', dark)
    ChartJS.defaults.color = dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)'
  }, [dark])

  useEffect(() => {
    fetch('/api/beers')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(data => { setAllBeers(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
    fetch('/api/recommendations')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setRecs(data) })
      .catch(() => {})
  }, [])

  async function syncVinbudin() {
    setSyncing(true)
    try {
      const res = await fetch('/api/vinbudin/sync', { method: 'POST' })
      if (!res.ok) throw new Error('Sync failed')
      const fresh = await fetch('/api/recommendations')
      if (fresh.ok) setRecs(await fresh.json())
    } finally {
      setSyncing(false)
    }
  }

  async function addBeer(beer) {
    const res = await fetch('/api/beers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(beer),
    })
    if (!res.ok) return
    const { id } = await res.json()
    setAllBeers(prev => [...prev, { ...beer, id }])
  }

  async function updateBeer(id, rater, rating) {
    const res = await fetch(`/api/beers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rater, rating }),
    })
    if (!res.ok) return
    const { ratings, avg, ratingCount } = await res.json()
    setAllBeers(prev => prev.map(b => b.id === id ? { ...b, ratings, avg, ratingCount } : b))
  }

  const totalRatings = useMemo(() => allBeers.reduce((s, b) => s + b.ratingCount, 0), [allBeers])
  const scored       = useMemo(() => allBeers.filter(b => b.avg != null), [allBeers])
  const avgScore     = useMemo(() => scored.length ? +(scored.reduce((s, b) => s + b.avg, 0) / scored.length).toFixed(1) : 0, [scored])
  const topBeer      = useMemo(() => [...scored].sort((a, b) => b.avg - a.avg)[0], [scored])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-dim)', fontSize: 14, letterSpacing: 2 }}>
      loading…
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#ff375f', fontSize: 14 }}>
      failed to load: {error}
    </div>
  )

  return (
    <ThemeCtx.Provider value={dark}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: isMobile ? '0 16px 80px' : '0 28px 100px', position: 'relative' }}>

        {/* ── DARK MODE TOGGLE ── */}
        <button
          onClick={() => setDark(d => !d)}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            position: 'fixed', top: 16, right: isMobile ? 16 : 28, zIndex: 100,
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--glass-bg)',
            border: '1px solid var(--border-mid)',
            boxShadow: 'var(--glass-shadow)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {dark ? '☀️' : '🌙'}
        </button>

        {/* ── HERO ── */}
        <div style={{ paddingTop: isMobile ? 48 : 72, paddingBottom: isMobile ? 36 : 56 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,159,10,0.10)',
            border: '1px solid rgba(255,159,10,0.22)',
            borderRadius: 20, padding: '5px 14px',
            marginBottom: 28,
            boxShadow: '0 0 20px rgba(255,159,10,0.08)',
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff9f0a', boxShadow: '0 0 6px #ff9f0a' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,159,10,0.9)', letterSpacing: 1 }}>Café Tyrol</span>
          </div>
          <h1 style={{
            fontSize: 'clamp(48px, 8vw, 96px)',
            fontWeight: 900, letterSpacing: -3, lineHeight: 0.92,
            background: 'var(--hero-grad)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 0,
          }}>
            ultimate<br />beer wiki
          </h1>
        </div>

        {/* ── STATS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: isMobile ? 48 : 72 }}>
          {[
            ['Beers', allBeers.length, null],
            ['Ratings', totalRatings, null],
            ['Avg Score', avgScore, null],
            ['Top Beer', topBeer?.avg?.toFixed(1), topBeer?.name],
          ].map(([label, value, sub]) => (
            <div key={label} style={{ ...GLASS, borderRadius: 18, padding: isMobile ? '16px 16px' : '20px 22px' }}>
              <div style={{ fontSize: isMobile ? 32 : 40, fontWeight: 900, letterSpacing: -2, color: 'var(--text)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-faint)', marginTop: 7, letterSpacing: 2.5 }}>{label}</div>
              {sub && <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>{trunc(sub, 20)}</div>}
            </div>
          ))}
        </div>

        <Divider />

        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 48 : 64 }}>
          <AddBeerForm beers={allBeers} onAdd={addBeer} onUpdate={updateBeer} />
          <RatersSection beers={allBeers} />
          <RecommendationsSection
            recommendations={recs.recommendations}
            syncedAt={recs.syncedAt}
            total={recs.total}
            onSync={syncVinbudin}
            syncing={syncing}
          />
          <CountriesSection beers={allBeers} />
          <BreweriesSection beers={allBeers} />
          <StylesSection beers={allBeers} />
          <AbvSection beers={allBeers} />
          <BeerTable beers={allBeers} onUpdate={updateBeer} />
        </div>
      </div>
    </ThemeCtx.Provider>
  )
}
