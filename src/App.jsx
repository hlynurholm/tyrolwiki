import { useState, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend
} from 'chart.js'
import { Bar, Radar, Scatter } from 'react-chartjs-2'
import beersData from './data/beers.json'

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend
)

// ── constants ────────────────────────────────────────────────────────────────
const RATERS = ['Hlynur', 'Robert', 'Steinar', 'Palli']
const RATER_COLORS = {
  Hlynur:  '#d4a820',
  Robert:  '#4a82d4',
  Steinar: '#9a52d4',
  Palli:   '#3a9a52',
}
const FLAG = {
  Iceland: '🇮🇸', Belgium: '🇧🇪', Denmark: '🇩🇰', USA: '🇺🇸',
  Germany: '🇩🇪', UK: '🇬🇧', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Mexico: '🇲🇽',
  Italy: '🇮🇹', 'Czech Republic': '🇨🇿', Sweden: '🇸🇪', Japan: '🇯🇵',
}

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

ChartJS.defaults.font = { family: 'Inter, system-ui, sans-serif', size: 11 }
ChartJS.defaults.color = '#c4954a'

// ── helpers ───────────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s == null) return '#9a7040'
  if (s >= 85) return '#3db868'
  if (s >= 70) return '#d4a820'
  if (s >= 50) return '#d47820'
  return '#c83838'
}

function scoreColorDark(s) {
  if (s == null) return '#6a5030'
  if (s >= 85) return '#1a5a30'
  if (s >= 70) return '#8b6010'
  if (s >= 50) return '#8b4010'
  return '#7a1818'
}

function trunc(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : str
}

// ── chart theme ───────────────────────────────────────────────────────────────
const gridColor = 'rgba(212,168,32,0.1)'
const tooltipStyle = {
  backgroundColor: '#1e0e06',
  borderColor: '#8b6010',
  borderWidth: 2,
  titleColor: '#f0d870',
  bodyColor: '#c4954a',
  padding: 12,
  cornerRadius: 4,
  boxShadow: '0 4px 12px rgba(0,0,0,0.8)',
}

const hBarOpts = (maxVal) => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { ...tooltipStyle } },
  scales: {
    x: {
      grid: { color: gridColor },
      ticks: { color: '#8b6010', font: { size: 10 } },
      max: maxVal,
      border: { color: 'rgba(212,168,32,0.2)' },
    },
    y: {
      grid: { display: false },
      ticks: { color: '#c4954a', font: { size: 11 }, maxRotation: 0 },
      border: { color: 'transparent' },
    },
  },
})

// ── design tokens ─────────────────────────────────────────────────────────────
const PARCHMENT = 'linear-gradient(160deg, #f5e8cc 0%, #ecdcac 45%, #f2e2bc 75%, #e8d4a0 100%)'
const BRASS_GRAD = 'linear-gradient(180deg, #f0d870 0%, #d4a820 28%, #a07810 52%, #cca018 76%, #f0d060 100%)'
const WOOD_DARK = 'linear-gradient(180deg, #2a1408 0%, #1e0e06 50%, #2a1408 100%)'
const WOOD_MID  = 'linear-gradient(180deg, #3d1e0c 0%, #2a1408 50%, #381c0a 100%)'
const PARCHMENT_SHADOW = '0 1px 0 rgba(255,255,255,0.85) inset, 0 -1px 0 rgba(0,0,0,0.15) inset, 0 8px 32px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.5)'
const INSET_SHADOW = '0 2px 8px rgba(0,0,0,0.6) inset, 0 1px 0 rgba(255,200,60,0.06)'

