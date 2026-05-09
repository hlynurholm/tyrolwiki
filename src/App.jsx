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

ChartJS.defaults.font = { family: 'Inter, system-ui, sans-serif', size: 11 }
ChartJS.defaults.color = 'rgba(255,255,255,0.35)'

// ── helpers ───────────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s == null) return 'rgba(255,255,255,0.2)'
  if (s >= 85) return '#30d158'
  if (s >= 70) return '#ffd60a'
  if (s >= 50) return '#ff9f0a'
  return '#ff375f'
}

function trunc(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : str
}

// ── chart theme ───────────────────────────────────────────────────────────────
const gridColor = 'rgba(255,255,255,0.05)'
const tooltipStyle = {
  backgroundColor: 'rgba(12,12,20,0.92)',
  borderColor: 'rgba(255,255,255,0.12)',
  borderWidth: 1,
  titleColor: '#ffffff',
  bodyColor: 'rgba(255,255,255,0.55)',
  padding: 12,
  cornerRadius: 10,
}

const hBarOpts = (maxVal) => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { ...tooltipStyle } },
  scales: {
    x: {
      grid: { color: gridColor },
      ticks: { color: 'rgba(255,255,255,0.25)', font: { size: 10 } },
      max: maxVal,
      border: { color: 'transparent' },
    },
    y: {
      grid: { display: false },
      ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 }, maxRotation: 0 },
      border: { color: 'transparent' },
    },
  },
})

// ── design tokens ─────────────────────────────────────────────────────────────
const GLASS = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(40px) saturate(180%)',
  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 24px 48px rgba(0,0,0,0.4)',
}
const GLASS_DARK = {
  background: 'rgba(0,0,0,0.3)',
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 48px rgba(0,0,0,0.5)',
}

// ── tiny components ───────────────────────────────────────────────────────────
function ScoreBadge({ score, size = 'md' }) {
  if (score == null) return <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>—</span>
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
      <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }} />
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3, color: 'rgba(255,255,255,0.35)' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.07), transparent)' }} />
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
    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 16 }}>
      {children}
    </div>
  )
}