// ── tiny components ───────────────────────────────────────────────────────────
function ScoreBadge({ score, size = 'md' }) {
  if (score == null) {
    return <span style={{ color: '#8b6030', fontSize: 12, fontStyle: 'italic' }}>—</span>
  }
  const col = scoreColor(score)
  const dim = size === 'lg' ? 54 : size === 'sm' ? 36 : 44
  const fs  = size === 'lg' ? 17 : size === 'sm' ? 12 : 14
  return (
    <div style={{
      width: dim, height: dim, borderRadius: '50%', flexShrink: 0,
      background: `radial-gradient(circle at 38% 32%, ${col}ff 0%, ${col}cc 35%, ${col}88 70%, ${col}44 100%)`,
      border: `2.5px solid ${col}`,
      boxShadow: `0 0 0 1px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.4)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontWeight: 900, fontSize: fs, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)', fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>
        {score.toFixed(0)}
      </span>
    </div>
  )
}

function BrassPlaque({ children, style }) {
  return (
    <div style={{
      display: 'inline-block',
      background: BRASS_GRAD,
      padding: '7px 18px',
      borderRadius: 3,
      boxShadow: '0 1px 0 rgba(255,255,255,0.55) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 4px 10px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4)',
      color: '#1e0e06',
      fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 3.5,
      textShadow: '0 1px 0 rgba(255,255,255,0.45), 0 -1px 0 rgba(0,0,0,0.2)',
      ...style,
    }}>
      {children}
    </div>
  )
}

function SectionHead({ children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <BrassPlaque>{children}</BrassPlaque>
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: PARCHMENT,
      border: '1px solid #c4954a',
      borderRadius: 8,
      padding: '24px',
      boxShadow: PARCHMENT_SHADOW,
      position: 'relative',
      ...style,
    }}>
      {children}
    </div>
  )
}

function CardLabel({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 800, color: '#6a4018',
      textTransform: 'uppercase', letterSpacing: 3,
      marginBottom: 16, fontFamily: 'inherit',
      textShadow: '0 1px 0 rgba(255,255,255,0.5)',
      borderBottom: '1px solid rgba(160,100,20,0.25)',
      paddingBottom: 8,
    }}>
      {children}
    </div>
  )
}

function BeerGauge({ value, max }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{
      width: 64, height: 12, flexShrink: 0,
      background: WOOD_DARK,
      borderRadius: 2,
      border: '1px solid #5a3010',
      boxShadow: INSET_SHADOW,
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: 'linear-gradient(90deg, #8b5810 0%, #d4a820 55%, #f0d060 100%)',
        boxShadow: '0 0 6px rgba(212,168,32,0.7), 0 1px 0 rgba(255,240,100,0.4) inset',
        borderRadius: 2,
        transition: 'width 0.3s ease',
      }} />
    </div>
  )
}

function WoodDivider() {
  return (
    <div style={{
      height: 8, margin: '0 0 56px',
      background: 'linear-gradient(90deg, transparent 0%, rgba(212,168,32,0.05) 10%, rgba(212,168,32,0.18) 30%, rgba(212,168,32,0.25) 50%, rgba(212,168,32,0.18) 70%, rgba(212,168,32,0.05) 90%, transparent 100%)',
      borderTop: '1px solid rgba(0,0,0,0.6)',
      borderBottom: '1px solid rgba(212,168,32,0.15)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
    }} />
  )
}

// ── ADD BEER FORM ─────────────────────────────────────────────────────────────
function AddBeerForm({ beers, onAdd }) {
  const [open, setOpen] = useState(false)
  const blank = { name: '', style: '', brewery: '', country: '', abv: '', Hlynur: '', Robert: '', Steinar: '', Palli: '' }
  const [form, setForm] = useState(blank)

  const styleOpts   = useMemo(() => [...new Set(beers.map(b => b.style).filter(Boolean).sort())], [beers])
  const breweryOpts = useMemo(() => [...new Set(beers.map(b => b.brewery).filter(Boolean).sort())], [beers])
  const countryOpts = useMemo(() => [...new Set(beers.map(b => b.country).filter(Boolean).sort())], [beers])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    const ratings = {}
    RATERS.forEach(r => { if (form[r] !== '') ratings[r] = parseFloat(form[r]) })
    const scores = Object.values(ratings)
    const avg = scores.length ? +(scores.reduce((a, b) => a + b) / scores.length).toFixed(1) : null
    onAdd({
      id: Math.max(...beers.map(b => b.id), 0) + 1,
      name: form.name.trim(),
      style: form.style.trim() || null,
      brewery: form.brewery.trim() || null,
      country: form.country.trim() || null,
      abv: form.abv ? parseFloat(form.abv) : null,
      ratings, avg, ratingCount: scores.length,
    })
    setForm(blank)
    setOpen(false)
  }

  const inp = {
    background: 'rgba(0,0,0,0.35)',
    border: 'none',
    borderBottom: '1px solid rgba(212,168,32,0.35)',
    borderRadius: 0,
    padding: '8px 0',
    fontSize: 13,
    color: '#f4e4c0',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    textShadow: '0 0 10px rgba(212,168,32,0.15)',
    caretColor: '#d4a820',
  }
  const lbl = {
    fontSize: 9, color: '#c4954a', textTransform: 'uppercase',
    letterSpacing: 2.5, display: 'block', marginBottom: 6, fontWeight: 700,
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: open ? 20 : 0 }}>
        <SectionHead>Log a Beer</SectionHead>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: open ? WOOD_DARK : BRASS_GRAD,
            border: `1px solid ${open ? '#5a3010' : '#8b6010'}`,
            borderRadius: 4,
            padding: '8px 18px',
            fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
            color: open ? '#c4954a' : '#1e0e06',
            textTransform: 'uppercase',
            boxShadow: open
              ? INSET_SHADOW
              : '0 1px 0 rgba(255,255,255,0.5) inset, 0 3px 8px rgba(0,0,0,0.5)',
            textShadow: open ? 'none' : '0 1px 0 rgba(255,255,255,0.4)',
            cursor: 'pointer',
            transition: 'all 0.15s',
            marginBottom: 24,
          }}
        >
          {open ? 'Cancel' : '+ Add Beer'}
        </button>
      </div>
      {open && (
        <div style={{
          background: WOOD_MID,
          border: '2px solid #5a3010',
          borderRadius: 8,
          padding: '28px',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.8)',
        }}>
          {/* Brass title strip */}
          <div style={{ background: BRASS_GRAD, margin: '-28px -28px 24px', padding: '10px 28px', borderRadius: '6px 6px 0 0', borderBottom: '2px solid #8b6010' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#1e0e06', textTransform: 'uppercase', letterSpacing: 3, textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}>New Entry</span>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.6fr', gap: '0 28px', marginBottom: 28 }}>
              {[
                { key: 'name', label: 'Beer Name *', list: 'dl-names', ph: 'e.g. Chimay Blue', req: true },
                { key: 'style', label: 'Style', list: 'dl-styles', ph: 'IPA, Lager…' },
                { key: 'brewery', label: 'Brewery', list: 'dl-breweries', ph: '' },
                { key: 'country', label: 'Country', list: 'dl-countries', ph: '' },
              ].map(({ key, label, list, ph, req }) => (
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <input list={list} style={inp} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={ph} required={req} />
                </div>
              ))}
              <div>
                <label style={lbl}>ABV %</label>
                <input style={inp} type="number" step="0.1" min="0" max="20" value={form.abv} onChange={e => set('abv', e.target.value)} placeholder="5.0" />
              </div>
            </div>
            <datalist id="dl-names">{beers.map(b => <option key={b.id} value={b.name} />)}</datalist>
            <datalist id="dl-styles">{styleOpts.map(s => <option key={s} value={s} />)}</datalist>
            <datalist id="dl-breweries">{breweryOpts.map(b => <option key={b} value={b} />)}</datalist>
            <datalist id="dl-countries">{countryOpts.map(c => <option key={c} value={c} />)}</datalist>
            {/* Divider */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,168,32,0.3), transparent)', margin: '4px 0 24px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '0 28px', alignItems: 'end' }}>
              {RATERS.map(r => (
                <div key={r}>
                  <label style={{ ...lbl, color: RATER_COLORS[r] }}>{r}</label>
                  <input style={{ ...inp, borderBottomColor: RATER_COLORS[r] + '66' }} type="number" min="0" max="100" step="1" value={form[r]} onChange={e => set(r, e.target.value)} placeholder="0–100" />
                </div>
              ))}
              <button type="submit" style={{
                background: BRASS_GRAD,
                border: '1px solid #8b6010',
                borderRadius: 4,
                padding: '10px 24px',
                fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
                color: '#1e0e06', textTransform: 'uppercase',
                boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset, 0 3px 8px rgba(0,0,0,0.5)',
                textShadow: '0 1px 0 rgba(255,255,255,0.4)',
                cursor: 'pointer', whiteSpace: 'nowrap', alignSelf: 'end',
              }}>
                Submit
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
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
  }, [beers])
  const max = data[0]?.count || 1

  return (
    <section>
      <SectionHead>By Country</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 14 }}>
        {data.map(c => (
          <div key={c.country} style={{
            background: PARCHMENT,
            border: '1px solid #c4954a',
            borderRadius: 10,
            padding: '18px 16px',
            boxShadow: PARCHMENT_SHADOW,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ fontSize: 28 }}>{FLAG[c.country] || '🍺'}</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e0e06', textShadow: '0 1px 0 rgba(255,255,255,0.5)' }}>{c.country}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#8b6030' }}>{c.count} beers</span>
              {c.avg != null && (
                <span style={{ fontSize: 12, fontWeight: 700, color: scoreColorDark(c.avg), fontVariantNumeric: 'tabular-nums' }}>{c.avg}</span>
              )}
            </div>
            <BeerGauge value={c.count} max={max} />
          </div>
        ))}
      </div>
    </section>
  )
}

// ── BREWERIES ─────────────────────────────────────────────────────────────────
function BreweriesSection({ beers }) {
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
      .sort((a, b) => b.count - a.count || (b.avg || 0) - (a.avg || 0))
      .slice(0, 12)
  }, [beers])

  const chartData = {
    labels: data.map(d => trunc(d.brewery, 18)),
    datasets: [{
      data: data.map(d => d.count),
      backgroundColor: data.map((_, i) => i < 3 ? 'rgba(212,168,32,0.35)' : 'rgba(160,100,20,0.2)'),
      borderColor: data.map((_, i) => i < 3 ? '#d4a820' : '#8b5010'),
      borderWidth: 1, borderRadius: 2,
    }],
  }

  return (
    <section>
      <SectionHead>Breweries</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Ranked list — chalkboard style */}
        <div style={{
          background: 'linear-gradient(160deg, #1a1008, #0e0804, #161008)',
          border: '3px solid #3a2010',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.5)',
        }}>
          {/* Chalk board header */}
          <div style={{ background: BRASS_GRAD, padding: '10px 18px', borderBottom: '2px solid #8b6010' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#1e0e06', textTransform: 'uppercase', letterSpacing: 3, textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}>Top Breweries</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {data.slice(0, 8).map((b, i) => (
              <div key={b.brewery} style={{
                padding: '11px 18px',
                borderBottom: i < Math.min(7, data.length - 1) ? '1px solid rgba(212,168,32,0.08)' : 'none',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                {/* Rank badge */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: i < 3 ? BRASS_GRAD : 'linear-gradient(180deg, #3a2010, #2a1408)',
                  border: `1px solid ${i < 3 ? '#8b6010' : '#3a2010'}`,
                  boxShadow: i < 3 ? '0 0 8px rgba(212,168,32,0.4), 0 2px 4px rgba(0,0,0,0.6)' : '0 2px 4px rgba(0,0,0,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900,
                  color: i < 3 ? '#1e0e06' : '#8b6030',
                  textShadow: i < 3 ? '0 1px 0 rgba(255,255,255,0.4)' : 'none',
                }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#f4e4c0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{b.brewery}</div>
                  <div style={{ fontSize: 11, color: '#8b6030', marginTop: 1 }}>{FLAG[b.country] || ''} {b.country} · {b.count} beers</div>
                </div>
                {b.avg != null && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(b.avg), fontVariantNumeric: 'tabular-nums', textShadow: `0 0 8px ${scoreColor(b.avg)}66` }}>{b.avg}</span>
                )}
              </div>
            ))}
          </div>
        </div>
        {/* Chart in dark frame */}
        <div style={{
          background: '#100804',
          border: '3px solid #3a2010',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        }}>
          <div style={{ background: BRASS_GRAD, padding: '10px 18px', borderBottom: '2px solid #8b6010' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#1e0e06', textTransform: 'uppercase', letterSpacing: 3, textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}>Beers per Brewery</span>
          </div>
          <div style={{ padding: '16px', height: Math.max(220, data.length * 38) }}>
            <Bar data={chartData} options={hBarOpts((data[0]?.count || 1) + 1)} />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── STYLES ────────────────────────────────────────────────────────────────────
function StylesSection({ beers }) {
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

  const chartData = {
    labels: sorted.map(s => trunc(s.style, 18)),
    datasets: [{
      data: sorted.map(s => s.avg),
      backgroundColor: sorted.map(s => scoreColor(s.avg) + '44'),
      borderColor: sorted.map(s => scoreColor(s.avg)),
      borderWidth: 1, borderRadius: 2,
    }],
  }

  return (
    <section>
      <SectionHead>Styles</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <CardLabel>Distribution</CardLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.map(s => (
              <div key={s.style} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, fontSize: 13, color: '#1e0e06', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}>{s.style}</div>
                <span style={{ fontSize: 11, color: '#8b6030', width: 30, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round(s.count / total * 100)}%</span>
                <BeerGauge value={s.count} max={data[0].count} />
                <span style={{ fontSize: 11, color: '#5a3818', width: 14, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{s.count}</span>
              </div>
            ))}
          </div>
        </Card>
        <div style={{
          background: '#100804', border: '3px solid #3a2010',
          borderRadius: 8, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        }}>
          <div style={{ background: BRASS_GRAD, padding: '10px 18px', borderBottom: '2px solid #8b6010' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#1e0e06', textTransform: 'uppercase', letterSpacing: 3, textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}>Avg Score by Style</span>
          </div>
          <div style={{ padding: '16px', height: Math.max(220, sorted.length * 38) }}>
            <Bar data={chartData} options={hBarOpts(100)} />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── RATERS ────────────────────────────────────────────────────────────────────
function RatersSection({ beers }) {
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
    datasets: RATERS.map(r => ({
      label: r,
      spanGaps: false,
      data: RADAR_CATEGORIES.map(cat => {
        const scores = beers.filter(b => STYLE_TO_RADAR[b.style] === cat && b.ratings[r] != null).map(b => b.ratings[r])
        return scores.length ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : null
      }),
      borderColor: RATER_COLORS[r],
      backgroundColor: RATER_COLORS[r] + '18',
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: RATER_COLORS[r],
    }))
  }), [beers])

  const radarOpts = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      r: {
        min: 0, max: 100,
        grid: { color: 'rgba(212,168,32,0.1)' },
        angleLines: { color: 'rgba(212,168,32,0.15)' },
        pointLabels: { color: '#c4954a', font: { size: 11 } },
        ticks: { display: false },
      },
    },
    plugins: {
      legend: { position: 'bottom', labels: { color: '#c4954a', boxWidth: 10, padding: 16, font: { size: 10 } } },
      tooltip: { ...tooltipStyle },
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
      <SectionHead>The Raters</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        {stats.map(s => (
          <div key={s.name} style={{
            background: PARCHMENT,
            border: `1px solid #c4954a`,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: PARCHMENT_SHADOW,
          }}>
            {/* Colored header band */}
            <div style={{
              background: `linear-gradient(90deg, ${RATER_COLORS[s.name]}33, ${RATER_COLORS[s.name]}11)`,
              borderBottom: `2px solid ${RATER_COLORS[s.name]}66`,
              padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: `radial-gradient(circle at 40% 35%, ${RATER_COLORS[s.name]}ff, ${RATER_COLORS[s.name]}88)`,
                border: `2px solid ${RATER_COLORS[s.name]}`,
                boxShadow: `0 0 0 1px rgba(0,0,0,0.2), 0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 900, color: '#fff',
                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
              }}>{s.name[0]}</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#1e0e06', textShadow: '0 1px 0 rgba(255,255,255,0.5)' }}>{s.name}</div>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 44, fontWeight: 900, color: '#1e0e06', letterSpacing: -2.5, lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: '0 1px 0 rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.1)' }}>{s.avg}</div>
              <div style={{ fontSize: 9, color: '#8b6030', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 2 }}>avg score</div>
              {[['Rated', s.count, null], ['Min', s.min, '#7a1818'], ['Max', s.max, '#1a5a30'], ['≥ 85', s.generous, '#1a5a30'], ['< 40', s.harsh, '#7a1818']].map(([l, v, c]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(160,100,20,0.2)' }}>
                  <span style={{ color: '#8b6030' }}>{l}</span>
                  <span style={{ fontWeight: 700, color: c || '#2a1208', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#100804', border: '3px solid #3a2010', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.8)' }}>
          <div style={{ background: BRASS_GRAD, padding: '10px 18px', borderBottom: '2px solid #8b6010' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#1e0e06', textTransform: 'uppercase', letterSpacing: 3, textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}>Taste Profile by Style</span>
          </div>
          <div style={{ padding: '16px', height: 320 }}>
            <Radar data={radarData} options={radarOpts} />
          </div>
        </div>
        <Card>
          <CardLabel>Taste Agreement — lower = more alike</CardLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 6 }}>
            {agreement.map(a => (
              <div key={a.pair}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1e0e06' }}>{a.pair}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: scoreColorDark(100 - a.avgDiff), fontVariantNumeric: 'tabular-nums' }}>{a.avgDiff} pts</span>
                </div>
                <div style={{ height: 10, background: 'linear-gradient(180deg, #2a1408, #1e0e06)', borderRadius: 3, border: '1px solid #5a3010', boxShadow: INSET_SHADOW, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (a.avgDiff / 35) * 100)}%`,
                    background: a.avgDiff < 12
                      ? 'linear-gradient(90deg, #1a5a30, #3ab868)'
                      : a.avgDiff < 20
                        ? 'linear-gradient(90deg, #8b6010, #d4a820)'
                        : 'linear-gradient(90deg, #7a1818, #c83838)',
                    boxShadow: '0 0 6px currentColor',
                    borderRadius: 3,
                  }} />
                </div>
                <div style={{ fontSize: 10, color: '#9a7040', marginTop: 4 }}>{a.shared} beers in common</div>
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
  const pts = useMemo(() =>
    beers.filter(b => b.abv != null && b.avg != null).map(b => ({ x: b.abv, y: b.avg, name: b.name, brewery: b.brewery })),
    [beers]
  )

  const scatterData = {
    datasets: [{
      label: 'Beers',
      data: pts,
      backgroundColor: pts.map(p => scoreColor(p.y) + 'cc'),
      pointRadius: 6, pointHoverRadius: 8,
    }],
  }

  const scatterOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          label: ctx => { const p = ctx.raw; return [`${p.name}`, `${p.brewery}`, `ABV: ${p.x}%  ·  Score: ${p.y}`] },
          title: () => '',
        },
      },
    },
    scales: {
      x: { title: { display: true, text: 'ABV %', color: '#8b6010', font: { size: 10 } }, grid: { color: gridColor }, ticks: { color: '#8b6010' }, border: { color: 'rgba(212,168,32,0.2)' } },
      y: { title: { display: true, text: 'Score', color: '#8b6010', font: { size: 10 } }, min: 0, max: 100, grid: { color: gridColor }, ticks: { color: '#8b6010' }, border: { color: 'rgba(212,168,32,0.2)' } },
    },
  }

  return (
    <section>
      <SectionHead>ABV vs Score</SectionHead>
      <div style={{ background: '#100804', border: '3px solid #3a2010', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.8)' }}>
        <div style={{ background: BRASS_GRAD, padding: '10px 18px', borderBottom: '2px solid #8b6010' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#1e0e06', textTransform: 'uppercase', letterSpacing: 3, textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}>Does Stronger = Better?</span>
        </div>
        <div style={{ padding: '16px', height: 320 }}>
          <Scatter data={scatterData} options={scatterOpts} />
        </div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', padding: '0 16px 16px', flexWrap: 'wrap' }}>
          {[['≥ 85', '#3db868'], ['70–85', '#d4a820'], ['50–70', '#d47820'], ['< 50', '#c83838']].map(([l, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 4px ${c}` }} />
              <span style={{ color: '#c4954a' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── BEER TABLE ────────────────────────────────────────────────────────────────
function BeerTable({ beers }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('avg')
  const [country, setCountry] = useState('All')
  const [style, setStyle] = useState('All')

  const countries = useMemo(() => ['All', ...new Set(beers.map(b => b.country).filter(Boolean).sort())], [beers])
  const styles    = useMemo(() => ['All', ...new Set(beers.map(b => b.style).filter(Boolean).sort())], [beers])

  const filtered = useMemo(() => {
    let list = [...beers]
    if (search) list = list.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || (b.brewery || '').toLowerCase().includes(search.toLowerCase()))
    if (country !== 'All') list = list.filter(b => b.country === country)
    if (style !== 'All') list = list.filter(b => b.style === style)
    return list.sort((a, b) => {
      if (sortBy === 'avg') return (b.avg || 0) - (a.avg || 0)
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'abv') return (b.abv || 0) - (a.abv || 0)
      return b.ratingCount - a.ratingCount
    })
  }, [beers, search, sortBy, country, style])

  const ctrl = {
    background: 'linear-gradient(180deg, #2a1408, #1e0e06)',
    border: '1px solid #5a3010',
    borderRadius: 4,
    padding: '8px 12px',
    fontSize: 12, color: '#c4954a',
    outline: 'none', fontFamily: 'inherit',
    boxShadow: INSET_SHADOW,
  }

  return (
    <section>
      <SectionHead>All Beers</SectionHead>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search beers…" style={{ ...ctrl, flex: 1, minWidth: 160, caretColor: '#d4a820' }} />
        {[
          ['sort', sortBy, setSortBy, [['avg','Top Rated'],['name','A–Z'],['abv','ABV'],['ratingCount','Most Rated']]],
          ['country', country, setCountry, countries.map(c => [c, c])],
          ['style', style, setStyle, styles.map(s => [s, s])],
        ].map(([, val, set, opts]) => (
          <select key={String(opts[0])} value={val} onChange={e => set(e.target.value)} style={{ ...ctrl, cursor: 'pointer' }}>
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <span style={{ fontSize: 11, color: '#8b6030', fontVariantNumeric: 'tabular-nums' }}>{filtered.length} beers</span>
      </div>

      <div style={{ border: '3px solid #3a2010', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.8)' }}>
        {/* Header — brass strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 100px 56px 56px 56px 56px 56px 48px',
          padding: '11px 18px', background: BRASS_GRAD,
          borderBottom: '2px solid #8b6010',
          fontSize: 9, fontWeight: 800, color: '#1e0e06',
          textTransform: 'uppercase', letterSpacing: 2,
          textShadow: '0 1px 0 rgba(255,255,255,0.4)',
        }}>
          <span>Beer</span><span style={{ textAlign: 'center' }}>Style</span>
          <span style={{ textAlign: 'center' }}>H</span>
          <span style={{ textAlign: 'center' }}>R</span>
          <span style={{ textAlign: 'center' }}>S</span>
          <span style={{ textAlign: 'center' }}>P</span>
          <span style={{ textAlign: 'center' }}>Avg</span>
          <span style={{ textAlign: 'center' }}>ABV</span>
        </div>
        {filtered.map((b, i) => (
          <div
            key={b.id}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 56px 56px 56px 56px 56px 48px',
              padding: '12px 18px',
              background: i % 2 === 0
                ? 'linear-gradient(180deg, #201008, #1a0e06)'
                : 'linear-gradient(180deg, #1a0e06, #160c04)',
              borderBottom: i < filtered.length - 1 ? '1px solid rgba(212,168,32,0.06)' : 'none',
              alignItems: 'center',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(180deg, #3a1e0c, #2a1408)'}
            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0
              ? 'linear-gradient(180deg, #201008, #1a0e06)'
              : 'linear-gradient(180deg, #1a0e06, #160c04)'}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#f4e4c0', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{b.name}</div>
              <div style={{ fontSize: 11, color: '#8b6030', marginTop: 2 }}>{FLAG[b.country] || ''} {b.brewery}</div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#9a7040' }}>{b.style || '—'}</div>
            {RATERS.map(r => (
              <div key={r} style={{ display: 'flex', justifyContent: 'center' }}>
                <ScoreBadge score={b.ratings[r] ?? null} size="sm" />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ScoreBadge score={b.avg} size="sm" />
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#9a7040', fontVariantNumeric: 'tabular-nums' }}>{b.abv != null ? `${b.abv}%` : '—'}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [customBeers, setCustomBeers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tyrolCustomBeers') || '[]') }
    catch { return [] }
  })

  const allBeers = useMemo(() => [...beersData, ...customBeers], [customBeers])

  function addBeer(beer) {
    const next = [...customBeers, beer]
    setCustomBeers(next)
    localStorage.setItem('tyrolCustomBeers', JSON.stringify(next))
  }

  const totalRatings = useMemo(() => allBeers.reduce((s, b) => s + b.ratingCount, 0), [allBeers])
  const scored       = useMemo(() => allBeers.filter(b => b.avg != null), [allBeers])
  const avgScore     = useMemo(() => scored.length ? +(scored.reduce((s, b) => s + b.avg, 0) / scored.length).toFixed(1) : 0, [scored])
  const topBeer      = useMemo(() => [...scored].sort((a, b) => b.avg - a.avg)[0], [scored])

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 100px' }}>

      {/* ── PUB SIGN HEADER ── */}
      <div style={{ paddingTop: 64, paddingBottom: 52 }}>
        {/* Brass name plate */}
        <div style={{
          display: 'inline-block',
          background: BRASS_GRAD,
          padding: '8px 24px',
          borderRadius: 3,
          marginBottom: 28,
          boxShadow: '0 1px 0 rgba(255,255,255,0.55) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 6px 16px rgba(0,0,0,0.7)',
          border: '1px solid rgba(0,0,0,0.3)',
        }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: '#1e0e06', textTransform: 'uppercase', letterSpacing: 5, textShadow: '0 1px 0 rgba(255,255,255,0.5)' }}>
            Café Tyrol
          </span>
        </div>
        {/* Carved title */}
        <h1 style={{
          fontFamily: 'var(--serif, Georgia, serif)',
          fontSize: 'clamp(52px, 9vw, 104px)',
          fontWeight: 900, letterSpacing: -3, lineHeight: 0.9,
          color: '#f0d870',
          textShadow: '0 2px 0 #8b5810, 0 4px 0 #5a3008, 0 6px 12px rgba(0,0,0,0.8), 0 0 40px rgba(212,168,32,0.2)',
          marginBottom: 24,
        }}>
          Beer<br />Wiki
        </h1>
        <p style={{ fontSize: 14, color: '#9a7040', maxWidth: 300, lineHeight: 1.75, fontStyle: 'italic', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
          {allBeers.length} beers rated by four friends. Every opinion on record.
        </p>
      </div>

      {/* ── BRASS STAT PLAQUES ── */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 64 }}>
        {[
          ['Beers', allBeers.length, null],
          ['Ratings', totalRatings, null],
          ['Avg Score', avgScore, null],
          ['Top Beer', topBeer?.avg?.toFixed(1), topBeer?.name],
        ].map(([label, value, sub]) => (
          <div key={label} style={{
            flex: 1, minWidth: 130,
            background: PARCHMENT,
            border: '1px solid #c4954a',
            borderRadius: 8,
            padding: '22px 24px',
            boxShadow: PARCHMENT_SHADOW,
          }}>
            <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: -2, color: '#1e0e06', lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: '0 1px 0 rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.15)' }}>{value}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#8b6030', marginTop: 6, textTransform: 'uppercase', letterSpacing: 2.5, textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: '#6a4020', marginTop: 4, fontStyle: 'italic' }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Wood divider ── */}
      <WoodDivider />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
        <AddBeerForm beers={allBeers} onAdd={addBeer} />
        <CountriesSection beers={allBeers} />
        <BreweriesSection beers={allBeers} />
        <StylesSection beers={allBeers} />
        <RatersSection beers={allBeers} />
        <AbvSection beers={allBeers} />
        <BeerTable beers={allBeers} />
      </div>
    </div>
  )
}