function GlowBar({ value, max, color }) {
  const pct = Math.min(100, (value / max) * 100)
  const c = color || '#ff9f0a'
  return (
    <div style={{ width: 64, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', flexShrink: 0, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 2, boxShadow: `0 0 6px ${c}` }} />
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent)', margin: '0 0 60px' }} />
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
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '9px 13px',
    fontSize: 13, color: 'rgba(255,255,255,0.9)',
    fontFamily: 'inherit', outline: 'none', width: '100%',
    caretColor: '#ff9f0a',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    transition: 'border-color 0.15s',
  }
  const lbl = { fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 6, fontWeight: 600 }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: open ? 20 : 0 }}>
        <SectionHead>Log a Beer</SectionHead>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: open ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #ff9f0a, #ff6b00)',
            border: open ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,159,10,0.4)',
            borderRadius: 20, padding: '8px 18px',
            fontSize: 13, fontWeight: 600,
            color: open ? 'rgba(255,255,255,0.5)' : '#ffffff',
            boxShadow: open ? 'none' : '0 0 20px rgba(255,159,10,0.3), 0 4px 12px rgba(0,0,0,0.3)',
            marginBottom: 22, cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {open ? 'Cancel' : '+ Add Beer'}
        </button>
      </div>
      {open && (
        <div style={{ ...GLASS, borderRadius: 20, padding: '24px', marginTop: -4 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.6fr', gap: 12, marginBottom: 16 }}>
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
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0 16px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 12, alignItems: 'end' }}>
              {RATERS.map(r => (
                <div key={r}>
                  <label style={{ ...lbl, color: RATER_COLORS[r] + 'bb' }}>{r}</label>
                  <input
                    style={{ ...inp, borderColor: RATER_COLORS[r] + '33', boxShadow: `0 0 0 0 ${RATER_COLORS[r]}` }}
                    type="number" min="0" max="100" step="1"
                    value={form[r]} onChange={e => set(r, e.target.value)} placeholder="0–100"
                  />
                </div>
              ))}
              <button type="submit" style={{
                background: 'linear-gradient(135deg, #ff9f0a, #ff6b00)',
                border: 'none', borderRadius: 10, padding: '10px 24px',
                fontSize: 13, fontWeight: 700, color: '#ffffff',
                boxShadow: '0 0 20px rgba(255,159,10,0.4), 0 4px 12px rgba(0,0,0,0.3)',
                cursor: 'pointer', whiteSpace: 'nowrap', alignSelf: 'end',
              }}>
                Add
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {data.map(c => (
          <div key={c.country} style={{ ...GLASS, borderRadius: 18, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 28 }}>{FLAG[c.country] || '🍺'}</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{c.country}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{c.count} beers</span>
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
      backgroundColor: data.map((_, i) => i < 3 ? 'rgba(255,159,10,0.25)' : 'rgba(255,255,255,0.06)'),
      borderColor: data.map((_, i) => i < 3 ? '#ff9f0a' : 'rgba(255,255,255,0.15)'),
      borderWidth: 1, borderRadius: 4,
    }],
  }

  return (
    <section>
      <SectionHead>Breweries</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ ...GLASS, borderRadius: 20, overflow: 'hidden', padding: 0 }}>
          {data.slice(0, 8).map((b, i) => (
            <div
              key={b.brewery}
              style={{
                padding: '13px 18px',
                borderBottom: i < Math.min(7, data.length - 1) ? '1px solid rgba(255,255,255,0.05)' : 'none',
                display: 'flex', alignItems: 'center', gap: 14,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: i < 3 ? 'linear-gradient(135deg, #ff9f0a, #ff6b00)' : 'rgba(255,255,255,0.07)',
                boxShadow: i < 3 ? '0 0 12px rgba(255,159,10,0.5)' : 'none',
                border: i < 3 ? '1px solid rgba(255,159,10,0.4)' : '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
                color: i < 3 ? '#ffffff' : 'rgba(255,255,255,0.3)',
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.brewery}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{FLAG[b.country] || ''} {b.country} · {b.count} beers</div>
              </div>
              {b.avg != null && (
                <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(b.avg), fontVariantNumeric: 'tabular-nums' }}>{b.avg}</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ ...GLASS_DARK, borderRadius: 20, overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <CardLabel>Beers per Brewery</CardLabel>
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
      backgroundColor: sorted.map(s => scoreColor(s.avg) + '33'),
      borderColor: sorted.map(s => scoreColor(s.avg)),
      borderWidth: 1, borderRadius: 4,
    }],
  }

  return (
    <section>
      <SectionHead>Styles</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <CardLabel>Distribution</CardLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {data.map((s, i) => (
              <div key={s.style} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: PALETTE[i % PALETTE.length], boxShadow: `0 0 6px ${PALETTE[i % PALETTE.length]}`, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.style}</div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', width: 30, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round(s.count / total * 100)}%</span>
                <GlowBar value={s.count} max={data[0].count} color={PALETTE[i % PALETTE.length]} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', width: 14, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.count}</span>
              </div>
            ))}
          </div>
        </Card>
        <div style={{ ...GLASS_DARK, borderRadius: 20, overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <CardLabel>Avg Score by Style</CardLabel>
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
      backgroundColor: RATER_COLORS[r] + '14',
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: RATER_COLORS[r],
      pointBorderColor: 'transparent',
    }))
  }), [beers])

  const radarOpts = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      r: {
        min: 0, max: 100,
        grid: { color: 'rgba(255,255,255,0.05)' },
        angleLines: { color: 'rgba(255,255,255,0.07)' },
        pointLabels: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
        ticks: { display: false },
      },
    },
    plugins: {
      legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.45)', boxWidth: 8, padding: 16, font: { size: 10 }, usePointStyle: true, pointStyle: 'circle' } },
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        {stats.map(s => (
          <div key={s.name} style={{
            ...GLASS,
            borderRadius: 20,
            padding: '20px 18px',
            border: `1px solid ${RATER_COLORS[s.name]}22`,
            boxShadow: `0 1px 0 rgba(255,255,255,0.08) inset, 0 24px 48px rgba(0,0,0,0.4), 0 0 40px ${RATER_COLORS[s.name]}0a`,
          }}>
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
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: -2.5, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: '#ffffff' }}>{s.avg}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 2 }}>avg score</div>
            {[['Rated', s.count, null], ['Min', s.min, '#ff375f'], ['Max', s.max, '#30d158'], ['≥ 85', s.generous, '#30d158'], ['< 40', s.harsh, '#ff375f']].map(([l, v, c]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 7, paddingTop: 7, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: 'rgba(255,255,255,0.35)' }}>{l}</span>
                <span style={{ fontWeight: 600, color: c || 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ ...GLASS_DARK, borderRadius: 20, overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <CardLabel>Taste Profile by Style</CardLabel>
          </div>
          <div style={{ padding: '16px', height: 320 }}>
            <Radar data={radarData} options={radarOpts} />
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
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (a.avgDiff / 35) * 100)}%`,
                    background: a.avgDiff < 12 ? '#30d158' : a.avgDiff < 20 ? '#ffd60a' : '#ff375f',
                    boxShadow: `0 0 6px ${a.avgDiff < 12 ? '#30d158' : a.avgDiff < 20 ? '#ffd60a' : '#ff375f'}`,
                    borderRadius: 2,
                  }} />
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 5 }}>{a.shared} beers in common</div>
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
      label: 'Beers', data: pts,
      backgroundColor: pts.map(p => scoreColor(p.y) + 'cc'),
      pointRadius: 5, pointHoverRadius: 7,
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
      x: { title: { display: true, text: 'ABV %', color: 'rgba(255,255,255,0.25)', font: { size: 10 } }, grid: { color: gridColor }, ticks: { color: 'rgba(255,255,255,0.25)' }, border: { color: 'transparent' } },
      y: { title: { display: true, text: 'Score', color: 'rgba(255,255,255,0.25)', font: { size: 10 } }, min: 0, max: 100, grid: { color: gridColor }, ticks: { color: 'rgba(255,255,255,0.25)' }, border: { color: 'transparent' } },
    },
  }

  return (
    <section>
      <SectionHead>ABV vs Score</SectionHead>
      <div style={{ ...GLASS_DARK, borderRadius: 20, overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <CardLabel>Does Stronger = Better?</CardLabel>
        </div>
        <div style={{ padding: '20px', height: 320 }}>
          <Scatter data={scatterData} options={scatterOpts} />
        </div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', padding: '0 20px 18px', flexWrap: 'wrap' }}>
          {[['≥ 85', '#30d158'], ['70–85', '#ffd60a'], ['50–70', '#ff9f0a'], ['< 50', '#ff375f']].map(([l, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}` }} />
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>{l}</span>
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
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '8px 13px',
    fontSize: 12, color: 'rgba(255,255,255,0.8)',
    outline: 'none', fontFamily: 'inherit',
    caretColor: '#ff9f0a',
  }

  return (
    <section>
      <SectionHead>All Beers</SectionHead>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ ...ctrl, flex: 1, minWidth: 160 }} />
        {[
          ['sort', sortBy, setSortBy, [['avg','Top Rated'],['name','A–Z'],['abv','ABV'],['ratingCount','Most Rated']]],
          ['country', country, setCountry, countries.map(c => [c, c])],
          ['style', style, setStyle, styles.map(s => [s, s])],
        ].map(([, val, set, opts]) => (
          <select key={String(opts[0])} value={val} onChange={e => set(e.target.value)} style={{ ...ctrl, cursor: 'pointer' }}>
            {opts.map(([v, l]) => <option key={v} value={v} style={{ background: '#0e0e18' }}>{l}</option>)}
          </select>
        ))}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontVariantNumeric: 'tabular-nums' }}>{filtered.length}</span>
      </div>

      <div style={{ ...GLASS, borderRadius: 20, overflow: 'hidden', padding: 0 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 100px 52px 52px 52px 52px 52px 48px',
          padding: '11px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)',
          textTransform: 'uppercase', letterSpacing: 2,
        }}>
          <span>Beer</span><span style={{ textAlign: 'center' }}>Style</span>
          <span style={{ textAlign: 'center' }}>H</span><span style={{ textAlign: 'center' }}>R</span>
          <span style={{ textAlign: 'center' }}>S</span><span style={{ textAlign: 'center' }}>P</span>
          <span style={{ textAlign: 'center' }}>Avg</span><span style={{ textAlign: 'center' }}>ABV</span>
        </div>
        {filtered.map((b, i) => (
          <div
            key={b.id}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 52px 52px 52px 52px 52px 48px',
              padding: '11px 18px',
              borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              alignItems: 'center', transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{FLAG[b.country] || ''} {b.brewery}</div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{b.style || '—'}</div>
            {RATERS.map(r => (
              <div key={r} style={{ display: 'flex', justifyContent: 'center' }}>
                <ScoreBadge score={b.ratings[r] ?? null} size="sm" />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ScoreBadge score={b.avg} size="sm" />
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>{b.abv != null ? `${b.abv}%` : '—'}</div>
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

      {/* ── HERO ── */}
      <div style={{ paddingTop: 72, paddingBottom: 56 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,159,10,0.12)',
          border: '1px solid rgba(255,159,10,0.25)',
          borderRadius: 20, padding: '5px 14px',
          marginBottom: 28,
          boxShadow: '0 0 20px rgba(255,159,10,0.1)',
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff9f0a', boxShadow: '0 0 6px #ff9f0a' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,159,10,0.9)', letterSpacing: 1 }}>Café Tyrol</span>
        </div>
        <h1 style={{
          fontSize: 'clamp(56px, 9vw, 108px)',
          fontWeight: 900, letterSpacing: -4, lineHeight: 0.9,
          background: 'linear-gradient(160deg, #ffffff 0%, rgba(255,255,255,0.9) 40%, rgba(255,159,10,0.8) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 22,
        }}>
          Beer<br />Wiki
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', maxWidth: 300, lineHeight: 1.7 }}>
          {allBeers.length} beers. Four friends. Every opinion on record.
        </p>
      </div>

      {/* ── STATS ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 72 }}>
        {[
          ['Beers', allBeers.length, null],
          ['Ratings', totalRatings, null],
          ['Avg Score', avgScore, null],
          ['Top Beer', topBeer?.avg?.toFixed(1), topBeer?.name],
        ].map(([label, value, sub]) => (
          <div key={label} style={{ flex: 1, minWidth: 120, ...GLASS, borderRadius: 18, padding: '20px 22px' }}>
            <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -2, color: '#ffffff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginTop: 7, textTransform: 'uppercase', letterSpacing: 2.5 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{sub}</div>}
          </div>
        ))}
      </div>

      <Divider />

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
